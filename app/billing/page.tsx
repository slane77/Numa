import { getProfile, requireUser } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { Card, PageHeader } from "@/components/ui";
import BillingButtons from "./BillingButtons";

const PREMIUM_FEATURES = [
  "AI meal planning around your goal & pantry",
  "Pantry intelligence (use items before they expire)",
  "Goal forecasting & advanced shopping optimisation",
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireUser();
  const profile = await getProfile();
  const { status } = await searchParams;
  const isPremium = profile?.tier === "premium";

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <PageHeader
            title="Billing"
            subtitle="Numa Premium unlocks AI meal planning and pantry intelligence. Weight tracking, manual planning and shopping lists are always free."
          />

          {status === "success" && (
            <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
              Thanks for subscribing! Your premium features unlock as soon as
              payment is confirmed (usually within a few seconds).
            </p>
          )}
          {status === "cancelled" && (
            <p className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-600">
              Checkout cancelled — no charge was made.
            </p>
          )}

          <Card title="Your plan">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-stone-900">
                  {isPremium ? "Numa Premium" : "Free"}
                </p>
                {profile?.subscription_status && (
                  <p className="mt-0.5 text-sm text-stone-500">
                    Status: {profile.subscription_status}
                    {profile.current_period_end &&
                      ` · renews ${new Date(profile.current_period_end).toLocaleDateString()}`}
                  </p>
                )}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  isPremium
                    ? "bg-brand-100 text-brand-700"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {isPremium ? "Premium" : "Free"}
              </span>
            </div>

            <ul className="mt-4 space-y-1.5 text-sm text-stone-600">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-brand-600">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <BillingButtons isPremium={isPremium} />
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
