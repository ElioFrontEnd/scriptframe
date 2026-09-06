"use client";

import { useRef, useState } from "react";
import { STYLE_PRESETS } from "@/lib/styles";
import { LIMITS } from "@/lib/config";
import StyleSwatch from "@/components/StyleSwatch";

export type CustomStyle = {
  id: string;
  name: string;
  block: string;
  guidance: string;
  swatch: string[];
  texture: string;
  referenceUrl?: string | null;
};

export type StyleChoice =
  | { kind: "preset"; id: string }
  | { kind: "custom"; id: string };

/**
 * Downscales in the browser before upload.
 *
 * A phone photo is several megabytes; the vision model needs none of that
 * resolution to describe a technique, and Vercel caps request bodies well
 * below it. A 1024px JPEG is typically under 200KB and reads identically.
 */
async function downscale(file: File): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LIMITS.referenceMaxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: dataUrl.split(",")[1], mimeType: "image/jpeg" };
}

export default function StylePicker({
  value,
  onChange,
  initialCustom,
  previews = {},
}: {
  value: StyleChoice;
  onChange: (choice: StyleChoice, style?: CustomStyle) => void;
  initialCustom: CustomStyle[];
  /** Rendered preset previews by style id; falls back to the palette panel. */
  previews?: Record<string, string>;
}) {
  const [tab, setTab] = useState<"preset" | "custom">(
    value.kind === "custom" || initialCustom.length > 0 ? "custom" : "preset",
  );
  const [styles, setStyles] = useState<CustomStyle[]>(initialCustom);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = styles.find((s) => value.kind === "custom" && s.id === value.id);

  async function upload(file: File) {
    setError("");

    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Use a JPEG, PNG or WebP.");
      return;
    }

    setBusy(true);
    try {
      const { base64, mimeType } = await downscale(file);
      const res = await fetch("/api/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not analyse that image");

      const created: CustomStyle = { ...body.style, referenceUrl: body.referenceUrl };
      setStyles((prev) => [created, ...prev]);
      onChange({ kind: "custom", id: created.id }, created);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveBlock(id: string) {
    const res = await fetch(`/api/styles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block: draft }),
    });
    if (res.ok) {
      setStyles((prev) =>
        prev.map((s) => (s.id === id ? { ...s, block: draft } : s)),
      );
    }
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this style? Projects already made with it keep their look."))
      return;
    await fetch(`/api/styles/${id}`, { method: "DELETE" });
    setStyles((prev) => prev.filter((s) => s.id !== id));
    if (value.kind === "custom" && value.id === id) {
      onChange({ kind: "preset", id: STYLE_PRESETS[0].id });
      setTab("preset");
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="label mb-0">Style</span>
        <div
          className="flex rounded-[8px] border border-[var(--line)] p-0.5"
          role="tablist"
        >
          {(["preset", "custom"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-[6px] px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                tab === t
                  ? "bg-[var(--paper-sunk)] text-[var(--ink)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t === "preset" ? "Presets" : "Your reference"}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------ presets */}
      {tab === "preset" && (
        <div className="grid grid-cols-2 gap-2.5">
          {STYLE_PRESETS.map((s) => {
            const isOn = value.kind === "preset" && value.id === s.id;
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => onChange({ kind: "preset", id: s.id })}
                aria-pressed={isOn}
                title={s.blurb}
                className={`overflow-hidden rounded-[10px] border text-left transition-all duration-150 ${
                  isOn
                    ? "border-[var(--clay)] shadow-[var(--lift-1)] ring-1 ring-[var(--clay)]"
                    : "border-[var(--line)] hover:border-[var(--line-strong)]"
                }`}
              >
                {previews[s.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previews[s.id]}
                    alt=""
                    loading="lazy"
                    className="aspect-[16/9] w-full bg-[var(--paper-sunk)] object-cover"
                  />
                ) : (
                  <StyleSwatch style={s} className="aspect-[16/9] w-full" />
                )}
                <span className="block px-2.5 py-2 text-[12.5px] font-medium leading-tight">
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- custom */}
      {tab === "custom" && (
        <div className="space-y-3">
          <label
            className={`flex cursor-pointer flex-col items-center rounded-[10px] border border-dashed px-4 py-6 text-center transition-colors ${
              busy
                ? "border-[var(--line)] opacity-60"
                : "border-[var(--line-strong)] hover:border-[var(--clay)] hover:bg-[var(--paper-sunk)]"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file && !busy) upload(file);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
              }}
            />
            <span className="text-[14px] font-medium">
              {busy ? "Reading the style…" : "Drop an image, or click to choose"}
            </span>
            <span className="hint mt-1 max-w-xs text-[12.5px]">
              {busy
                ? "This takes a few seconds."
                : "One frame in the look you want. We describe how it's drawn — the picture itself is never copied."}
            </span>
          </label>

          {error && (
            <p className="rounded-[8px] bg-[var(--bad-soft)] px-3 py-2 text-[12.5px] text-[var(--bad)]">
              {error}
            </p>
          )}

          {styles.length === 0 && !busy && (
            <p className="hint text-[12.5px]">
              Styles you make show up here and can be reused on every project.
            </p>
          )}

          {styles.map((s) => {
            const isOn = value.kind === "custom" && value.id === s.id;
            return (
              <div
                key={s.id}
                className={`overflow-hidden rounded-[10px] border transition-colors ${
                  isOn ? "border-[var(--clay)] ring-1 ring-[var(--clay)]" : "border-[var(--line)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onChange({ kind: "custom", id: s.id }, s)}
                  className="flex w-full items-center gap-3 p-2.5 text-left"
                >
                  {s.referenceUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.referenceUrl}
                      alt=""
                      className="h-11 w-16 shrink-0 rounded-[6px] object-cover"
                    />
                  ) : (
                    <StyleSwatch
                      style={{
                        swatch: [s.swatch[0], s.swatch[1], s.swatch[2]] as [string, string, string],
                        texture: s.texture as never,
                      }}
                      className="h-11 w-16 shrink-0 rounded-[6px]"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">
                      {s.name}
                    </span>
                    <span className="clamp-1 block text-[12px] text-[var(--ink-faint)]">
                      {s.block}
                    </span>
                  </span>
                </button>

                {isOn && (
                  <div className="border-t border-[var(--line)] bg-[var(--paper-sunk)] p-3">
                    {editing === s.id ? (
                      <>
                        <textarea
                          className="field min-h-[130px] resize-y font-mono text-[12px] leading-relaxed"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveBlock(s.id)}
                            className="btn-primary btn-sm"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="btn-secondary btn-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-mono text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
                          {s.block}
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(s.id);
                              setDraft(s.block);
                            }}
                            className="btn-quiet"
                          >
                            Edit description
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(s.id)}
                            className="btn-quiet"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {selected && (
            <p className="hint text-[12.5px]">
              This description is what every prompt carries. Tweak it if the look
              isn&apos;t quite right — that&apos;s faster than uploading another
              reference.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
