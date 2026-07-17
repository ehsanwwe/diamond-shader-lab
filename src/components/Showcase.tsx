"use client";

import { DiamondCanvas } from "./diamond/DiamondCanvas";
import type { MeshSettings, ProceduralSettings } from "./diamond/types";

const proceduralSettings: ProceduralSettings = {
  ior: 2.42,
  brightness: 1,
  contrast: 1.15,
  rainbow: 0.65,
  speed: 0.9,
};

const meshSettings: MeshSettings = {
  ior: 2.42,
  dispersion: 0.045,
  tint: 0,
  brightness: 1,
  rotation: 0.6,
};

export function Showcase() {
  return (
    <>
      <header className="simple-header">
        <h1>Diamond Shader</h1>
      </header>
      <main className="simple-showcase">
        <section className="simple-viewport">
          <DiamondCanvas mode="procedural" settings={proceduralSettings} />
        </section>
        <section className="simple-viewport">
          <DiamondCanvas mode="mesh" settings={meshSettings} />
        </section>
      </main>
    </>
  );
}
