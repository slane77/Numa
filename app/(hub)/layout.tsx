import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import { getProfile } from "@/lib/auth/user";

export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <AppNav role={profile.role} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-stone-200 px-4 py-6 text-center text-xs text-stone-400">
        The Hub · Day Webster Group · Internal use only
      </footer>
    </div>
  );
}
