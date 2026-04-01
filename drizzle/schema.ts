import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const summaryHistory = mysqlTable("summary_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  inputText: text("inputText").notNull(),
  outputType: mysqlEnum("outputType", ["summary", "bullets", "rewrite"]).notNull(),
  outputLength: mysqlEnum("outputLength", ["short", "medium"]).notNull().default("medium"),
  outputTone: mysqlEnum("outputTone", ["formal", "casual"]).notNull().default("formal"),
  rewriteStyle: mysqlEnum("rewriteStyle", ["eli5", "formal"]),
  result: text("result").notNull(),
  charCount: int("charCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SummaryHistory = typeof summaryHistory.$inferSelect;
export type InsertSummaryHistory = typeof summaryHistory.$inferInsert;

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  plan: mysqlEnum("plan", ["free", "pro"]).notNull().default("free"),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "unpaid"]).notNull().default("active"),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  canceledAt: timestamp("canceledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const usageTracking = mysqlTable("usage_tracking", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM format
  generationCount: int("generationCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = typeof usageTracking.$inferInsert;
