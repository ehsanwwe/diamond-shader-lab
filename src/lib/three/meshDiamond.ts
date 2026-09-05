import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { ConvexHull } from "three/examples/jsm/math/ConvexHull.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { assetPath } from "@/lib/assets/path";
import { fullscreenVertex, hullFragment, MAX_PLANES } from "@/shaders/hullDiamond";
import { fitRenderer, lifecycle, rendererFor } from "./common";
import type { MeshSettings } from "@/components/diamond/types";

// Extract the facet planes of a point set's convex hull, merging coplanar faces.
// Returns a flat [nx,ny,nz,offset, ...] array (offset = dot(normal, point) on the face).
export function hullPlanes(points: THREE.Vector3[]): { data: Float32Array; count: number } {
  const hull = new ConvexHull().setFromPoints(points);
  const planes: { n: THREE.Vector3; d: number }[] = [];
  for (const face of hull.faces) {
    const n = face.normal; // outward unit normal
    const d = n.dot(face.edge.head().point); // signed distance of the face plane
    let merged = false;
    for (const p of planes) {
      if (p.n.dot(n) > 0.985 && Math.abs(p.d - d) < 0.03) {
        merged = true;
        break;
      }
    }
    if (!merged) planes.push({ n: n.clone(), d });
  }
  const count = Math.min(planes.length, MAX_PLANES);
  const data = new Float32Array(MAX_PLANES * 4);
  for (let i = 0; i < count; i++) {
    data[i * 4] = planes[i].n.x;
    data[i * 4 + 1] = planes[i].n.y;
    data[i * 4 + 2] = planes[i].n.z;
    data[i * 4 + 3] = planes[i].d;
  }
  return { data, count };
}

export function createMeshDiamond(
  canvas: HTMLCanvasElement,
  get: () => MeshSettings | object,
  onReady: () => void,
  onError: () => void,
) {
  const renderer = rendererFor(canvas),
    scene = new THREE.Scene(),
    quadCam = new THREE.Camera(), // renders the fullscreen quad
    camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100); // drives the rays
  // near-top-down onto the table/crown, matching the mesh-less box's framing
  camera.position.set(0, 3.9, 1.5);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 2.4;
  controls.maxDistance = 9;
  controls.enablePan = false;

  const uniforms = {
    uEnvironment: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uCamPos: { value: new THREE.Vector3() },
    uInvViewProj: { value: new THREE.Matrix4() },
    uIor: { value: 2.42 },
    uDispersion: { value: 0.8 },
    uExposure: { value: 1.5 },
    uContrast: { value: 1.15 },
    // flat grey backdrop, LINEAR (sRGB-encoded by the output pass ~= light grey)
    uBackground: { value: 0.62 },
    uPlaneCount: { value: 0 },
    uPlanes: { value: new Float32Array(MAX_PLANES * 4) },
    uEnvRot: { value: new THREE.Matrix3() }, // identity: planes already live in world space
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertex,
    fragmentShader: hullFragment,
    uniforms,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));

  // HDR post pipeline: trace -> bloom (glow + glare) -> sRGB output -> FXAA
  const hdrTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
  });
  const composer = new EffectComposer(renderer, hdrTarget);
  composer.addPass(new RenderPass(scene, quadCam));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    0.8, // strength (glow) — overridden per frame
    0.5, // radius
    0.85, // threshold — only near-white glints glare, not the grey backdrop
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const fxaa = new ShaderPass(FXAAShader);
  composer.addPass(fxaa);

  let environment: THREE.Texture | undefined;
  const ready = { env: false, model: false };
  const maybeReady = () => {
    if (ready.env && ready.model) onReady();
  };
  new RGBELoader().load(
    assetPath("environments/afrikaans-church-interior-2k.hdr"),
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      environment = texture;
      uniforms.uEnvironment.value = texture;
      ready.env = true;
      maybeReady();
    },
    undefined,
    onError,
  );

  new GLTFLoader().load(
    assetPath("models/math-diamond.gltf"),
    (g) => {
      let found: THREE.Mesh | undefined;
      g.scene.traverse((o) => {
        if (o instanceof THREE.Mesh && !found) found = o;
      });
      if (!found) {
        onError();
        return;
      }
      // read positions, center on the bounding box, scale to a ~unit radius
      const pos = found.geometry.getAttribute("position");
      const raw: THREE.Vector3[] = [];
      for (let i = 0; i < pos.count; i++)
        raw.push(new THREE.Vector3().fromBufferAttribute(pos, i));
      const box = new THREE.Box3().setFromPoints(raw);
      const center = box.getCenter(new THREE.Vector3());
      let maxLen = 0;
      const pts = raw.map((v) => {
        const p = v.sub(center);
        maxLen = Math.max(maxLen, p.length());
        return p;
      });
      const scale = 1 / (maxLen || 1);
      for (const p of pts) p.multiplyScalar(scale);
      const { data, count } = hullPlanes(pts);
      uniforms.uPlanes.value.set(data);
      uniforms.uPlaneCount.value = count;
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
    uniforms.uResolution.value.set(w * dpr, h * dpr);
    composer.setSize(w, h); // multiplies by renderer pixel ratio internally
    bloom.setSize(w * dpr, h * dpr);
    fxaa.material.uniforms.resolution.value.set(1 / (w * dpr), 1 / (h * dpr));
  };
  resize();

  const viewProj = new THREE.Matrix4();
  const stop = lifecycle(
    renderer,
    canvas,
    () => {
      const s = get() as MeshSettings;
      uniforms.uIor.value = s.ior;
      uniforms.uDispersion.value = s.dispersion;
      uniforms.uExposure.value = s.brightness;
      uniforms.uContrast.value = s.contrast;
      bloom.strength = s.glow;
      controls.update();
      camera.updateMatrixWorld();
      uniforms.uCamPos.value.copy(camera.position);
      viewProj.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      uniforms.uInvViewProj.value.copy(viewProj).invert();
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
      geometry.dispose();
      environment?.dispose();
      material.dispose();
    },
  };
}
