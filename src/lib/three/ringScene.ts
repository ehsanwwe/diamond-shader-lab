import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { assetPath } from "@/lib/assets/path";
import { MAX_PLANES, stoneFragment, stoneVertex } from "@/shaders/hullDiamond";
import { FlareShader } from "@/shaders/flare";
import { fitRenderer, lifecycle, rendererFor } from "./common";
import { hullPlanes } from "./meshDiamond";
import type { RingSettings, RingView } from "@/components/diamond/types";

// Used for any key missing from the settings object (e.g. stale state after a hot
// reload added a new key) so a missing number never reaches a uniform as NaN.
const FALLBACK: RingSettings = {
  ior: 2.42,
  dispersion: 0.65,
  brightness: 1.43,
  contrast: 1.09,
  highlight: 2.18,
  glow: 0.04,
  flare: 0.01,
  flareSize: 1,
  rotation: 1.2,
  autoRotate: true,
  azimuth: 38,
  polar: 62,
  zoom: 1,
};

export type RingInstance = {
  dispose(): void;
  getView(): RingView;
  setView(view: RingView): void;
};

// Silver ring with a halo-set centre stone, pavé halo and shoulder stones.
// The geometry comes from Blender (scripts/blender_diamond_ring.py); every stone
// is an instance of the project's exact math diamond (public/models/math-diamond.gltf).
// The stones are shaded by the same analytic hull tracer as the first box (Fresnel,
// multi-bounce total internal reflection, dispersion), run per stone in its local
// space; the silver is a PBR metal lit by the same HDR environment. Post: bloom for
// the glints, lens-flare streaks, sRGB output, FXAA.
export function createRingScene(
  canvas: HTMLCanvasElement,
  get: () => RingSettings | object,
  onReady: () => void,
  onError: () => void,
): RingInstance {
  const settings = () => ({ ...FALLBACK, ...(get() as Partial<RingSettings>) });
  const renderer = rendererFor(canvas);
  // the HDR windows reflected in the metal go far above 1; ACES keeps them from clipping
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene();
  // same flat light-grey backdrop as the other boxes (linear 0.62)
  scene.background = new THREE.Color().setRGB(0.62, 0.62, 0.62, THREE.LinearSRGBColorSpace);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;

  // camera framing: fitDist is the distance at which the ring's bounding sphere
  // fills the viewport; the view (azimuth / polar / zoom) is expressed relative to it
  const bounds = new THREE.Sphere(new THREE.Vector3(0, 0.2, 0), 1.5);
  let fitDist = 6;
  const spherical = new THREE.Spherical();
  const applyView = (v: RingView) => {
    spherical.set(
      fitDist * Math.max(v.zoom, 0.05),
      THREE.MathUtils.degToRad(THREE.MathUtils.clamp(v.polar, 1, 179)),
      THREE.MathUtils.degToRad(v.azimuth),
    );
    camera.position.setFromSpherical(spherical).add(controls.target);
    controls.update();
  };
  const fit = () => {
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const next = (bounds.radius * 1.08) / Math.tan(halfFov) / Math.min(camera.aspect, 1);
    const scale = next / fitDist;
    fitDist = next;
    controls.target.copy(bounds.center);
    // keep the current direction, only rescale the distance
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(scale);
    camera.position.copy(controls.target).add(offset);
    controls.minDistance = fitDist * 0.45;
    controls.maxDistance = fitDist * 2.2;
  };
  applyView(settings());

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 5, 2);
  const rim = new THREE.DirectionalLight(0xffffff, 0.7);
  rim.position.set(-3, 2, -3);
  scene.add(key, rim);

  const silver = new THREE.MeshStandardMaterial({
    color: 0xf4f4f2,
    metalness: 1,
    roughness: 0.18,
    envMapIntensity: 1,
  });
  // one tracer material for all stones; per-stone uniforms are set in onBeforeRender
  const stoneUniforms = {
    uEnvironment: { value: null as THREE.Texture | null },
    uLocalCam: { value: new THREE.Vector3() },
    uEnvRot: { value: new THREE.Matrix3() },
    uIor: { value: FALLBACK.ior },
    uDispersion: { value: FALLBACK.dispersion },
    uExposure: { value: FALLBACK.brightness },
    uContrast: { value: FALLBACK.contrast },
    uHighlight: { value: FALLBACK.highlight },
    uPlaneCount: { value: 0 },
    uPlanes: { value: new Float32Array(MAX_PLANES * 4) },
  };
  const stone = new THREE.ShaderMaterial({
    vertexShader: stoneVertex,
    fragmentShader: stoneFragment,
    uniforms: stoneUniforms,
  });
  const invModel = new THREE.Matrix4();
  const stoneBeforeRender = (mesh: THREE.Object3D) => {
    // The material is shared: three.js only re-uploads uniforms when the material
    // changes between draws, so consecutive stones would reuse the previous stone's
    // camera. Force the upload for every stone.
    stone.uniformsNeedUpdate = true;
    invModel.copy(mesh.matrixWorld).invert();
    stoneUniforms.uLocalCam.value.copy(camera.position).applyMatrix4(invModel);
    // local -> world rotation (stones are uniformly scaled, so normalising the columns is enough)
    const m = stoneUniforms.uEnvRot.value.setFromMatrix4(mesh.matrixWorld).elements;
    for (let c = 0; c < 9; c += 3) {
      const l = Math.hypot(m[c], m[c + 1], m[c + 2]) || 1;
      m[c] /= l;
      m[c + 1] /= l;
      m[c + 2] /= l;
    }
  };

  // HDR post pipeline: render -> bloom (glints) -> lens flare -> sRGB output -> FXAA
  const hdrTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, hdrTarget);
  composer.addPass(new RenderPass(scene, camera));
  // threshold above 1 (linear HDR): only the brightest glints glare, silver and backdrop stay clean
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.25, 1.3);
  composer.addPass(bloom);
  // lens flare: four-point star streaks radiating from the brightest glints (HDR, before output)
  const flare = new ShaderPass(FlareShader);
  composer.addPass(flare);
  composer.addPass(new OutputPass());
  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(fxaa);

  const ready = { env: false, model: false };
  const maybeReady = () => {
    if (ready.env && ready.model) onReady();
  };

  let environment: THREE.Texture | undefined;
  let envTarget: THREE.WebGLRenderTarget | undefined;
  const pmrem = new THREE.PMREMGenerator(renderer);
  new RGBELoader().load(
    assetPath("environments/afrikaans-church-interior-2k.hdr"),
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      environment = texture;
      stoneUniforms.uEnvironment.value = texture; // equirect for the tracer
      envTarget = pmrem.fromEquirectangular(texture); // prefiltered for the metal
      pmrem.dispose();
      scene.environment = envTarget.texture;
      ready.env = true;
      maybeReady();
    },
    undefined,
    onError,
  );

  let model: THREE.Group | undefined;
  new GLTFLoader().load(
    assetPath("models/diamond-ring.glb"),
    (g) => {
      const loaded: THREE.Material[] = [];
      let planesReady = false;
      g.scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const m = o.material as THREE.Material;
        if (!loaded.includes(m)) loaded.push(m);
        if (/diamond/i.test(m.name)) {
          o.material = stone;
          o.onBeforeRender = () => stoneBeforeRender(o);
          if (!planesReady) {
            // every stone instances the same hull, so the facet planes are computed once
            const pos = o.geometry.getAttribute("position");
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i < pos.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i));
            const { data, count } = hullPlanes(pts);
            stoneUniforms.uPlanes.value.set(data);
            stoneUniforms.uPlaneCount.value = count;
            planesReady = true;
          }
        } else {
          o.material = silver;
        }
      });
      for (const m of loaded) m.dispose(); // Blender's exported materials are replaced
      if (!planesReady) {
        onError();
        return;
      }
      model = g.scene;
      scene.add(model);
      new THREE.Box3().setFromObject(model).getBoundingSphere(bounds);
      fit();
      applyView(settings()); // start from the configured view once the real bounds are known
      ready.model = true;
      maybeReady();
    },
    undefined,
    onError,
  );

  const resize = () => {
    const { w, h, dpr } = fitRenderer(renderer, canvas);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fit();
    composer.setSize(w, h);
    bloom.setSize(w * dpr, h * dpr);
    flare.material.uniforms.uTexel.value.set(1 / (w * dpr), 1 / (h * dpr));
    fxaa.material.uniforms.resolution.value.set(1 / (w * dpr), 1 / (h * dpr));
  };
  resize();

  const view: RingView = { azimuth: FALLBACK.azimuth, polar: FALLBACK.polar, zoom: 1 };
  const stop = lifecycle(
    renderer,
    canvas,
    () => {
      const s = settings();
      stoneUniforms.uIor.value = s.ior;
      stoneUniforms.uDispersion.value = s.dispersion;
      stoneUniforms.uExposure.value = s.brightness;
      stoneUniforms.uContrast.value = s.contrast;
      stoneUniforms.uHighlight.value = s.highlight;
      silver.envMapIntensity = 0.7 * s.brightness;
      bloom.strength = s.glow;
      flare.material.uniforms.uFlare.value = s.flare;
      flare.material.uniforms.uLength.value = s.flareSize; // pixel step between streak taps
      controls.autoRotate = s.autoRotate;
      controls.autoRotateSpeed = s.rotation;
      controls.update();
      view.azimuth = THREE.MathUtils.radToDeg(controls.getAzimuthalAngle());
      view.polar = THREE.MathUtils.radToDeg(controls.getPolarAngle());
      view.zoom = camera.position.distanceTo(controls.target) / fitDist;
      composer.render();
    },
    resize,
    onError,
  );
  return {
    getView: () => ({ ...view }),
    setView: applyView,
    dispose() {
      stop();
      controls.dispose();
      composer.dispose();
      hdrTarget.dispose();
      envTarget?.dispose();
      environment?.dispose();
      model?.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      silver.dispose();
      stone.dispose();
    },
  };
}
