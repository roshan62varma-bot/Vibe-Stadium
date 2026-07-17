import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rewardTransactionsTable = pgTable("reward_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("fan-001"),
  type: text("type", { enum: ["earned", "redeemed"] }).notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRewardTransactionSchema = createInsertSchema(rewardTransactionsTable).omit({ createdAt: true });
export type InsertRewardTransaction = z.infer<typeof insertRewardTransactionSchema>;
export type RewardTransaction = typeof rewardTransactionsTable.$inferSelect;
