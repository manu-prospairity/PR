import { type Express } from "express";
import { setupAuth } from "./auth";
import { fetchStockPrice, getHistoricalPrices } from "./market";
import { db } from "../db";
import { predictions, stockData, rankings } from "@db/schema";
import { and, eq, gt, desc } from "drizzle-orm";

export function registerRoutes(app: Express) {
  setupAuth(app);

  // Get leaderboard data
  app.get("/api/leaderboard/:timeFrame", async (req, res) => {
    try {
      const { timeFrame } = req.params;
      const { stock } = req.query;

      const query = db
        .select()
        .from(rankings)
        .where(
          stock
            ? and(
                eq(rankings.timeFrame, timeFrame as any),
                eq(rankings.symbol, stock as string)
              )
            : eq(rankings.timeFrame, timeFrame as any)
        )
        .orderBy(desc(rankings.averageAccuracy));

      const leaderboardData = await query;
      res.json(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).send("Error fetching leaderboard data");
    }
  });

  // Get stock predictions
  app.get("/api/predictions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const userPredictions = await db
        .select()
        .from(predictions)
        .where(eq(predictions.userId, req.user.id));
      res.json(userPredictions);
    } catch (error) {
      res.status(500).send("Error fetching predictions");
    }
  });

  // Submit a new prediction
  app.post("/api/predictions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [prediction] = await db
        .insert(predictions)
        .values({
          userId: req.user.id,
          symbol: req.body.symbol,
          predictedPrice: req.body.predictedPrice,
          predictionTime: new Date(),
          targetTime: new Date(req.body.targetTime),
        })
        .returning();
      res.json(prediction);
    } catch (error) {
      res.status(500).send("Error creating prediction");
    }
  });

  // Get available stocks - Place this BEFORE the :symbol route
  app.get("/api/stocks/available", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // Only fetch stocks where predictions exist for the current user
      const uniqueStocks = await db
        .select({
          symbol: predictions.symbol
        })
        .from(predictions)
        .where(eq(predictions.userId, req.user.id))
        .groupBy(predictions.symbol)
        .orderBy(predictions.symbol);
      
      const symbols = uniqueStocks.map(stock => stock.symbol);
      res.json(symbols);
    } catch (error) {
      console.error('Error fetching available stocks:', error);
      res.status(500).send("Error fetching available stocks");
    }
  });

  // Get stock data - Keep this AFTER the /available route
  app.get("/api/stocks/:symbol", async (req, res) => {
    const { symbol } = req.params;
    try {
      const price = await fetchStockPrice(symbol);
      if (price === null) {
        return res.status(404).send("Stock price not found");
      }
      res.json({ symbol, price });
    } catch (error) {
      console.error('Error in /api/stocks/:symbol:', error);
      res.status(500).send("Error fetching stock data");
    }
  });

  // Get historical stock data
  app.get("/api/stocks/:symbol/history", async (req, res) => {
    const { symbol } = req.params;
    
    try {
      const historicalData = await getHistoricalPrices(symbol);
      if (!historicalData) {
        return res.status(404).send("Historical data not found");
      }
      res.json(historicalData);
    } catch (error) {
      res.status(500).send("Error fetching historical data");
    }
  });
}
