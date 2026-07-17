import { pgTable, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const binReportsTable = pgTable("bin_reports", {
  id: text("id").primaryKey(),
  binId: text("bin_id").notNull(),
  zoneId: text("zone_id").notNull(),
  userId: text("user_id").notNull().default("anonymous"),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
});

export const insertBinReportSchema = createInsertSchema(binReportsTable).omit({ reportedAt: true });
export type InsertBinReport = z.infer<typeof insertBinReportSchema>;
export type BinReport = typeof binReportsTable.$inferSelect;
