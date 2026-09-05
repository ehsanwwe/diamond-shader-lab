"use client";

import { DiamondCanvas } from "./diamond/DiamondCanvas";
import type { MeshSettings, RingSettings, StudioSettings } from "./diamond/types";

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
  brightness: 1.5,
  contrast: 1.15,
  glow: 0.35,
  rotation: 1.2,
};

export function Showcase() {
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
          <DiamondCanvas mode="ring" settings={ringSettings} />
        </section>
      </main>
    </>
  );
}
