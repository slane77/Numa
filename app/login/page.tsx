import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/user";
import Logo from "@/components/Logo";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    redirectedFrom?: string;
    error?: string;
  }>;
}) {
  const user = await getUser();
  if (user) redirect("/home");

  const params = await searchParams;
  const initialMode = params.mode === "signup" ? "signup" : "signin";

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-brand-50 via-stone-50 to-stone-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/">
            <Logo className="h-10" />
          </Link>
          <p className="mt-3 text-sm text-stone-600">
            The Day Webster Group intranet. Sign in to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {params.error === "auth_callback_failed" && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              We couldn&apos;t complete that sign-in link. Please try again.
            </p>
          )}
          <LoginForm
            initialMode={initialMode}
            redirectedFrom={params.redirectedFrom}
          />
        </div>
      </div>
    </main>
  );
}
