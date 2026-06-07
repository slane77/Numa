import Link from "next/link";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { PageHeader } from "@/components/ui";
import Chat from "./Chat";

export default async function ChatPage() {
  await requireUser();
  const profile = await getProfile();
  const isPremium = profile?.tier === "premium";

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <PageHeader
            title="Get to know your tastes"
            subtitle="Have a quick chat with Numa about what you like to eat. It saves your likes, dislikes, allergies and diet as you go — and uses them in your meal plans."
          />

          {isPremium ? (
            <Chat />
          ) : (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
              <h2 className="font-semibold text-stone-900">
                This is a Premium feature
              </h2>
              <p className="mt-2 text-sm text-stone-700">
                The taste-profiling chat is part of Numa Premium. You can always
                add likes, dislikes, allergies and diets manually on the
                preferences page.
              </p>
              <Link
                href="/preferences"
                className="mt-4 inline-block rounded-full border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
              >
                Go to preferences
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
