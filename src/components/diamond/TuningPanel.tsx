"use client";

import { useEffect, useState } from "react";
import type { RingSettings } from "./types";

type Field = { key: keyof RingSettings; label: string; min: number; max: number; step: number };

const fields: Field[] = [
  { key: "brightness", label: "Brightness", min: 0.5, max: 3, step: 0.01 },
  { key: "contrast", label: "Contrast", min: 0.8, max: 2.2, step: 0.01 },
  { key: "highlight", label: "Highlight", min: 0, max: 4, step: 0.01 },
  { key: "glow", label: "Glow", min: 0, max: 1.5, step: 0.01 },
  { key: "flare", label: "Lens flare", min: 0, max: 1.5, step: 0.01 },
];

// The text under the sliders is meant to be pasted back into chat: it is the
// exact object literal that goes into ringSettings in Showcase.tsx.
export function settingsText(s: RingSettings): string {
  const keys = Object.keys(s) as (keyof RingSettings)[];
  return `ringSettings = { ${keys.map((k) => `${k}: ${s[k]}`).join(", ")} }`;
}

export function TuningPanel({
  value,
  defaults,
  onChange,
}: {
  value: RingSettings;
  defaults: RingSettings;
  onChange: (next: RingSettings) => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = settingsText(value);

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
        <button type="button" onClick={() => onChange(defaults)}>Reset</button>
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
      <textarea
        className="tuning-text"
        readOnly
        value={text}
        rows={3}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button type="button" className="tuning-copy" onClick={copy}>
        {copied ? "Copied" : "Copy settings"}
      </button>
    </aside>
  );
}
