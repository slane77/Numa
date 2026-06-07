import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/user";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // If the user already has an active goal, onboarding is done.
  const { count } = await supabase
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if ((count ?? 0) > 0) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
          Step 1 of 2
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
          Welcome to Numa
        </h1>
        <p className="mt-2 text-stone-600">
          A few details so we can tailor your plan. You can change these anytime.
        </p>

        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <OnboardingForm defaultName={profile?.display_name ?? undefined} />
        </div>
      </div>
    </main>
  );
}
