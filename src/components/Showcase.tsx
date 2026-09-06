"use client";

import { RingCanvas } from "./diamond/RingCanvas";
import type { RingSettings } from "./diamond/types";

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
  autoRotate: true,
  azimuth: 119.16,
  polar: 60.13,
  zoom: 0.82,
};

export function Showcase() {
  return (
    <main className="ring-page">
      <RingCanvas settings={ringSettings} />
      <p className="copyright">© {new Date().getFullYear()} Ehsan Moradi</p>
    </main>
  );
}
