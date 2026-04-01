/**
 * Stripe Product & Price Configuration
 * Define all products and pricing tiers here for consistency
 */

export const PRODUCTS = {
  PRO: {
    name: "Pro Plan",
    description: "Unlimited generations + priority support",
    priceMonthly: 999, // $9.99 in cents
    priceYearly: 9900, // $99.00 in cents (save 17%)
    features: [
      "Unlimited generations per month",
      "All output types (summary, bullets, rewrite)",
      "Priority support",
      "Advanced tone & length controls",
      "Download & share results",
    ],
  },
};

export const FREE_TIER = {
  generationsPerMonth: 5,
  description: "5 generations per month",
};

export const PRO_TIER = {
  generationsPerMonth: Infinity,
  description: "Unlimited generations",
};

// Price IDs (from Stripe) - these should be set in environment variables
// For now, we'll use placeholder IDs that get replaced during checkout
export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || "price_pro_monthly",
  PRO_YEARLY: process.env.STRIPE_PRICE_ID_PRO_YEARLY || "price_pro_yearly",
};
