import { db } from "../db";
import { stockData, predictions, rankings } from "@db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { subDays, subMonths, subYears, startOfDay } from "date-fns";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const RATE_LIMIT_DELAY = 12000; // 12 seconds between requests
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
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`
    );
    
    if (!response.ok) {
      console.error('Polygon API response not ok:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data || !data.results || !data.results[0] || typeof data.results[0].c !== 'number') {
      console.error('Invalid Polygon API response format:', data);
      return null;
    }

    return data.results[0].c; // Close price
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return null;
  }
}

export async function updateStockPrices() {
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
          accuracy,
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
        avgAccuracy: sql<number>`avg(${predictions.accuracy})`,
        count: sql<number>`count(${predictions.id})`,
      })
      .from(predictions)
      .where(
        and(
          gte(predictions.createdAt, timeFrame.startDate),
          sql`${predictions.accuracy} is not null`
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
            averageAccuracy: stat.avgAccuracy ?? 0,
            totalPredictions: Number(stat.count),
            updatedAt: new Date(),
          },
        });
    }
  }
}
