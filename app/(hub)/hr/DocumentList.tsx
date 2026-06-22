"use client";

import { useState } from "react";
import { getDocumentUrl, deleteDocument } from "./actions";
import { formatDate } from "@/lib/hr";
import type { Tables } from "@/lib/types/database";

export default function DocumentList({
  documents,
  canDelete,
}: {
  documents: Tables<"employee_documents">[];
  canDelete: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function open(path: string, id: string) {
    setBusy(id);
    try {
      const url = await getDocumentUrl(path);
      if (url) window.open(url, "_blank", "noopener");
    } finally {
      setBusy(null);
    }
  }

  if (documents.length === 0) {
    return <p className="text-sm text-stone-500">No documents.</p>;
  }

  return (
    <ul className="space-y-2">
      {documents.map((d) => (
        <li
          key={d.id}
          className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3"
        >
          <div className="text-sm">
            <p className="font-medium text-stone-800">{d.title}</p>
            <p className="text-stone-500">
              {d.category} · {formatDate(d.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => open(d.file_path, d.id)}
              disabled={busy === d.id}
              className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-stone-400 disabled:opacity-60"
            >
              {busy === d.id ? "Opening…" : "Open"}
            </button>
            {canDelete && (
              <form action={deleteDocument}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="user_id" value={d.user_id} />
                <input type="hidden" name="path" value={d.file_path} />
                <button
                  type="submit"
                  className="text-sm text-stone-400 hover:text-red-600"
                >
                  Delete
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
