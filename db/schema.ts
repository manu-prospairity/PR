import { pgTable, serial, text, varchar, timestamp, decimal, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  predictedPrice: decimal("predicted_price", { precision: 10, scale: 2 }).notNull(),
  actualPrice: decimal("actual_price", { precision: 10, scale: 2 }),
  predictionTime: timestamp("prediction_time").notNull(),
  targetTime: timestamp("target_time").notNull(),
});

export const stockData = pgTable("stock_data", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
});

export const timeFrameEnum = pgEnum("time_frame", ["daily", "weekly", "monthly", "yearly"]);

export const rankings = pgTable("rankings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  symbol: varchar("symbol", { length: 10 }),  // Optional field to allow for all-stocks view
  timeFrame: timeFrameEnum("time_frame").notNull(),
  averageAccuracy: decimal("average_accuracy", { precision: 5, scale: 2 }).notNull(),
  totalPredictions: integer("total_predictions").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertPredictionSchema = createInsertSchema(predictions);
export const selectPredictionSchema = createSelectSchema(predictions);
export type Prediction = z.infer<typeof selectPredictionSchema>;

export const insertStockDataSchema = createInsertSchema(stockData);
export const selectStockDataSchema = createSelectSchema(stockData);
export type StockData = z.infer<typeof selectStockDataSchema>;

export const insertRankingSchema = createInsertSchema(rankings);
export const selectRankingSchema = createSelectSchema(rankings);
export type Ranking = z.infer<typeof selectRankingSchema>;
