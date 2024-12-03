import { sql } from "drizzle-orm";
import { pgTable, serial, text, varchar, timestamp, decimal, integer } from "drizzle-orm/pg-core";

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