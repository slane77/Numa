import { getProfile } from "@/lib/auth/user";

/**
 * Error thrown when a free-tier user attempts to use a premium feature.
 * Carries an HTTP-friendly status so route handlers can map it directly.
 */
export class PremiumRequiredError extends Error {
  readonly status = 402; // Payment Required
  constructor(message = "This feature requires a Numa premium subscription.") {
    super(message);
    this.name = "PremiumRequiredError";
  }
}

/**
 * Server guard for premium-only features (AI meal planning, pantry intelligence,
 * goal forecasting, event mode, family planning, advanced shopping optimisation).
 *
 * Throws {@link PremiumRequiredError} for unauthenticated or free-tier users so
 * the caller can return a 402. Stripe/billing is intentionally deferred — gating
 * is driven purely by `profiles.tier`.
 *
 * @returns the user's profile when premium access is granted.
 */
export async function requirePremium() {
  const profile = await getProfile();

  if (!profile) {
    throw new PremiumRequiredError("You must be signed in to use this feature.");
  }
  if (profile.tier !== "premium") {
    throw new PremiumRequiredError();
  }

  return profile;
}
