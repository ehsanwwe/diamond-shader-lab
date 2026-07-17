import * as THREE from "three";
import { fitRenderer, lifecycle, rendererFor } from "./common";
import { fullscreenVertex, proceduralFragment } from "@/shaders/procedural";
import type { ProceduralSettings } from "@/components/diamond/types";
import { assetPath } from "@/lib/assets/path";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
export function createProceduralDiamond(
  canvas: HTMLCanvasElement,
  get: () => ProceduralSettings | object,
  onReady: () => void,
  onError: () => void,
) {
  const renderer = rendererFor(canvas),
    scene = new THREE.Scene(),
    camera = new THREE.Camera(),
    pointer = new THREE.Vector2(0.35, -0.15),
    target = pointer.clone();
  const uniforms = {
    uEnvironment: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2() },
    uPointer: { value: pointer },
    uTime: { value: 0 },
    uIor: { value: 2.42 },
    uBrightness: { value: 1 },
    uContrast: { value: 1.15 },
    uRainbow: { value: 0.65 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertex,
    fragmentShader: proceduralFragment,
    uniforms,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));
  let environment: THREE.Texture | undefined;
  new RGBELoader().load(
    assetPath("environments/afrikaans-church-interior-2k.hdr"),
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      environment = texture;
      uniforms.uEnvironment.value = texture;
      scene.background = texture;
      onReady();
    },
    undefined,
    onError,
  );
  let dragging = false,
    last = new THREE.Vector2();
  const down = (e: PointerEvent) => {
    dragging = true;
    last.set(e.clientX, e.clientY);
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    target.x += (e.clientX - last.x) * 0.008;
    target.y = Math.max(
      -1.2,
      Math.min(1.2, target.y + (e.clientY - last.y) * 0.008),
    );
    last.set(e.clientX, e.clientY);
  };
  const up = () => (dragging = false);
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const resize = () => {
    const { w, h, dpr } = fitRenderer(renderer, canvas);
    uniforms.uResolution.value.set(w * dpr, h * dpr);
  };
  resize();
  const stop = lifecycle(
    renderer,
    canvas,
    (t) => {
      const s = get() as ProceduralSettings;
      if (!dragging && !reduced) target.x += s.speed * 0.00025;
      pointer.lerp(target, 0.09);
      uniforms.uTime.value = reduced ? 0 : t * 0.001 * s.speed;
      uniforms.uIor.value = s.ior;
      uniforms.uBrightness.value = s.brightness;
      uniforms.uContrast.value = s.contrast;
      uniforms.uRainbow.value = s.rainbow;
      renderer.render(scene, camera);
    },
    resize,
    onError,
  );
  return {
    dispose() {
      stop();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      geometry.dispose();
      environment?.dispose();
      material.dispose();
    },
  };
}
