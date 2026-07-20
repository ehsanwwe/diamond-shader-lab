import * as THREE from "three";
import { fitRenderer, lifecycle, rendererFor } from "./common";
import { fullscreenVertex, studioFragment } from "@/shaders/studio";
import type { StudioSettings } from "@/components/diamond/types";
import { assetPath } from "@/lib/assets/path";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

export function createStudioDiamond(
  canvas: HTMLCanvasElement,
  get: () => StudioSettings | object,
  onReady: () => void,
  onError: () => void,
) {
  const renderer = rendererFor(canvas),
    scene = new THREE.Scene(),
    camera = new THREE.Camera();
  // orbit state: x = yaw, y = pitch (clamped), plus zoom distance
  const orbit = new THREE.Vector2(0.7, 0.5),
    orbitTarget = orbit.clone();
  let distance = 4.6,
    distanceTarget = 4.6;
  // camera constants must match the shader (focal length + gem bounding radius).
  // We keep the camera far enough that the gem's bounding sphere always fits the
  // frame with margin — so nothing clips at any rotation angle or zoom level.
  const FOCAL = 2.7,
    GEM_RADIUS = 0.95,
    FIT_MARGIN = 0.85;
  let minDistance = 4.6,
    maxDistance = 9;
  const uniforms = {
    uEnvironment: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2() },
    uOrbit: { value: orbit },
    uTime: { value: 0 },
    uIor: { value: 2.42 },
    uBrightness: { value: 1 },
    uContrast: { value: 1.15 },
    uSpecular: { value: 1 },
    uDistance: { value: distance },
    // flat light-grey backdrop (linear; sRGB-encoded by the output pass ~= #d0d0d0)
    uBackground: { value: 0.62 },
    // darkest refraction floor: ~0.2 sRGB grey == 80% black, never pure black
    uRefractFloor: { value: 0.03 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertex,
    fragmentShader: studioFragment,
    uniforms,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));

  // HDR post pipeline: raymarch -> bloom (glow + glare) -> sRGB output -> FXAA (anti-alias)
  const hdrTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
  });
  const composer = new EffectComposer(renderer, hdrTarget);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    0.7, // strength (glow) — overridden per frame from settings
    0.6, // radius (spreads the glare)
    0.72, // threshold — above the grey backdrop, so only bright glints glow
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(fxaa);

  let environment: THREE.Texture | undefined;
  new RGBELoader().load(
    assetPath("environments/afrikaans-church-interior-2k.hdr"),
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      environment = texture;
      uniforms.uEnvironment.value = texture;
      onReady();
    },
    undefined,
    onError,
  );

  // free orbit: drag to rotate around the gem, wheel / pinch to zoom
  let dragging = false;
  const last = new THREE.Vector2();
  const PITCH_LIMIT = 1.553; // ~89deg — full top/bottom views, basis stays pole-stable
  const down = (e: PointerEvent) => {
    dragging = true;
    last.set(e.clientX, e.clientY);
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    orbitTarget.x -= (e.clientX - last.x) * 0.008;
    orbitTarget.y = Math.max(
      -PITCH_LIMIT,
      Math.min(PITCH_LIMIT, orbitTarget.y + (e.clientY - last.y) * 0.008),
    );
    last.set(e.clientX, e.clientY);
  };
  const up = () => (dragging = false);
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    distanceTarget = Math.max(
      minDistance,
      Math.min(maxDistance, distanceTarget + e.deltaY * 0.0025),
    );
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("wheel", wheel, { passive: false });

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const resize = () => {
    const { w, h, dpr } = fitRenderer(renderer, canvas);
    uniforms.uResolution.value.set(w * dpr, h * dpr);
    composer.setSize(w, h); // multiplies by renderer pixel ratio internally
    bloom.setSize(w * dpr, h * dpr);
    fxaa.material.uniforms.resolution.value.set(1 / (w * dpr), 1 / (h * dpr));
    // The shader's uv spans ±(w/h) horizontally and ±1 vertically. Whichever is
    // smaller limits how big the gem may appear, so fit against that extent.
    const frameHalfMin = Math.min(w / h, 1);
    minDistance = Math.sqrt(
      GEM_RADIUS * GEM_RADIUS +
        Math.pow((FOCAL * GEM_RADIUS) / (FIT_MARGIN * frameHalfMin), 2),
    );
    maxDistance = Math.max(9, minDistance * 1.8);
    distanceTarget = Math.max(minDistance, Math.min(maxDistance, distanceTarget));
  };
  resize();
  // start framed to fit the current viewport
  distance = distanceTarget = minDistance;
  const stop = lifecycle(
    renderer,
    canvas,
    (t) => {
      const s = get() as StudioSettings;
      // gentle auto-orbit when idle so the sparkle stays alive
      if (!dragging && !reduced) orbitTarget.x += 0.0016;
      orbit.lerp(orbitTarget, 0.1);
      distance += (distanceTarget - distance) * 0.1;
      uniforms.uTime.value = reduced ? 0 : t * 0.001;
      uniforms.uDistance.value = distance;
      uniforms.uIor.value = s.ior;
      uniforms.uBrightness.value = s.brightness;
      uniforms.uContrast.value = s.contrast;
      uniforms.uSpecular.value = s.specular;
      bloom.strength = s.glow;
      composer.render();
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
      canvas.removeEventListener("wheel", wheel);
      composer.dispose();
      hdrTarget.dispose();
      geometry.dispose();
      environment?.dispose();
      material.dispose();
    },
  };
}
