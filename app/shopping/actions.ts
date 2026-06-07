"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ShoppingActionState = { error: string } | null;

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Builds a shopping list from a meal plan: aggregates every recipe ingredient
 * (scaled by servings), then flags items already covered by the pantry so the
 * "to buy" list contains only what's missing.
 */
export async function generateShoppingList(
  formData: FormData,
): Promise<void> {
  const { supabase, userId } = await getUserId();
  const planId = String(formData.get("meal_plan_id"));
  if (!planId) return;

  // 1) Plan items -> recipe ids + servings.
  const { data: items } = await supabase
    .from("meal_plan_items")
    .select("recipe_id, servings")
    .eq("meal_plan_id", planId);

  const planItems = (items ?? []).filter((i) => i.recipe_id);
  if (planItems.length === 0) {
    redirect(`/plans/${planId}?error=empty`);
  }

  // 2) Pull ingredients for all referenced recipes.
  const recipeIds = [...new Set(planItems.map((i) => i.recipe_id as string))];
  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id, item_name, quantity, unit")
    .in("recipe_id", recipeIds);

  const byRecipe = new Map<
    string,
    { item_name: string; quantity: number | null; unit: string | null }[]
  >();
  for (const ing of ingredients ?? []) {
    const list = byRecipe.get(ing.recipe_id) ?? [];
    list.push({
      item_name: ing.item_name,
      quantity: ing.quantity != null ? Number(ing.quantity) : null,
      unit: ing.unit,
    });
    byRecipe.set(ing.recipe_id, list);
  }

  // 3) Aggregate needed quantities, keyed by name + unit.
  type Agg = {
    item_name: string;
    unit: string | null;
    quantity: number | null;
  };
  const needed = new Map<string, Agg>();
  for (const pi of planItems) {
    const list = byRecipe.get(pi.recipe_id as string) ?? [];
    for (const ing of list) {
      const key = `${norm(ing.item_name)}|${norm(ing.unit ?? "")}`;
      const scaled =
        ing.quantity != null ? ing.quantity * (pi.servings ?? 1) : null;
      const existing = needed.get(key);
      if (existing) {
        if (scaled != null) {
          existing.quantity = (existing.quantity ?? 0) + scaled;
        }
      } else {
        needed.set(key, {
          item_name: ing.item_name,
          unit: ing.unit,
          quantity: scaled,
        });
      }
    }
  }

  if (needed.size === 0) {
    redirect(`/plans/${planId}?error=no_ingredients`);
  }

  // 4) Cross-reference the pantry (match by name).
  const { data: pantry } = await supabase
    .from("inventory")
    .select("item_name")
    .eq("user_id", userId);
  const pantrySet = new Set((pantry ?? []).map((p) => norm(p.item_name)));

  // 5) Fetch plan title for a friendly list name.
  const { data: plan } = await supabase
    .from("meal_plans")
    .select("title")
    .eq("id", planId)
    .maybeSingle();

  // 6) Create the list + items.
  const { data: list, error } = await supabase
    .from("shopping_lists")
    .insert({
      user_id: userId,
      meal_plan_id: planId,
      title: plan?.title ? `Shopping — ${plan.title}` : "Shopping list",
      status: "open",
    })
    .select("id")
    .single();
  if (error || !list) redirect(`/plans/${planId}?error=list_failed`);

  const rows = [...needed.values()].map((n) => ({
    shopping_list_id: list.id,
    item_name: n.item_name,
    quantity: n.quantity,
    unit: n.unit,
    category: null,
    have_in_pantry: pantrySet.has(norm(n.item_name)),
    purchased: false,
  }));
  await supabase.from("shopping_list_items").insert(rows);

  revalidatePath("/shopping");
  redirect(`/shopping/${list.id}`);
}

export async function setItemPurchased(formData: FormData) {
  const { supabase } = await getUserId();
  const id = String(formData.get("id"));
  const listId = String(formData.get("shopping_list_id"));
  const purchased = formData.get("purchased") === "true";
  if (id) {
    await supabase
      .from("shopping_list_items")
      .update({ purchased })
      .eq("id", id);
  }
  if (listId) revalidatePath(`/shopping/${listId}`);
}

export async function setListStatus(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (id && ["open", "completed", "archived"].includes(status)) {
    await supabase
      .from("shopping_lists")
      .update({ status: status as "open" | "completed" | "archived" })
      .eq("id", id)
      .eq("user_id", userId);
  }
  revalidatePath("/shopping");
  revalidatePath(`/shopping/${id}`);
}

export async function deleteShoppingList(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const id = String(formData.get("id"));
  if (id) {
    await supabase
      .from("shopping_lists")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
  }
  revalidatePath("/shopping");
  redirect("/shopping");
}
