import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile } from "@/lib/auth/user";
import AppNav from "@/components/AppNav";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import PreferenceForm from "./PreferenceForm";
import { deletePreference } from "./actions";
import type { Tables } from "@/lib/types/database";

type Preference = Tables<"food_preferences">;

const GROUPS: { kind: Preference["kind"]; label: string; hint: string }[] = [
  { kind: "allergy", label: "Allergies", hint: "Numa never includes these." },
  { kind: "diet", label: "Diets", hint: "e.g. vegetarian, halal." },
  { kind: "like", label: "Likes", hint: "Foods to feature more often." },
  { kind: "dislike", label: "Dislikes", hint: "Foods to avoid where possible." },
];

export default async function PreferencesPage() {
  await requireUser();
  const supabase = await createClient();
  const profile = await getProfile();

  const { data } = await supabase
    .from("food_preferences")
    .select("*")
    .order("created_at", { ascending: false });

  const prefs = data ?? [];
  const byKind = (kind: Preference["kind"]) =>
    prefs.filter((p) => p.kind === kind);

  return (
    <>
      <AppNav tier={profile?.tier} />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <PageHeader
            title="Food preferences"
            subtitle="Tell Numa what to feature, avoid, and never include. These shape your meal plans."
          />

          <Card title="Add a preference">
            <PreferenceForm />
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {GROUPS.map((group) => {
              const items = byKind(group.kind);
              return (
                <Card key={group.kind} title={group.label}>
                  {items.length === 0 ? (
                    <EmptyState>{group.hint}</EmptyState>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {items.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 py-1 pl-3 pr-2 text-sm"
                        >
                          <span className="text-stone-800">{p.value}</span>
                          {p.severity && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                              {p.severity}
                            </span>
                          )}
                          <form action={deletePreference}>
                            <input type="hidden" name="id" value={p.id} />
                            <button
                              type="submit"
                              aria-label={`Remove ${p.value}`}
                              className="text-stone-400 hover:text-red-600"
                            >
                              ×
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
