"use client";

import { useEffect, useState } from "react";
import type { RingSettings, RingView } from "./types";

type NumericKey = { [K in keyof RingSettings]: RingSettings[K] extends number ? K : never }[keyof RingSettings];
type Field = { key: NumericKey; label: string; min: number; max: number; step: number };

const fields: Field[] = [
  { key: "brightness", label: "Brightness", min: 0.5, max: 3, step: 0.01 },
  { key: "contrast", label: "Contrast", min: 0.8, max: 2.2, step: 0.01 },
  { key: "highlight", label: "Highlight", min: 0, max: 4, step: 0.01 },
  { key: "glow", label: "Glow", min: 0, max: 1.5, step: 0.01 },
  { key: "flare", label: "Lens flare", min: 0, max: 1.5, step: 0.01 },
  { key: "flareSize", label: "Flare size", min: 0.1, max: 6, step: 0.05 },
];

const round = (n: number) => Number(n.toFixed(2));

// The text under the sliders is meant to be pasted back into chat: it is the
// exact object literal that goes into ringSettings in Showcase.tsx, with the
// live camera (azimuth / polar / zoom) merged in so a view can become the default.
export function settingsText(s: RingSettings, view?: RingView): string {
  const merged: RingSettings = { ...s, ...view };
  const keys = Object.keys(merged) as (keyof RingSettings)[];
  const fmt = (v: number | boolean) => (typeof v === "number" ? round(v) : v);
  return `ringSettings = { ${keys.map((k) => `${k}: ${fmt(merged[k])}`).join(", ")} }`;
}

export function TuningPanel({
  value,
  view,
  defaults,
  onChange,
  onResetView,
}: {
  value: RingSettings;
  view?: RingView;
  defaults: RingSettings;
  onChange: (next: RingSettings) => void;
  onResetView?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = settingsText(value, view);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // clipboard blocked: the textarea below is selectable, the user can copy manually
    }
  };

  return (
    <aside className="tuning" aria-label="ring tuning">
      <div className="tuning-head">
        <strong>Ring tuning</strong>
        <button
          type="button"
          onClick={() => {
            onChange(defaults);
            onResetView?.();
          }}
        >
          Reset
        </button>
      </div>
      {fields.map((f) => (
        <label key={f.key}>
          <span>
            {f.label}
            <output>{(value[f.key] ?? 0).toFixed(2)}</output>
          </span>
          <input
            type="range"
            min={f.min}
            max={f.max}
            step={f.step}
            value={value[f.key] ?? 0}
            onChange={(e) => onChange({ ...value, [f.key]: Number(e.target.value) })}
          />
        </label>
      ))}
      <label className="tuning-check">
        <input
          type="checkbox"
          checked={value.autoRotate ?? true}
          onChange={(e) => onChange({ ...value, autoRotate: e.target.checked })}
        />
        <span>Auto rotate</span>
      </label>
      {view && (
        <p className="tuning-view">
          view: azimuth {round(view.azimuth)}° · polar {round(view.polar)}° · zoom {round(view.zoom)}
        </p>
      )}
      <textarea
        className="tuning-text"
        readOnly
        value={text}
        rows={4}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button type="button" className="tuning-copy" onClick={copy}>
        {copied ? "Copied" : "Copy settings"}
      </button>
    </aside>
  );
}
