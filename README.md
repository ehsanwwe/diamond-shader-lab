# 💎 Diamond Shader Lab

**A physically driven real-time diamond renderer built to achieve the most realistic result possible in the browser.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Open_Project-111827?style=for-the-badge&logo=googlechrome&logoColor=white)](https://ehsanwwe.github.io/diamond-shader/)

![Diamond Shader Lab — real-time diamond rendering](Diamond.gif)

> Every frame above is rendered live on the GPU — no pre-rendered video, no baked animation.

## Overview

Diamond Shader Lab explores two advanced GPU rendering techniques for creating a highly realistic diamond in real time:

- **Physical Photon Shader** — a fully procedural diamond built with SDF ray-marching in GLSL, focused on physically inspired light behavior.
- **Multi-Bounce Mesh Refraction** — a GLTF mesh rendered with repeated internal refraction and reflection.

## How It Works

**Physical Photon Shader (SDF)** — the diamond is defined as a signed distance field and ray-marched entirely in the fragment shader. Light rays are traced through the stone with physically inspired refraction, total internal reflection, and dispersion, so the fire and sparkle emerge from the light path itself rather than from textures.

**Multi-Bounce Mesh Refraction** — a real cut-diamond mesh is rendered with a custom material that simulates multiple internal bounces. Each ray refracts on entry, reflects internally several times, and refracts out, producing accurate facet-to-facet light transport and chromatic dispersion.

## Highlights

- Real-time WebGL rendering
- Custom GLSL shaders
- Physically inspired reflection, refraction and dispersion
- Interactive 3D presentation
- Runs directly in the browser

## Built With

`Next.js` · `React` · `Three.js` · `WebGL` · `GLSL`

---

## Let's Build Something Exceptional

Experience the renderer directly in the **[Live Demo](https://ehsanwwe.github.io/diamond-shader/)** and see the diamond running in real time inside your browser.

Interested in real-time graphics, shaders, interactive experiences, or ambitious web products? I'm open to collaborations and challenging projects.

If you enjoy this experiment, consider giving the repository a **Star** — it helps the project reach more developers and creators.

[![Open Live Demo](https://img.shields.io/badge/Open_Live_Demo-Run_the_Renderer-111827?style=for-the-badge&logo=googlechrome&logoColor=white)](https://ehsanwwe.github.io/diamond-shader/)
[![Work With Me](https://img.shields.io/badge/Work_With_Me-Let's_Connect-111827?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ehsanwwe)

Built by **Ehsan Moradi**
