# Diamond Shader

[Live demo](https://ehsanwwe.github.io/diamond-shader/) — two real-time diamond studies built with Three.js and custom GLSL. The first is a shader-only brilliant-cut gemstone reconstructed with a detailed signed-distance field, RGB dispersion, Fresnel response, and repeated internal reflection. The second uses the supplied GLTF geometry, a dedicated backface-normal pass, and multi-bounce refractive shading.

Both diamonds are presented inside a local 360° HDR church environment, whose architecture and bright windows reveal the gemstones' facets, fire, reflection, and refraction. The project is a fully static Next.js export, works with touch interaction on mobile browsers, and requires only `npm install`, `npm run dev`, or `npm run build` for local use and deployment.

If you enjoy the experiment, please add a ⭐ to the repository, open an issue with your ideas, or contribute a shader improvement—let's develop the project together and explore more real-time gemstone rendering techniques.
