import Stripe from "stripe";

/**
 * Server-only Stripe client. The secret key must never reach the browser.
 */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return new Stripe(key);
}

/** The recurring price (e.g. £4.99/mo) the checkout subscribes the user to. */
export function getPriceId() {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not configured.");
  return priceId;
}
