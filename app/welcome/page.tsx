import { requireUser } from "@/lib/auth/user";
import WelcomeCarousel from "./WelcomeCarousel";

export default async function WelcomePage() {
  await requireUser();

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-brand-50 via-stone-50 to-stone-50 px-4 py-12">
      <WelcomeCarousel />
    </main>
  );
}
