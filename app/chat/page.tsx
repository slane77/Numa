import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { PageHeader } from "@/components/ui";
import Chat from "./Chat";

export default async function ChatPage() {
  await requireUser();
  const profile = await getProfile();

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <PageHeader
            title="Get to know your tastes"
            subtitle="Have a quick chat with Numa about what you like to eat. It saves your likes, dislikes, allergies and diet as you go — and uses them in your meal plans."
          />

          <Chat />
        </div>
      </main>
    </>
  );
}
