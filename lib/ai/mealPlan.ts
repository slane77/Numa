import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, MODEL_FAST, MODEL_QUALITY } from "@/lib/ai/anthropic";
import type { Tables } from "@/lib/types/database";

export type MealPlanInputs = {
  goal: Tables<"goals"> | null;
  preferences: Pick<Tables<"food_preferences">, "kind" | "value" | "severity">[];
  pantry: Pick<
    Tables<"inventory">,
    "item_name" | "quantity" | "unit" | "expires_at"
  >[];
  recipes: Pick<
    Tables<"recipes">,
    "id" | "title" | "calories_per_serving" | "protein_g"
  >[];
  days: number;
  startDate: string; // YYYY-MM-DD
};

export type PlannedMeal = {
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  recipe_id: string | null;
  servings: number;
  calories: number | null;
  protein_g: number | null;
  uses_pantry_items: string[];
};

export type PlannedDay = {
  date: string;
  meals: PlannedMeal[];
};

export type ShoppingItem = {
  item_name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
};

export type MealPlanResult = {
  summary: string;
  days: PlannedDay[];
  shopping_list: ShoppingItem[];
};

const SUBMIT_TOOL: Anthropic.Tool = {
  name: "submit_meal_plan",
  description:
    "Submit the finished meal plan and the shopping list of only the items the user still needs to buy.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description:
          "One or two sentences summarising the plan and how it meets the goal.",
      },
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "YYYY-MM-DD" },
            meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  meal: {
                    type: "string",
                    enum: ["breakfast", "lunch", "dinner", "snack"],
                  },
                  title: { type: "string" },
                  recipe_id: {
                    type: ["string", "null"],
                    description:
                      "id of an existing recipe if reused, otherwise null",
                  },
                  servings: { type: "number" },
                  calories: { type: ["number", "null"] },
                  protein_g: { type: ["number", "null"] },
                  uses_pantry_items: {
                    type: "array",
                    items: { type: "string" },
                    description: "Pantry item names this meal consumes.",
                  },
                },
                required: ["meal", "title", "servings", "uses_pantry_items"],
              },
            },
          },
          required: ["date", "meals"],
        },
      },
      shopping_list: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item_name: { type: "string" },
            quantity: { type: ["number", "null"] },
            unit: { type: ["string", "null"] },
            category: { type: ["string", "null"] },
          },
          required: ["item_name"],
        },
      },
    },
    required: ["summary", "days", "shopping_list"],
  },
};

function buildPrompt(inputs: MealPlanInputs): string {
  const { goal, preferences, pantry, recipes, days, startDate } = inputs;

  const goalText = goal
    ? [
        `Type: ${goal.type}`,
        goal.calorie_target != null
          ? `Daily calorie target: ${goal.calorie_target} kcal`
          : null,
        goal.protein_target_g != null
          ? `Daily protein target: ${goal.protein_target_g} g`
          : null,
        goal.target_weight_kg != null
          ? `Target weight: ${goal.target_weight_kg} kg`
          : null,
        goal.target_date ? `Target date: ${goal.target_date}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "No active goal set.";

  const prefText =
    preferences.length > 0
      ? preferences
          .map(
            (p) =>
              `- ${p.kind}: ${p.value}${p.severity ? ` (${p.severity})` : ""}`,
          )
          .join("\n")
      : "No stated preferences or allergies.";

  const pantryText =
    pantry.length > 0
      ? pantry
          .map(
            (i) =>
              `- ${i.item_name}: ${i.quantity ?? ""}${i.unit ? ` ${i.unit}` : ""}${
                i.expires_at ? ` (expires ${i.expires_at})` : ""
              }`,
          )
          .join("\n")
      : "Pantry is empty.";

  const recipeText =
    recipes.length > 0
      ? recipes
          .map(
            (r) =>
              `- ${r.title} [id: ${r.id}]${
                r.calories_per_serving != null
                  ? `, ${r.calories_per_serving} kcal/serving`
                  : ""
              }${r.protein_g != null ? `, ${r.protein_g} g protein` : ""}`,
          )
          .join("\n")
      : "No saved recipes.";

  return `Plan ${days} day(s) of meals starting ${startDate} for this user.

GOAL
${goalText}

PREFERENCES & ALLERGIES (never violate allergies)
${prefText}

CURRENT PANTRY (prioritise items, especially those nearing expiry, to cut waste)
${pantryText}

SAVED RECIPES (reuse by referencing recipe_id where they fit)
${recipeText}

Rules:
- Respect all allergies and dietary restrictions strictly.
- Maximise use of existing pantry items, prioritising those expiring soonest.
- Where a saved recipe fits, reuse it and set recipe_id; otherwise propose a simple meal with recipe_id null.
- Keep daily totals close to the calorie/protein targets when provided.
- The shopping_list must contain ONLY ingredients the user still needs to buy (i.e. NOT already covered by the pantry).
- Call the submit_meal_plan tool exactly once with the complete plan.`;
}

export async function generateMealPlan(
  inputs: MealPlanInputs,
  opts: { fast?: boolean } = {},
): Promise<MealPlanResult> {
  const client = getAnthropic();
  const model = opts.fast ? MODEL_FAST : MODEL_QUALITY;

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system:
      "You are Numa's meal planning engine. You design realistic, goal-aligned meal plans that minimise food waste by building around what the user already has. Always finish by calling the submit_meal_plan tool.",
    tools: [SUBMIT_TOOL],
    tool_choice: { type: "tool", name: "submit_meal_plan" },
    messages: [{ role: "user", content: buildPrompt(inputs) }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Model did not return a meal plan.");
  }

  return toolUse.input as MealPlanResult;
}
