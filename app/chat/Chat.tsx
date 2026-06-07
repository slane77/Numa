"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string };
type SavedPref = { kind: string; value: string; severity: string | null };

const GREETING =
  "Hi! I'm Numa. I'd love to get to know your tastes so I can plan meals you'll actually enjoy. To start — what are a few foods or cuisines you really love?";

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedPref[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || "…" },
      ]);
      if (Array.isArray(data.saved) && data.saved.length > 0) {
        setSaved((s) => [...s, ...data.saved]);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      // iOS Safari reports a failed fetch as "Load failed"; make it human.
      const friendly =
        /load failed|failed to fetch|networkerror/i.test(raw)
          ? "Couldn't reach Numa's AI. It may not be configured yet (missing API key / credit) or the request timed out. Please try again."
          : raw;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex h-[60vh] flex-col rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-stone-100 text-stone-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-stone-100 px-4 py-2 text-sm text-stone-400">
                Numa is typing…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-stone-200 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Type a message…"
              className="max-h-32 flex-1 resize-none rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {saved.length > 0 && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-700">
              Saved this chat ({saved.length})
            </h2>
            <Link
              href="/preferences"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              View all →
            </Link>
          </div>
          <ul className="flex flex-wrap gap-2">
            {saved.map((p, i) => (
              <li
                key={i}
                className="rounded-full border border-brand-200 bg-white px-3 py-1 text-sm text-stone-700"
              >
                <span className="text-stone-400">{p.kind}:</span> {p.value}
                {p.severity && (
                  <span className="ml-1 text-red-600">({p.severity})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
