import Link from "next/link";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { PageHeader } from "@/components/ui";
import AiPlanner from "./AiPlanner";

export default async function AiPlanPage() {
  await requireUser();
  const profile = await getProfile();
  const isPremium = profile?.tier === "premium";

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <PageHeader
            title="AI meal planning"
            subtitle="Numa builds a plan around your active goal, preferences and pantry — prioritising items nearing expiry — and lists only what you still need to buy."
          />

          {isPremium ? (
            <AiPlanner />
          ) : (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
              <h2 className="font-semibold text-stone-900">
                This is a Premium feature
              </h2>
              <p className="mt-2 text-sm text-stone-700">
                AI meal planning, pantry intelligence and advanced shopping
                optimisation are part of Numa Premium. Manual meal planning and
                shopping lists are always free.
              </p>
              <Link
                href="/dashboard"
                className="mt-4 inline-block rounded-full border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
              >
                Back to dashboard
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
