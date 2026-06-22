import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import { getProfile } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const isHr = profile.is_hr || profile.role === "admin";

  // Does this person line-manage anyone? (controls the "My team" nav link)
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("manager_id", profile.id);
  const hasReports = (count ?? 0) > 0;

  return (
    <div className="flex min-h-full flex-col">
      <AppNav role={profile.role} isHr={isHr} hasReports={hasReports} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-stone-200 px-4 py-6 text-center text-xs text-stone-400">
        The Hub · Day Webster Group · Internal use only
      </footer>
    </div>
  );
}
