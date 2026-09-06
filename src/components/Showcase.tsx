"use client";

import { useRef, useState } from "react";
import { DiamondCanvas, type DiamondCanvasHandle } from "./diamond/DiamondCanvas";
import { TuningPanel } from "./diamond/TuningPanel";
import type { MeshSettings, RingSettings, RingView, StudioSettings } from "./diamond/types";

const meshSettings: MeshSettings = {
  ior: 2.42,
  dispersion: 0.65,
  brightness: 1.5,
  contrast: 1.15,
  glow: 0.8,
};

const studioSettings: StudioSettings = {
  ior: 2.42,
  brightness: 1.05,
  contrast: 1.2,
  specular: 1.2,
  glow: 0.8,
};

const ringSettings: RingSettings = {
  ior: 2.42,
  dispersion: 0.65,
  brightness: 1.66,
  contrast: 1.11,
  highlight: 3.36,
  glow: 0.07,
  flare: 0.01,
  flareSize: 0.75,
  rotation: 1.2,
  autoRotate: false,
  azimuth: 119.16,
  polar: 60.13,
  zoom: 0.59,
};

export function Showcase() {
  const [ring, setRing] = useState<RingSettings>(ringSettings);
  const [view, setView] = useState<RingView>(ringSettings);
  const ringCanvas = useRef<DiamondCanvasHandle>(null);

  return (
    <>
      <header className="simple-header">
        <h1>Diamond Shader</h1>
      </header>
      <main className="simple-showcase">
        <section className="simple-viewport">
          <DiamondCanvas mode="mesh" settings={meshSettings} />
        </section>
        <section className="simple-viewport">
          <DiamondCanvas mode="studio" settings={studioSettings} />
        </section>
        <section className="simple-viewport">
          <DiamondCanvas ref={ringCanvas} mode="ring" settings={ring} onView={setView} />
        </section>
      </main>
      <TuningPanel
        value={ring}
        view={view}
        defaults={ringSettings}
        onChange={setRing}
        onResetView={() => ringCanvas.current?.setView(ringSettings)}
      />
    </>
  );
}
