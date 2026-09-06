# Diamond Ring

[Live demo](https://ehsanwwe.github.io/diamond-shader/) — a silver halo diamond ring rendered in real time with Three.js. The ring is modelled in Blender by `scripts/blender_diamond_ring.py` (open `diamond_ring.blend`, or run it headless with `blender -b diamond_ring.blend -P scripts/blender_diamond_ring.py`) and exported to `public/models/diamond-ring.glb`. Every stone is an instance of the brilliant-cut diamond in `public/models/math-diamond.gltf`, built by `scripts/blender_math_diamond.py`.

In the browser the silver is a PBR metal and each stone is shaded by an analytic convex-hull ray tracer written in GLSL: Fresnel reflection, refraction, up to five internal bounces and RGB dispersion, lit by a 360° HDR church environment. Bloom and a lens-flare pass add the sparkle. Drag to orbit, wheel to zoom.

The project is a static Next.js export: `npm install`, then `npm run dev` or `npm run build`.
