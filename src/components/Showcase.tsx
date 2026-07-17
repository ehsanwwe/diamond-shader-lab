'use client';
import { useState } from 'react';
import { MeshDiamond } from './diamond/MeshDiamond';
import { ProceduralDiamond } from './diamond/ProceduralDiamond';
import { assetPath } from '@/lib/assets/path';

type Demo = 'mesh' | 'shader';
export function Showcase() {
  const [active, setActive] = useState<Demo>('mesh');
  return <>
    <header className="hero"><nav><a className="wordmark" href="#top">DIAMOND / LAB</a><a href="https://github.com/ehsanwwe" target="_blank" rel="noreferrer">View on GitHub ↗</a></nav><div className="hero-copy" id="top"><p className="eyebrow">A REAL-TIME GEMSTONE STUDY</p><h1>Light, cut<br/>into code.</h1><p className="lede">Two distinct rendering pipelines explore the fire, depth, and precision of a brilliant-cut diamond.</p></div><div className="gem-mark" aria-hidden="true">◇</div></header>
    <main><section className="lab" aria-labelledby="lab-title"><div className="section-head"><div><p className="eyebrow">INTERACTIVE LAB</p><h2 id="lab-title">Choose a technique</h2></div><p>Drag to rotate. Scroll to zoom. Tune the optical character live.</p></div>
      <div className="tabs" role="tablist" aria-label="Diamond rendering technique"><button role="tab" aria-selected={active==='mesh'} onClick={()=>setActive('mesh')}><span>01</span> Mesh + Shader</button><button role="tab" aria-selected={active==='shader'} onClick={()=>setActive('shader')}><span>02</span> Shader Only</button></div>
      <div className="demo-shell" style={{'--studio-background':`url("${assetPath('environments/studio-small-03.jpg')}")`} as React.CSSProperties}>{active === 'mesh' ? <MeshDiamond /> : <ProceduralDiamond />}</div>
    </section><section className="approaches"><p className="eyebrow">TWO PIPELINES · ONE MATERIAL</p><div><article><span>01</span><h3>Geometry informed</h3><p>A supplied brilliant-cut model provides precise silhouettes. A dedicated backface pass feeds world normals into a custom refractive front shader.</p></article><article><span>02</span><h3>Purely procedural</h3><p>A full-screen fragment shader constructs every facet with signed distance fields, then traces reflection, refraction, and spectral dispersion.</p></article></div></section></main>
    <footer><div><span className="wordmark">DIAMOND / LAB</span><p>Built with Three.js, GLSL, and a fascination with light.</p></div><p>© 2026 Ehsan Moradi</p></footer>
  </>;
}
