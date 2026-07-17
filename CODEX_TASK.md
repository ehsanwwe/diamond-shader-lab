You are rebuilding a legacy Three.js diamond-rendering experiment as a polished, production-quality Next.js static website.

Work directly in the current directory.

The current directory contains a `reference/` folder with the important files from the legacy project. Inspect every file inside `reference/` before writing implementation code.

## Primary objective

Create a modern Next.js + TypeScript + Three.js website containing two separate interactive diamond demos:

1. A mesh-based refractive diamond using `reference/ehsan.gltf` and custom GLSL shaders.
2. A completely shader-only procedural diamond that does not depend on a GLTF model.

The website must export to a standalone static `build/` directory and run without a Node.js server.

The final static output must be suitable for deployment to:

https://ehsanwwe.github.io/

It must also support GitHub project-page subpaths when the repository name is not `ehsanwwe.github.io`.

## Non-negotiable requirements

- Use Next.js with the App Router.
- Use TypeScript in strict mode.
- Use Three.js directly.
- Do not use React Three Fiber unless there is a compelling technical reason.
- Use custom GLSL shaders.
- Produce a fully static export.
- No API routes.
- No server actions.
- No middleware.
- No runtime server dependencies.
- No database.
- No remote CDN dependencies.
- No remote textures or models at runtime.
- Do not require Node.js after the build has completed.
- `npm run build` must leave the deployable static website in `./build`.
- Include a GitHub Pages deployment workflow that deploys `./build`.
- Preserve the entire `reference/` directory as historical source material.
- Do not modify or delete files inside `reference/`.
- Create meaningful Git commits throughout the implementation.
- Finish with a clean Git working tree, except for ignored generated output.
- Run all relevant validation commands before finishing.

## Initial repository handling

Before editing:

1. Inspect the complete directory tree.
2. Read:
   - `reference/main.js`
   - `reference/main2d.js`
   - both Blade templates
   - every GLSL file
   - both GLTF files and their material/node metadata
3. Check `git status`.
4. Never reset or discard pre-existing user changes.
5. If this is not already a Git repository, initialize it with:
   `git init -b main`
6. Use the existing Git identity when available.
7. If no Git identity exists, configure only this repository with:
   - user.name: `Ehsan Moradi`
   - user.email: `ehsanwwe@users.noreply.github.com`

Use npm and commit the generated lockfile.

## Important legacy findings to account for

The legacy implementation contains several issues that must be corrected rather than copied blindly:

- `main.js` creates a `backfaceScene`, but appears to add the cloned backface model to the main scene instead.
- `settings.uColor` is referenced without an explicit initial value.
- Some shader refraction vectors appear to be used before proper initialization.
- The reflected cubemap lookup appears suspicious and should be reviewed.
- There is no robust resize handling.
- Animation loops and WebGL resources are not cleaned up.
- OrbitControls damping is configured but not consistently updated.
- Pointer and touch coordinate handling is incomplete.
- Asset paths are absolute and unsuitable for GitHub project-page subpaths.
- Cubemap image files referenced by the JavaScript are not present in `reference/`.
- `DiamondFragment2d.glsl` is referenced by `main2d.js`, but is missing from the supplied files.

Preserve the original artistic intent while fixing these technical defects.

## Project identity

Use the following branding:

- Product title: `Diamond Shader Lab`
- Subtitle: `Two approaches to real-time gemstone rendering`
- Author: `Ehsan Moradi`
- Default package name: `diamond-shader-lab`
- Default live URL: `https://ehsanwwe.github.io/`

The site language should primarily be English so the project can attract an international GitHub audience.

## Static Next.js configuration

Use the current supported Next.js static-export configuration.

The final configuration must include the equivalent of:

- `output: 'export'`
- `trailingSlash: true`
- static-compatible image behavior
- a deployable output directory named `build`

Prefer the officially supported configuration that writes the static export directly to `build`.

If the installed Next.js version still generates `out`, add a small reliable post-build script that replaces `build` with the completed static export from `out`.

Do not leave two ambiguous deployment outputs.

After a successful build, these should exist:

- `build/index.html`
- `build/404.html`
- `build/_next/`
- `build/.nojekyll`

Add `public/.nojekyll` so it is included in the export.

The generated `build/` directory may be ignored by Git because it is a reproducible artifact, but the final Codex run must execute the build and leave the directory present locally.

## GitHub Pages base-path support

Support both deployment modes:

### User site

Repository:

`ehsanwwe/ehsanwwe.github.io`

URL:

`https://ehsanwwe.github.io/`

In this mode, `basePath` must be empty.

### Project site

Repository example:

`ehsanwwe/diamond-shader-lab`

URL:

`https://ehsanwwe.github.io/diamond-shader-lab/`

In this mode, configure `basePath` and `assetPrefix` correctly.

Determine the repository name from `GITHUB_REPOSITORY` during GitHub Actions builds.

Also allow an explicit environment variable such as `NEXT_PUBLIC_BASE_PATH` to override the detected value.

Create a reusable asset-path helper. Do not scatter hardcoded absolute paths throughout components.

Verify that GLTF files, JavaScript chunks, fonts, metadata assets and links work from a nested base path.

## Application structure

Create a maintainable structure similar to:

- `src/app/`
- `src/components/`
- `src/components/diamond/`
- `src/lib/three/`
- `src/lib/assets/`
- `src/shaders/`
- `public/models/`
- `public/brand/`
- `scripts/`
- `docs/`

The precise structure may differ when justified, but separate rendering code, shaders, UI components, configuration and utilities cleanly.

Do not import the old Blade files into the application.

Copy the required GLTF assets into an appropriate public asset directory while keeping the originals untouched in `reference/`.

Preserve GLSL as readable shader source. Avoid adding fragile raw-loader configuration unless necessary. Exporting GLSL source from typed modules is acceptable.

## Demo 1: Mesh Refraction

Recreate the legacy mesh-based diamond using `reference/ehsan.gltf`.

Requirements:

- Load the GLTF with `GLTFLoader`.
- Locate the mesh or material named `Diamond_main`.
- Fail gracefully if the expected mesh is not found.
- Create a dedicated backface scene.
- Clone the required diamond geometry for the backface pass.
- Render world-space backface normals into a `WebGLRenderTarget`.
- Use the resulting texture in the front-face diamond shader.
- Implement reflection, refraction, Fresnel response and chromatic dispersion.
- Correct uninitialized GLSL variables and invalid vector operations.
- Maintain a premium clear-diamond appearance.
- Add a subtle optional tint control.
- Use OrbitControls with damping.
- Set sensible camera limits.
- Center and frame the model based on its bounding box rather than relying only on magic numbers.
- Add responsive resize handling.
- Recreate the render target when viewport dimensions or DPR change.
- Limit device pixel ratio for performance.
- Pause or reduce rendering when the page is hidden.
- Dispose geometry clones, materials, controls, render targets and renderer resources during cleanup.
- Handle WebGL context loss gracefully.

The old cubemap assets are missing. Do not download random assets.

Instead, generate an attractive local procedural cubemap or another fully local environment compatible with the custom shader. The result should contain enough tonal variation for visible reflection and refraction.

Do not replace the custom shader with `MeshPhysicalMaterial`.

## Demo 2: Shader-only Diamond

The second demo must be genuinely shader-only.

Do not use `ehsan.gltf`, `cube.gltf`, a diamond mesh or imported geometry to define the diamond.

A minimal full-screen triangle, plane or generic render surface is acceptable only as the carrier for the fragment shader.

Reconstruct the missing legacy shader based on the following evidence in `reference/main2d.js`:

- `uContrast`
- `uBrightness`
- `uIor`
- `rainbow`
- pointer position
- camera position
- resolution
- interactive pointer dragging
- refractive or prismatic gemstone intent

Implement a procedural faceted diamond in GLSL, preferably using one of:

- signed distance fields and ray marching,
- analytical ray intersections,
- a procedural faceted gemstone volume.

The visible diamond shape, facets, refraction and lighting must be produced by the shader rather than a diamond model.

Requirements:

- Maintain stable rendering on common WebGL2-capable browsers.
- Provide an appropriate WebGL1 fallback or a clear unsupported-browser message when practical.
- Add subtle animated light or environment movement.
- Allow pointer or touch interaction.
- Add controls for:
  - IOR
  - brightness
  - contrast
  - dispersion or rainbow intensity
  - rotation or animation speed
- Use sensible parameter limits.
- Avoid excessive ray-marching steps.
- Adapt quality based on DPR or viewport size where useful.
- Respect `prefers-reduced-motion`.
- Document clearly that the original `DiamondFragment2d.glsl` file was absent and this implementation is a faithful reconstruction based on the surviving JavaScript interface and artistic intent.

## User interface

Build a refined showcase rather than a bare technical canvas.

Visual direction:

- dark luxury presentation
- restrained glass-like surfaces
- crisp typography
- subtle gradients
- premium jewelry/editorial feeling
- no excessive neon
- no template-like dashboard appearance

Include:

- strong hero section
- short project introduction
- clear selector or tabs for the two rendering approaches
- visible labels:
  - `Mesh + Shader`
  - `Shader Only`
- concise explanation for each technique
- responsive control panel
- reset-to-default controls
- loading state while GLTF assets initialize
- rendering error state
- WebGL unsupported state
- mobile-friendly touch controls
- keyboard-accessible interactive UI
- visible GitHub/project link placeholder where appropriate
- footer crediting Ehsan Moradi

Only keep the active demo rendering when possible so two expensive animation loops are not continuously consuming GPU resources.

Avoid unnecessary animation libraries.

## Metadata and discoverability

Add polished static metadata:

- title
- description
- keywords
- author
- Open Graph metadata
- Twitter/X card metadata
- favicon
- theme color
- canonical URL appropriate for the default user site

Create a local social-preview or hero SVG under `public/brand/` or `docs/`.

Do not claim that an asset is a real screenshot unless it was actually captured from the running application.

## README requirements

Create an exceptionally polished `README.md` intended to attract developers, graphics programmers and creative-coding enthusiasts.

The README must be primarily in English.

Include:

1. A centered project title.
2. A concise, memorable tagline.
3. Relevant badges.
4. A prominent live-demo link.
5. A local hero or preview visual.
6. A short explanation of why the project exists.
7. A comparison of the two rendering approaches.
8. Key visual and technical features.
9. Technology stack.
10. Controls and interaction instructions.
11. Local development commands.
12. Static build instructions.
13. GitHub Pages deployment instructions.
14. Project structure.
15. Architecture or rendering-pipeline diagram using Mermaid when useful.
16. Performance considerations.
17. Browser-support notes.
18. A section mapping the old reference files to the new implementation.
19. A transparent note about the missing `DiamondFragment2d.glsl` and its reconstruction.
20. Credits to Ehsan Moradi.
21. MIT license information.
22. Contribution guidance.
23. Suggested GitHub topics such as:
    - threejs
    - webgl
    - glsl
    - shaders
    - nextjs
    - creative-coding
    - raymarching
    - procedural-generation
    - realtime-graphics

Use valid Markdown that renders well on GitHub.

Do not use fake download counts, fake stars, fake benchmark results or fake browser-support claims.

If browser automation is available, run the application and capture real screenshots into `docs/screenshots/`.

If screenshot capture is unavailable, create a tasteful vector hero and state only what was actually verified.

Add:

- `LICENSE`
- `CONTRIBUTING.md`
- an appropriate `.gitignore`

Use the MIT license unless an existing license already dictates otherwise.

## GitHub Actions deployment

Create `.github/workflows/deploy-pages.yml`.

The workflow must:

- trigger on pushes to `main`
- support manual dispatch
- use npm caching
- install dependencies with `npm ci`
- run type checking
- run linting
- create the static production build
- upload the `build/` directory as the GitHub Pages artifact
- deploy using the official GitHub Pages workflow mechanism
- use minimal required permissions
- use concurrency to prevent conflicting deployments

Use currently supported stable versions of official actions after checking official documentation.

Do not deploy `reference/` separately.

## Scripts and verification

Provide at least these npm scripts:

- `dev`
- `build`
- `lint`
- `typecheck`
- `verify:export`

Create a static-export verification script that checks:

- `build/index.html` exists
- `build/404.html` exists
- `build/_next` exists
- `.nojekyll` exists
- no accidental references to localhost exist
- no Laravel `mix()` paths remain
- no references to the missing old cubemap paths remain
- no references to `/shaders/DiamondFragment2d.glsl` remain
- exported HTML does not contain obviously broken development-only asset URLs

The verification script must return a non-zero exit code on failure.

Run:

1. `npm install`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`
5. `npm run verify:export`

Fix all errors found by these commands.

Also inspect the final build directory manually.

When practical, serve `build/` temporarily with a simple static server for validation. A temporary development or test server is acceptable; the deployed site itself must not require Node.js.

## Git commit requirements

Make small, meaningful commits throughout the implementation.

Do not create one giant final commit.

Use these commit titles unless the actual implementation requires a minor wording adjustment:

1. `chore: preserve legacy diamond references`
2. `chore: bootstrap static Next.js showcase`
3. `feat: port mesh-based refractive diamond`
4. `feat: recreate shader-only procedural diamond`
5. `feat: polish responsive showcase experience`
6. `docs: add showcase README and project documentation`
7. `ci: add GitHub Pages static deployment`
8. `test: verify production static export`

Requirements for commits:

- Each commit must contain a coherent set of changes.
- Do not make empty commits.
- Do not amend previous commits.
- Do not squash the commits.
- Do not use vague messages such as `update`, `fix stuff` or `final`.
- Inspect the staged diff before every commit.
- Do not commit secrets.
- Do not commit `node_modules`.
- Do not commit temporary logs.
- Generated `build/` output may remain ignored, but it must exist after the final verification.

## Code quality

- Use strict TypeScript.
- Avoid `any`.
- Keep rendering lifecycle logic deterministic.
- Use React client components only where browser APIs or WebGL are required.
- Avoid hydration mismatches.
- Avoid duplicated shader setup.
- Keep reusable Three.js utilities outside UI components.
- Add comments only where the rendering technique is not self-explanatory.
- Use semantic HTML.
- Maintain accessible contrast.
- Add labels to all controls.
- Avoid memory leaks.
- Avoid multiple uncontrolled animation loops.
- Keep the browser console free of avoidable errors and warnings.
- Do not overengineer with unnecessary state-management libraries.

## Completion criteria

Do not consider the task complete until all of the following are true:

- Both demos are implemented.
- The first demo uses the supplied `ehsan.gltf`.
- The second demo is genuinely shader-only.
- The missing shader is reconstructed and documented honestly.
- The website is responsive.
- The site exports statically.
- `npm run build` succeeds.
- `npm run verify:export` succeeds.
- `build/index.html` exists.
- The output requires no Node.js server.
- GitHub Pages deployment workflow exists.
- README is polished and complete.
- License and contribution guide exist.
- The `reference/` directory remains intact.
- Meaningful commits have been created.
- Git status is clean apart from intentionally ignored generated output.

At the end, print a concise report containing:

1. The architecture implemented.
2. The two diamond techniques.
3. Important legacy bugs fixed.
4. The exact validation commands executed.
5. The generated build path.
6. The Git commit list with short hashes.
7. Any limitations that could not be resolved.
8. The exact GitHub Pages settings the repository owner must enable.
