import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/user";

/**
 * The Hub is internal-only — there's no public marketing page. Send people
 * straight to the news homepage when signed in, or to the sign-in screen.
 */
export default async function Root() {
  const user = await getUser();
  redirect(user ? "/home" : "/login");
}
