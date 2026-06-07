import { NextResponse, type NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { requirePremium, PremiumRequiredError } from "@/lib/auth/requirePremium";
import { getAnthropic, MODEL_FAST } from "@/lib/ai/anthropic";
import type { Database } from "@/lib/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

type PreferenceKind = Database["public"]["Enums"]["preference_kind"];
const KINDS: PreferenceKind[] = ["like", "dislike", "allergy", "diet"];
const SEVERITIES = ["mild", "moderate", "severe"];

type ChatMessage = { role: "user" | "assistant"; content: string };
type SavedPref = { kind: PreferenceKind; value: string; severity: string | null };

const norm = (s: string) => s.trim().toLowerCase();

const SAVE_TOOL: Anthropic.Tool = {
  name: "save_preferences",
  description:
    "Save one or more food preferences you have learned about the user during the conversation. Call this as soon as you learn something concrete — likes, dislikes, allergies, or dietary patterns. Do not save things you are unsure about or that are already known.",
  input_schema: {
    type: "object",
    properties: {
      preferences: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: ["like", "dislike", "allergy", "diet"],
            },
            value: {
              type: "string",
              description:
                'A single food, ingredient, cuisine or diet, e.g. "salmon", "peanuts", "vegetarian", "Thai food".',
            },
            severity: {
              type: "string",
              enum: ["mild", "moderate", "severe"],
              description: "Only for allergies — how severe the reaction is.",
            },
          },
          required: ["kind", "value"],
        },
      },
    },
    required: ["preferences"],
  },
};

export async function POST(request: NextRequest) {
  // Premium gate (AI feature).
  let userId: string;
  try {
    const profile = await requirePremium();
    userId = profile.id;
  } catch (err) {
    if (err instanceof PremiumRequiredError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const body = await request.json().catch(() => ({}));
  const incoming: ChatMessage[] = Array.isArray(body?.messages)
    ? body.messages
        .filter(
          (m: unknown): m is ChatMessage =>
            !!m &&
            typeof (m as ChatMessage).content === "string" &&
            ((m as ChatMessage).role === "user" ||
              (m as ChatMessage).role === "assistant"),
        )
        .slice(-20)
    : [];

  // Anthropic requires the first message to be from the user.
  const firstUser = incoming.findIndex((m) => m.role === "user");
  if (firstUser === -1) {
    return NextResponse.json(
      { error: "No user message provided." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Load existing preferences for context + de-duplication.
  const { data: existing } = await supabase
    .from("food_preferences")
    .select("kind, value, severity")
    .eq("user_id", userId);
  const known = new Set(
    (existing ?? []).map((p) => `${p.kind}|${norm(p.value)}`),
  );
  const existingSummary =
    (existing ?? []).length > 0
      ? (existing ?? [])
          .map((p) => `${p.kind}: ${p.value}`)
          .join("; ")
      : "none yet";

  const system = `You are Numa's friendly food assistant. Your job is to have a warm, natural, casual conversation to get to know the user's food tastes so Numa can tailor meal plans to them.

Guidelines:
- Be warm and concise. Ask ONE question at a time. Sound like a friendly human, not a form.
- Cover, over the course of the chat: foods/cuisines they love, foods they dislike or avoid, any allergies or intolerances (and how severe), and any diet they follow (e.g. vegetarian, vegan, halal, gluten-free).
- The MOMENT you learn something concrete, call the save_preferences tool to store it. You can save several at once. Keep chatting naturally afterwards.
- Never re-ask about something already known. Already known preferences: ${existingSummary}.
- After you have a reasonable picture, offer 2-3 specific meal ideas that fit their tastes, and let them know they can head to "AI meal planning" for a full plan.
- Keep replies to a few sentences.`;

  const messages: Anthropic.MessageParam[] = incoming
    .slice(firstUser)
    .map((m) => ({ role: m.role, content: m.content }));

  const client = getAnthropic();
  const saved: SavedPref[] = [];

  try {
    // Agentic loop: model chats and may call the save tool; we execute and
    // feed results back until it produces a plain-text reply.
    for (let i = 0; i < 5; i++) {
      const response = await client.messages.create({
        model: MODEL_FAST,
        max_tokens: 1024,
        system,
        tools: [SAVE_TOOL],
        messages,
      });

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );

      if (toolUses.length === 0) {
        const reply = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return NextResponse.json({ reply, saved });
      }

      // Execute each save_preferences call.
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const input = tu.input as {
          preferences?: {
            kind?: string;
            value?: string;
            severity?: string;
          }[];
        };
        const toInsert: {
          user_id: string;
          kind: PreferenceKind;
          value: string;
          severity: string | null;
        }[] = [];

        for (const p of input.preferences ?? []) {
          const kind = p.kind as PreferenceKind;
          const value = (p.value ?? "").trim();
          if (!KINDS.includes(kind) || !value) continue;
          const key = `${kind}|${norm(value)}`;
          if (known.has(key)) continue;
          known.add(key);
          const severity =
            kind === "allergy" && p.severity && SEVERITIES.includes(p.severity)
              ? p.severity
              : null;
          toInsert.push({ user_id: userId, kind, value, severity });
        }

        if (toInsert.length > 0) {
          await supabase.from("food_preferences").insert(toInsert);
          saved.push(
            ...toInsert.map((t) => ({
              kind: t.kind,
              value: t.value,
              severity: t.severity,
            })),
          );
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content:
            toInsert.length > 0
              ? `Saved ${toInsert.length} preference(s).`
              : "No new preferences to save (already known or invalid).",
        });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({
      reply:
        "Got it — I've noted those down! Is there anything else about your tastes you'd like me to know?",
      saved,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Chat failed. Please try again.";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
