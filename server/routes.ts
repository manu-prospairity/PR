import { type Express } from "express";
import { setupAuth } from "./auth";
import { getHistoricalPrices } from "./market";
import { db } from "../db";
import { predictions, stockData } from "@db/schema";
import { and, eq, gt } from "drizzle-orm";

export function registerRoutes(app: Express) {
  setupAuth(app);

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

  // Get stock data
  app.get("/api/stocks/:symbol", async (req, res) => {
    const { symbol } = req.params;
    try {
      const [latestPrice] = await db
        .select()
        .from(stockData)
        .where(eq(stockData.symbol, symbol))
        .orderBy(stockData.timestamp);
      res.json({ symbol, price: latestPrice?.price || "0" });
    } catch (error) {
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