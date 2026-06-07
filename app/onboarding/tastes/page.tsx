import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/user";
import Chat from "@/app/chat/Chat";

export default async function OnboardingTastesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Step 1 (profile + first goal) must be done before this step.
  const { count } = await supabase
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);
  if ((count ?? 0) === 0) redirect("/onboarding");

  return (
    <main className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
            Step 2 of 2
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
            Tell Numa about your tastes
          </h1>
          <p className="mt-2 text-stone-600">
            Have a quick chat about what you love and avoid — Numa saves it as
            you go and plans around it. This is optional; you can skip and do it
            anytime later.
          </p>
        </div>

        <Chat />

        <div className="flex items-center justify-end gap-4 border-t border-stone-200 pt-4">
          <Link
            href="/dashboard"
            className="text-sm text-stone-500 hover:text-stone-800"
          >
            Skip for now
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-brand-600 px-6 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            Finish — go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
