import { sql } from "drizzle-orm";
import { db } from "../db";
import { predictions, stockData } from "@db/schema";
import { toZonedTime } from "date-fns-tz";

const EST_TIMEZONE = 'America/New_York';
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

if (!POLYGON_API_KEY) {
  console.error('POLYGON_API_KEY is not set in environment variables');
  process.exit(1);
}

const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 12100; // Slightly over 12 seconds for safety

// Keep the retry mechanism for API calls
async function retryFetch(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (response.status === 429 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      return retryFetch(url, options, retries - 1);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      return retryFetch(url, options, retries - 1);
    }
    throw error;
  }
}

// Keep the RateLimiter class
class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastRequestTime = 0;

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const now = Date.now();
      const timeToWait = Math.max(0, RATE_LIMIT_DELAY - (now - this.lastRequestTime));
      if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }
      
      const task = this.queue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        await task();
      }
    }
    this.processing = false;
  }
}

const rateLimiter = new RateLimiter();

export async function fetchStockPrice(symbol: string): Promise<number | null> {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key not configured');
    return null;
  }

  return rateLimiter.enqueue(async () => {
    try {
      const response = await retryFetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`
      );

      if (response.status === 401) {
        console.error('Invalid Polygon API key - please check your configuration');
        return null;
      }

      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.results?.[0]?.c ?? null;
    } catch (error) {
      console.error(`Error fetching stock price for ${symbol}:`, error);
      return null;
    }
  });
}

export async function updateStockPrices() {
  try {
    console.log('Starting stock price update...');
    
    const activePredictions = await db.select({ symbol: predictions.symbol })
      .from(predictions)
      .where(sql`${predictions.actualPrice} is null`);

    const uniqueSymbols = Array.from(new Set(activePredictions.map(p => p.symbol)));
    
    console.log(`Updating prices for ${uniqueSymbols.length} symbols`);
    
    for (const symbol of uniqueSymbols) {
      const price = await fetchStockPrice(symbol);
      if (price) {
        await db.insert(stockData).values({
          symbol,
          price: price.toString(),
          timestamp: new Date(),
        });
        console.log(`Updated price for ${symbol}: ${price}`);
      } else {
        console.warn(`Failed to fetch price for ${symbol}`);
      }
    }
    
    console.log('Stock price update completed');
  } catch (error) {
    console.error('Error in updateStockPrices:', error);
    throw error;
  }
}

export async function getHistoricalPrices(symbol: string, fromDate: Date, toDate: Date): Promise<any[]> {
  if (!POLYGON_API_KEY) {
    console.error('Polygon API key not configured');
    return [];
  }

  return rateLimiter.enqueue(async () => {
    try {
      const from = fromDate.toISOString().split('T')[0];
      const to = toDate.toISOString().split('T')[0];
      
      const response = await retryFetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}?adjusted=true&apiKey=${POLYGON_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol}:`, error);
      return [];
    }
  });
}