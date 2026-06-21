"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { WorkLocation } from "@/lib/calendar";

/**
 * Set (or clear) the current user's work location for a given day. Passing
 * `null` removes the entry — back to "not set".
 */
export async function setWorkStatus(
  day: string,
  location: WorkLocation | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (location === null) {
    await supabase
      .from("work_status")
      .delete()
      .eq("user_id", user.id)
      .eq("day", day);
  } else {
    await supabase
      .from("work_status")
      .upsert(
        { user_id: user.id, day, location },
        { onConflict: "user_id,day" },
      );
  }

  revalidatePath("/calendar");
}
