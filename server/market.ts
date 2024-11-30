import { eq, and, lte, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { predictions, rankings, stockData } from "@db/schema";
import { startOfDay, subDays, subMonths, subYears } from "date-fns";
import { setHours, setMinutes, isBefore, isAfter, isWeekend } from "date-fns";
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";
import { db } from "../db";
import { predictions, stockData, rankings } from "@db/schema";
import { sql } from "drizzle-orm";
import { and, eq, gte, lte } from "drizzle-orm";

const EST_TIMEZONE = 'America/New_York';

function isMarketHour(date: Date): boolean {
  const estDate = utcToZonedTime(date, EST_TIMEZONE);
  
  // Check if it's a weekend
  if (isWeekend(estDate)) {
    return false;
  }

  const hours = estDate.getHours();
  const minutes = estDate.getMinutes();
  const seconds = estDate.getSeconds();

  // Check for US market holidays (simplified check)
  const holidays = [
    '2024-01-01', // New Year's Day
    '2024-01-15', // Martin Luther King Jr. Day
    '2024-02-19', // Presidents Day
    '2024-03-29', // Good Friday
    '2024-05-27', // Memorial Day
    '2024-06-19', // Juneteenth
    '2024-07-04', // Independence Day
    '2024-09-02', // Labor Day
    '2024-11-28', // Thanksgiving Day
    '2024-12-25', // Christmas Day
  ];

  const dateStr = estDate.toISOString().split('T')[0];
  if (holidays.includes(dateStr)) {
    console.log(`Skipping calculations - Market holiday: ${dateStr}`);
    return false;
  }

  // Check for exact market hours (including seconds)
  const isMarketOpen = hours === 9 && minutes === 30 && seconds === 0;
  const isMarketClose = hours === 16 && minutes === 0 && seconds === 0;

  // Log market hour status
  if (isMarketOpen || isMarketClose) {
    console.log(`Market hour detected: ${isMarketOpen ? 'Opening (9:30 AM EST)' : 'Closing (4:00 PM EST)'}`);
  }

  return isMarketOpen || isMarketClose;
}

async function runMarketCalculations() {
  const now = new Date();
  const estDate = utcToZonedTime(now, EST_TIMEZONE);
  
  // Format time for logging
  const timeStr = estDate.toLocaleString('en-US', { 
    timeZone: EST_TIMEZONE,
    hour12: true,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  if (!isMarketHour(now)) {
    // Only log every 30 minutes to avoid cluttering logs
    if (estDate.getMinutes() % 30 === 0 && estDate.getSeconds() === 0) {
      console.log(`Market calculations skipped at ${timeStr} - Not market hours`);
    }
    return;
  }

  const isMarketOpen = estDate.getHours() === 9 && estDate.getMinutes() === 30;
  const isMarketClose = estDate.getHours() === 16 && estDate.getMinutes() === 0;

  console.log(`Running market calculations at ${timeStr} - ${isMarketOpen ? 'Market Open' : 'Market Close'}`);
  
  try {
    // Validate Polygon API key before proceeding
    if (!process.env.POLYGON_API_KEY) {
      throw new Error('Polygon API key is not configured');
    }

    // Update stock prices at both market open and close
    console.log('Updating stock prices...');
    await updateStockPrices();

    // Calculate accuracy and update rankings at market close only
    if (isMarketClose) {
      console.log('Market closing - calculating prediction accuracy...');
      await calculateAccuracy();
      
      console.log('Updating rankings...');
      await updateRankings();
    }

    // Log success with timestamp
    console.log(`Market calculations completed successfully at ${
      estDate.toLocaleString('en-US', { 
        timeZone: EST_TIMEZONE,
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
      })
    } (${isMarketOpen ? 'Market Open' : 'Market Close'})`);
  } catch (error) {
    console.error('Error in market calculations:', {
      timestamp: estDate.toISOString(),
      marketTime: isMarketOpen ? 'open' : 'close',
      errorType: error instanceof Error ? error.name : 'Unknown error',
      errorMessage: error instanceof Error ? error.message : 'No message available',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Attempt recovery for specific error cases
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      console.log('Rate limit exceeded, will retry on next scheduled run');
    }
  }
}

// Run calculations every minute to ensure we hit market hours efficiently
const CALCULATION_INTERVAL = 60 * 1000; // 1 minute
console.log('Starting market calculations scheduler');

interface MarketTime {
  hour: number;
  minute: number;
  label: string;
}

const MARKET_TIMES: MarketTime[] = [
  { hour: 9, minute: 30, label: 'Market Open' },
  { hour: 16, minute: 0, label: 'Market Close' }
];

// Keep track of the last run time and market session
let lastRunTime: Date | null = null;
let currentMarketSession: string | null = null;

async function scheduleMarketCalculations() {
  try {
    const now = new Date();
    const estDate = utcToZonedTime(now, EST_TIMEZONE);
    
    // Format current time for logging
    const timeStr = estDate.toLocaleString('en-US', {
      timeZone: EST_TIMEZONE,
      hour12: true,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Identify current market session
    const currentTime = estDate.getHours() * 60 + estDate.getMinutes();
    const marketOpen = 9 * 60 + 30;  // 9:30 AM
    const marketClose = 16 * 60;     // 4:00 PM
    
    let marketSession = null;
    if (currentTime === marketOpen) marketSession = 'MARKET_OPEN';
    if (currentTime === marketClose) marketSession = 'MARKET_CLOSE';

    // Only run if we're at a market time and haven't run for this session
    if (marketSession && marketSession !== currentMarketSession) {
      console.log(`Market calculator triggered - ${timeStr} (${marketSession})`);
      await runMarketCalculations();
      lastRunTime = now;
      currentMarketSession = marketSession;
      
      // Reset market session at the end of the day
      if (marketSession === 'MARKET_CLOSE') {
        setTimeout(() => {
          currentMarketSession = null;
          console.log('Market session reset for next trading day');
        }, 5 * 60 * 1000); // Reset 5 minutes after market close
      }
    }

    // Log status every hour during market hours
    if (estDate.getMinutes() === 0 && 
        estDate.getHours() >= 9 && 
        estDate.getHours() <= 16) {
      console.log(`Market calculator active - ${timeStr}`);
    }
  } catch (error) {
    console.error('Error in market calculations scheduler:', error);
  }
}

// Start the scheduler
const schedulerInterval = setInterval(scheduleMarketCalculations, CALCULATION_INTERVAL);

// Run immediately on startup
scheduleMarketCalculations().catch(error => {
  console.error('Error during initial market calculations:', error);
});

// Cleanup on process exit
process.on('SIGTERM', () => {
  clearInterval(schedulerInterval);
});

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const RATE_LIMIT_DELAY = 12000; // 12 seconds between requests
let lastRequestTime = 0;

export async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    // Validate API key
    if (!POLYGON_API_KEY) {
      throw new Error('Polygon API key is not configured');
    }

    // Implement rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    // Make API request
    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Polygon API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      return null;
    }

    const data = await response.json();
    
    // Validate response data
    if (!data.results?.[0]?.c) {
      console.error('Invalid or empty Polygon API response:', {
        status: data.status,
        message: data.message || 'No price data available'
      });
      return null;
    }

    return data.results[0].c;
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return null;
  }
}

interface PolygonAggregateResult {
  t: number;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  vw: number; // volume weighted average
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
    return data.results.map((result: PolygonAggregateResult) => ({
      timestamp: result.t,
      open: result.o,
      high: result.h,
      low: result.l,
      close: result.c,
      volume: result.v
    }));
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    return null;
  }
}

export async function updateStockPrices() {
  const activePredictions = await db.select({ symbol: predictions.symbol })
    .from(predictions)
    .where(sql`${predictions.actualPrice} is null`);

  const uniqueSymbols = Array.from(new Set(activePredictions.map(p => p.symbol)));

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
  const estDate = utcToZonedTime(now, EST_TIMEZONE);
  
  // Only process predictions that match the current market time
  const isMarketOpen = estDate.getHours() === 9 && estDate.getMinutes() === 30;
  const isMarketClose = estDate.getHours() === 16 && estDate.getMinutes() === 0;

  const pendingPredictions = await db
    .select()
    .from(predictions)
    .where(
      and(
        sql`${predictions.actualPrice} is null`,
        sql`date_trunc('minute', ${predictions.targetTime}) = date_trunc('minute', ${sql.raw('current_timestamp')})`,
        sql`extract(hour from ${predictions.targetTime}) = ${isMarketOpen ? 9 : 16}`,
        sql`extract(minute from ${predictions.targetTime}) = ${isMarketOpen ? 30 : 0}`
      )
    );

  console.log(`Processing ${pendingPredictions.length} predictions for ${isMarketOpen ? 'market open' : 'market close'}`);

  for (const prediction of pendingPredictions) {
    try {
      // Get the latest price for the stock
      const [latestPrice] = await db
        .select()
        .from(stockData)
        .where(eq(stockData.symbol, prediction.symbol))
        .orderBy(desc(stockData.timestamp))
        .limit(1);

      if (latestPrice) {
        const predictedPrice = Number(prediction.predictedPrice);
        const actualPrice = Number(latestPrice.price);
        
        // Calculate accuracy (100% minus the percentage difference)
        const accuracy = 100 - Math.abs(
          ((actualPrice - predictedPrice) / actualPrice) * 100
        );

        // Clamp accuracy between 0 and 100
        const clampedAccuracy = Math.max(0, Math.min(100, accuracy));

        await db
          .update(predictions)
          .set({
            actualPrice: latestPrice.price.toString(),
            accuracy: clampedAccuracy.toFixed(2),
          })
          .where(eq(predictions.id, prediction.id));

        console.log(`Updated prediction ${prediction.id} for ${prediction.symbol}: Accuracy ${clampedAccuracy.toFixed(2)}%`);
      } else {
        console.warn(`No price data available for ${prediction.symbol} at ${estDate.toISOString()}`);
      }
    } catch (error) {
      console.error(`Error processing prediction ${prediction.id}:`, error);
    }
  }

  // Only update rankings at market close
  if (isMarketClose) {
    console.log('Market close - updating rankings...');
    await updateRankings();
  }
}

async function updateRankings() {
  const timeFrames = [
    { name: 'daily', startDate: startOfDay(new Date()) },
    { name: 'weekly', startDate: subDays(new Date(), 7) },
    { name: 'monthly', startDate: subMonths(new Date(), 1) },
    { name: 'yearly', startDate: subYears(new Date(), 1) },
  ] as const;

  // Get all unique symbols from predictions
  const uniqueSymbols = await db
    .select({ symbol: predictions.symbol })
    .from(predictions)
    .groupBy(predictions.symbol);

  for (const timeFrame of timeFrames) {
    for (const { symbol } of uniqueSymbols) {
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
            eq(predictions.symbol, symbol),
            sql`${predictions.accuracy} is not null`
          )
        )
        .groupBy(predictions.userId);

      for (const stat of userStats) {
        await db
          .insert(rankings)
          .values({
            userId: stat.userId,
            symbol: symbol,
            timeFrame: timeFrame.name,
            averageAccuracy: stat.avgAccuracy?.toString() ?? '0',
            totalPredictions: Number(stat.count),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [rankings.userId, rankings.timeFrame, rankings.symbol],
            set: {
              averageAccuracy: stat.avgAccuracy?.toString() ?? '0',
              totalPredictions: Number(stat.count),
              updatedAt: new Date(),
            },
          });
      }

      console.log(`Updated ${timeFrame.name} rankings for ${symbol}`);
    }
  }
}
