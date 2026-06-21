"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Drag-and-drop (or click) image/video uploader. Uploads straight to the
 * Supabase `media` bucket from the browser and reports back the public URL.
 * Designed so a non-technical team member can add a picture in one step.
 */
export default function MediaUpload({
  value,
  onChange,
  folder = "news",
  accept = "image/*",
  label = "Cover image",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  accept?: string;
  label?: string;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVideo = /\.(mp4|webm|mov)$/i.test(value);

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed — please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) upload(file);
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </span>

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-stone-200">
          {isVideo ? (
            <video src={value} controls className="max-h-64 w-full bg-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Upload preview"
              className="max-h-64 w-full object-cover"
            />
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white hover:bg-black/80"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
            dragging
              ? "border-brand-400 bg-brand-50"
              : "border-stone-300 hover:border-stone-400"
          }`}
        >
          <span className="text-2xl">🖼️</span>
          <span className="text-sm font-medium text-stone-700">
            {busy ? "Uploading…" : "Drag a file here, or click to choose"}
          </span>
          <span className="text-xs text-stone-400">
            Images or short videos
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
