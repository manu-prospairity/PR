import { eq, and, lte, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { predictions, rankings, stockData } from "@db/schema";
import { startOfDay, subDays, subMonths, subYears } from "date-fns";

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
    
    if (!data || !data.results || !Array.isArray(data.results) || data.results.length === 0) {
      console.error('Invalid Polygon API response format:', data);
      return null;
    }

    return data.results[0].c;
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return null;
  }
}

export async function getHistoricalPrices(symbol: string): Promise<Array<{
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> | null> {
  try {
    // Implement rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    // Calculate date range for 2 weeks of data
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&apiKey=${POLYGON_API_KEY}`
    );
    
    if (!response.ok) {
      console.error('Polygon API response not ok:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (!data || !data.results || !Array.isArray(data.results)) {
      console.error('Invalid Polygon API response format:', data);
      return null;
    }

    // Polygon.io returns timestamps in milliseconds, ensure we preserve this format
    return data.results.map(result => ({
      ...result,
      timestamp: result.t, // Polygon uses 't' for timestamp in ms
    }));
  } catch (error) {
    console.error('Error fetching historical prices:', error);
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
        price: price.toString(),
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
        sql`${predictions.actualPrice} is null`,
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
        ((Number(latestPrice.price) - Number(prediction.predictedPrice)) / Number(latestPrice.price)) * 100
      );

      await db
        .update(predictions)
        .set({
          actualPrice: latestPrice.price.toString(),
          accuracy: accuracy.toString(),
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
  ] as const;

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
          timeFrame: timeFrame.name,
          averageAccuracy: stat.avgAccuracy?.toString() ?? '0',
          totalPredictions: Number(stat.count),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [rankings.userId, rankings.timeFrame],
          set: {
            averageAccuracy: stat.avgAccuracy?.toString() ?? '0',
            totalPredictions: Number(stat.count),
            updatedAt: new Date(),
          },
        });
    }
  }
}
