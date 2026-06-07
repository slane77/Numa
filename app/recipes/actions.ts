"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function num(value: FormDataEntryValue | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export type RecipeActionState = { error: string } | null;

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function createRecipe(
  _prev: RecipeActionState,
  formData: FormData,
): Promise<RecipeActionState> {
  const { supabase, userId } = await getUserId();

  const title = str(formData.get("title"));
  if (!title) return { error: "Give your recipe a title." };

  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      user_id: userId,
      title,
      servings: num(formData.get("servings")) ?? 1,
      calories_per_serving: num(formData.get("calories_per_serving")),
      protein_g: num(formData.get("protein_g")),
      method: str(formData.get("method")),
      source: str(formData.get("source")),
      is_public: formData.get("is_public") === "on",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Ingredient rows arrive as parallel arrays.
  const names = formData.getAll("ingredient_name");
  const quantities = formData.getAll("ingredient_quantity");
  const units = formData.getAll("ingredient_unit");

  const ingredients = names
    .map((name, i) => ({
      recipe_id: recipe.id,
      item_name: String(name).trim(),
      quantity: num(quantities[i] ?? null),
      unit: str(units[i] ?? null),
    }))
    .filter((row) => row.item_name !== "");

  if (ingredients.length > 0) {
    const { error: ingError } = await supabase
      .from("recipe_ingredients")
      .insert(ingredients);
    if (ingError) return { error: ingError.message };
  }

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function deleteRecipe(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const id = String(formData.get("id"));
  if (id) {
    // recipe_ingredients cascade on delete via FK.
    await supabase.from("recipes").delete().eq("id", id).eq("user_id", userId);
  }
  revalidatePath("/recipes");
  redirect("/recipes");
}
