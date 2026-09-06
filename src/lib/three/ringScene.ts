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
import type { RingSettings } from "@/components/diamond/types";

// Silver ring with a halo-set centre stone, pavé halo and shoulder stones.
// The geometry comes from Blender (scripts/blender_diamond_ring.py); every stone
// is an instance of the project's exact math diamond (public/models/math-diamond.gltf).
// The stones are shaded by the same analytic hull tracer as the first box (Fresnel,
// multi-bounce total internal reflection, dispersion), run per stone in its local
// space; the silver is a PBR metal lit by the same HDR environment. Post: bloom for
// the glints, sRGB output, FXAA.
export function createRingScene(
  canvas: HTMLCanvasElement,
  get: () => RingSettings | object,
  onReady: () => void,
  onError: () => void,
) {
  const renderer = rendererFor(canvas);
  // the HDR windows reflected in the metal go far above 1; ACES keeps them from clipping
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene();
  // same flat light-grey backdrop as the other boxes (linear 0.62)
  scene.background = new THREE.Color().setRGB(0.62, 0.62, 0.62, THREE.LinearSRGBColorSpace);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
  const viewDir = new THREE.Vector3(0.55, 0.48, 0.7).normalize();
  camera.position.copy(viewDir).multiplyScalar(6);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.autoRotate = true;
  // bounding sphere of the loaded ring; the camera is fitted to it on load and resize
  const bounds = new THREE.Sphere(new THREE.Vector3(0, 0.2, 0), 1.5);
  const fit = () => {
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const dist = (bounds.radius * 1.08) / Math.tan(halfFov) / Math.min(camera.aspect, 1);
    controls.target.copy(bounds.center);
    camera.position.copy(bounds.center).addScaledVector(viewDir, dist);
    controls.minDistance = dist * 0.45;
    controls.maxDistance = dist * 2.2;
  };

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
    uIor: { value: 2.42 },
    uDispersion: { value: 0.65 },
    uExposure: { value: 1.5 },
    uContrast: { value: 1.15 },
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

  // HDR post pipeline: render -> bloom (glints) -> sRGB output -> FXAA
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

  const stop = lifecycle(
    renderer,
    canvas,
    () => {
      const s = get() as RingSettings;
      stoneUniforms.uIor.value = s.ior;
      stoneUniforms.uDispersion.value = s.dispersion;
      stoneUniforms.uExposure.value = s.brightness;
      stoneUniforms.uContrast.value = s.contrast;
      silver.envMapIntensity = 0.7 * s.brightness;
      bloom.strength = s.glow;
      flare.material.uniforms.uFlare.value = s.flare;
      controls.autoRotateSpeed = s.rotation;
      controls.update();
      composer.render();
    },
    resize,
    onError,
  );
  return {
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
