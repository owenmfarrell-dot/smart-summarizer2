import { eq, and } from "drizzle-orm";
import { subscriptions, usageTracking, type InsertSubscription, type InsertUsageTracking } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Get or create a user's subscription record
 */
export async function getOrCreateSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create a free subscription for new users
  const newSub: InsertSubscription = {
    userId,
    plan: "free",
    status: "active",
  };

  await db.insert(subscriptions).values(newSub);
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
    .then(rows => rows[0] || null);
}

/**
 * Update subscription with Stripe details
 */
export async function updateSubscriptionStripeIds(
  userId: number,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  plan: "free" | "pro"
) {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(subscriptions)
    .set({
      stripeCustomerId,
      stripeSubscriptionId,
      plan,
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    })
    .where(eq(subscriptions.userId, userId));

  return getOrCreateSubscription(userId);
}

/**
 * Cancel a user's subscription
 */
export async function cancelSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(subscriptions)
    .set({
      plan: "free",
      status: "canceled",
      canceledAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  return getOrCreateSubscription(userId);
}

/**
 * Get current month usage for a user
 */
export async function getCurrentMonthUsage(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const result = await db
    .select()
    .from(usageTracking)
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)))
    .limit(1);

  return result.length > 0 ? result[0].generationCount : 0;
}

/**
 * Increment usage count for current month
 */
export async function incrementUsage(userId: number) {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const existing = await db
    .select()
    .from(usageTracking)
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(usageTracking)
      .set({ generationCount: existing[0].generationCount + 1 })
      .where(and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)));
  } else {
    const newUsage: InsertUsageTracking = {
      userId,
      month,
      generationCount: 1,
    };
    await db.insert(usageTracking).values(newUsage);
  }
}

/**
 * Check if user has reached their limit
 */
export async function hasReachedLimit(userId: number, subscription: any) {
  if (subscription.plan === "pro") {
    return false; // Pro users have unlimited
  }

  // Free tier: 5 per month
  const usage = await getCurrentMonthUsage(userId);
  return usage >= 5;
}
