import { pgTable, text, integer, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeFrameEnum = pgEnum("time_frame", ["daily", "weekly", "monthly", "yearly"]);

export const predictions = pgTable("predictions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id).notNull(),
  symbol: text("symbol").notNull(),
  predictedPrice: decimal("predicted_price", { precision: 10, scale: 2 }).notNull(),
  actualPrice: decimal("actual_price", { precision: 10, scale: 2 }),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
  predictionTime: timestamp("prediction_time").notNull(),
  targetTime: timestamp("target_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockData = pgTable("stock_data", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  symbol: text("symbol").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
});

export const rankings = pgTable("rankings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id).notNull(),
  symbol: text("symbol"),  // Optional field to allow for all-stocks view
  timeFrame: timeFrameEnum("time_frame").notNull(),
  averageAccuracy: decimal("average_accuracy", { precision: 5, scale: 2 }).notNull(),
  totalPredictions: integer("total_predictions").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export const insertPredictionSchema = createInsertSchema(predictions);
export const selectPredictionSchema = createSelectSchema(predictions);
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = z.infer<typeof selectPredictionSchema>;

export const insertStockDataSchema = createInsertSchema(stockData);
export const selectStockDataSchema = createSelectSchema(stockData);
export type InsertStockData = z.infer<typeof insertStockDataSchema>;
export type StockData = z.infer<typeof selectStockDataSchema>;

export const insertRankingSchema = createInsertSchema(rankings);
export const selectRankingSchema = createSelectSchema(rankings);
export type InsertRanking = z.infer<typeof insertRankingSchema>;
export type Ranking = z.infer<typeof selectRankingSchema>;
