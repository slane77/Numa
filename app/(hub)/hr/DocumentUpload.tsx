"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addDocumentMeta } from "./actions";
import { DOC_CATEGORIES } from "@/lib/hr";

/** HR uploads a confidential document to the private bucket, then records it. */
export default function DocumentUpload({ userId }: { userId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(DOC_CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("hr-docs")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      await addDocumentMeta(
        userId,
        title.trim() || file.name,
        category,
        path,
        file.type || null,
      );
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div className="grid gap-3 rounded-xl border border-dashed border-stone-300 p-4 sm:grid-cols-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
        className={inputClass}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={inputClass}
      >
        {DOC_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input ref={fileRef} type="file" className="text-sm sm:col-span-2" />
      {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={upload}
          disabled={busy}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Upload document"}
        </button>
      </div>
    </div>
  );
}
