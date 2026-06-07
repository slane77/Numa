import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { Card } from "@/components/ui";
import { deleteRecipe } from "../actions";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!recipe) notFound();

  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .eq("recipe_id", id)
    .order("item_name", { ascending: true });

  const isOwner = recipe.user_id === user.id;

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link href="/recipes" className="text-sm text-brand-700 hover:underline">
            ← All recipes
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                {recipe.title}
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                {[
                  `${recipe.servings} serving${recipe.servings === 1 ? "" : "s"}`,
                  recipe.calories_per_serving != null
                    ? `${recipe.calories_per_serving} kcal/serving`
                    : null,
                  recipe.protein_g != null
                    ? `${recipe.protein_g} g protein/serving`
                    : null,
                  recipe.source ? `Source: ${recipe.source}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {isOwner && (
              <form action={deleteRecipe}>
                <input type="hidden" name="id" value={recipe.id} />
                <button
                  type="submit"
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:border-red-300 hover:text-red-600"
                >
                  Delete
                </button>
              </form>
            )}
          </div>

          <Card title="Ingredients">
            {!ingredients || ingredients.length === 0 ? (
              <p className="text-sm text-stone-500">No ingredients listed.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {ingredients.map((ing) => (
                  <li
                    key={ing.id}
                    className="flex justify-between py-2 text-sm"
                  >
                    <span className="text-stone-800">{ing.item_name}</span>
                    <span className="text-stone-500">
                      {[ing.quantity != null ? Number(ing.quantity) : null, ing.unit]
                        .filter((v) => v != null && v !== "")
                        .join(" ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {recipe.method && (
            <Card title="Method">
              <p className="whitespace-pre-wrap text-sm text-stone-700">
                {recipe.method}
              </p>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
