import { type Express } from "express";
import { setupAuth } from "./auth";
import { db } from "../db";
import { predictions, rankings } from "@db/schema";
import { eq, and, gte } from "drizzle-orm";
import { startOfDay, subDays, subMonths, subYears } from "date-fns";
import { fetchStockPrice } from "./market";

export function registerRoutes(app: Express) {
  setupAuth(app);

  // Submit prediction
  app.post("/api/predictions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const { symbol, predictedPrice, targetTime } = req.body;
    
    try {
      const currentPrice = await fetchStockPrice(symbol);
      if (!currentPrice) {
        return res.status(400).send("Invalid stock symbol");
      }

      const prediction = await db
        .insert(predictions)
        .values({
          userId: req.user.id,
          symbol,
          predictedPrice,
          targetTime: new Date(targetTime),
          predictionTime: new Date(),
        })
        .returning();

      res.json(prediction[0]);
    } catch (error) {
      res.status(500).send("Error creating prediction");
    }
  });

  // Get user predictions
  app.get("/api/predictions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const userPredictions = await db
        .select()
        .from(predictions)
        .where(eq(predictions.userId, req.user.id))
        .orderBy(predictions.createdAt);

      res.json(userPredictions);
    } catch (error) {
      res.status(500).send("Error fetching predictions");
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard/:timeFrame", async (req, res) => {
    const { timeFrame } = req.params;
    let startDate;

    switch (timeFrame) {
      case 'daily':
        startDate = startOfDay(new Date());
        break;
      case 'weekly':
        startDate = subDays(new Date(), 7);
        break;
      case 'monthly':
        startDate = subMonths(new Date(), 1);
        break;
      case 'yearly':
        startDate = subYears(new Date(), 1);
        break;
      default:
        return res.status(400).send("Invalid time frame");
    }

    try {
      const leaderboard = await db
        .select()
        .from(rankings)
        .where(
          and(
            eq(rankings.timeFrame, timeFrame),
            gte(rankings.updatedAt, startDate)
          )
        )
        .orderBy(rankings.averageAccuracy);

      res.json(leaderboard);
    } catch (error) {
      res.status(500).send("Error fetching leaderboard");
    }
  });

  // Get stock data
  app.get("/api/stocks/:symbol", async (req, res) => {
    const { symbol } = req.params;
    
    try {
      const price = await fetchStockPrice(symbol);
      if (!price) {
        return res.status(404).send("Stock not found");
      }
      res.json({ symbol, price });
    } catch (error) {
      res.status(500).send("Error fetching stock data");
    }
  });
}
