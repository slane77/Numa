import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import RecipeForm from "./RecipeForm";

export default async function RecipesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, title, servings, calories_per_serving, protein_g, is_public, user_id")
    .order("created_at", { ascending: false });

  const rows = recipes ?? [];

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <PageHeader
            title="Recipes"
            subtitle="Build a library of meals Numa can reuse in your plans."
          />

          <Card title={`Your recipes${rows.length ? ` (${rows.length})` : ""}`}>
            {rows.length === 0 ? (
              <EmptyState>No recipes yet — add your first below.</EmptyState>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/recipes/${r.id}`}
                      className="block rounded-xl border border-stone-200 p-4 transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-stone-900">
                          {r.title}
                        </span>
                        {r.is_public && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                            {r.user_id === user.id ? "Public" : "Shared"}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-stone-500">
                        {[
                          `${r.servings} serving${r.servings === 1 ? "" : "s"}`,
                          r.calories_per_serving != null
                            ? `${r.calories_per_serving} kcal`
                            : null,
                          r.protein_g != null ? `${r.protein_g} g protein` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Add a recipe">
            <RecipeForm />
          </Card>
        </div>
      </main>
    </>
  );
}
