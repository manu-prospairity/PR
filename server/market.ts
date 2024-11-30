import { db } from "../db";
import { stockData, predictions, rankings } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { subDays, subMonths, subYears, startOfDay } from "date-fns";

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';

const RATE_LIMIT_DELAY = 12000; // 12 seconds between requests (5 requests per minute)
let lastRequestTime = 0;

export async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    // Implement rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );
    
    if (!response.ok) {
      console.error('API response not ok:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data || !data['Global Quote'] || !data['Global Quote']['05. price']) {
      console.error('Invalid API response format:', data);
      return null;
    }

    const price = parseFloat(data['Global Quote']['05. price']);
    if (isNaN(price)) {
      console.error('Invalid price value:', data['Global Quote']['05. price']);
      return null;
    }

    return price;
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return null;
  }
}

export async function updateStockPrices() {
  // Get unique symbols from predictions
  const activePredictions = await db.select({ symbol: predictions.symbol })
    .from(predictions)
    .where(eq(predictions.actualPrice, null));

  const uniqueSymbols = [...new Set(activePredictions.map(p => p.symbol))];

  for (const symbol of uniqueSymbols) {
    const price = await fetchStockPrice(symbol);
    if (price) {
      await db.insert(stockData).values({
        symbol,
        price,
        timestamp: new Date(),
      });
    }
  }
}

export async function calculateAccuracy() {
  const now = new Date();
  const pendingPredictions = await db
    .select()
    .from(predictions)
    .where(
      and(
        eq(predictions.actualPrice, null),
        lte(predictions.targetTime, now)
      )
    );

  for (const prediction of pendingPredictions) {
    const [latestPrice] = await db
      .select()
      .from(stockData)
      .where(eq(stockData.symbol, prediction.symbol))
      .orderBy(stockData.timestamp);

    if (latestPrice) {
      const accuracy = 100 - Math.abs(
        ((latestPrice.price - prediction.predictedPrice) / latestPrice.price) * 100
      );

      await db
        .update(predictions)
        .set({
          actualPrice: latestPrice.price,
          accuracy: accuracy,
        })
        .where(eq(predictions.id, prediction.id));
    }
  }

  await updateRankings();
}

async function updateRankings() {
  const timeFrames = [
    { name: 'daily', startDate: startOfDay(new Date()) },
    { name: 'weekly', startDate: subDays(new Date(), 7) },
    { name: 'monthly', startDate: subMonths(new Date(), 1) },
    { name: 'yearly', startDate: subYears(new Date(), 1) },
  ];

  for (const timeFrame of timeFrames) {
    const userStats = await db
      .select({
        userId: predictions.userId,
        avgAccuracy: db.fn.avg<number>(predictions.accuracy),
        count: db.fn.count(predictions.id),
      })
      .from(predictions)
      .where(
        and(
          gte(predictions.createdAt, timeFrame.startDate),
          predictions.accuracy.isNotNull()
        )
      )
      .groupBy(predictions.userId);

    for (const stat of userStats) {
      await db
        .insert(rankings)
        .values({
          userId: stat.userId,
          timeFrame: timeFrame.name as any,
          averageAccuracy: stat.avgAccuracy ?? 0,
          totalPredictions: Number(stat.count),
        })
        .onConflictDoUpdate({
          target: [rankings.userId, rankings.timeFrame],
          set: {
            averageAccuracy: stat.avgAccuracy,
            totalPredictions: stat.count,
            updatedAt: new Date(),
          },
        });
    }
  }
}
