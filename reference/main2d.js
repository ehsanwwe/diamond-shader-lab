import * as THREE from 'three'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";



async function main() {
    const settings = {
        uContrast: 2,
        uBrightness: 0.2,
        uIor: 2.418,
        rainbow: 0,
    }
    // Dimensions
    const width = 640
    const height = 360
    const clock = new THREE.Clock()

    const canvas =  document.getElementById('canvas') ;
    // Renderer
    const scene = new THREE.Scene()
    const backfaceScene = new THREE.Scene()
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.autoClear = false
    let mosPos = new THREE.Vector2(0,0);

    function mousePosFunction(event){
        let bound = canvas.getBoundingClientRect();
        let x = event.clientX - bound.left - canvas.clientLeft;
        let y = event.clientY - bound.top - canvas.clientTop;
        mosPos = new THREE.Vector2(x, y);
    }


    canvas.addEventListener('mousedown', mousePosFunction);
    canvas.addEventListener('mousedown', event => {
        canvas.addEventListener('mousemove', mousePosFunction);
    });
    canvas.addEventListener('mouseup', event => {
        canvas.removeEventListener('mousemove',mousePosFunction);
        canvas.onmouseup = null;
    });
    canvas.addEventListener('mouseout', event => {
        canvas.removeEventListener('mousemove',mousePosFunction);
        canvas.onmouseout = null;
    });


    canvas.addEventListener('touchstart', mousePosFunction);
    canvas.addEventListener('touchend', event => {
        canvas.removeEventListener('touchmove',mousePosFunction);
        canvas.onmouseup = null;
    });
    canvas.addEventListener('touchcancel', event => {
        canvas.removeEventListener('touchmove',mousePosFunction);
        canvas.onmouseout = null;
    });


    // Backface Render Target
    const backfaceRenderTarget = new THREE.WebGLRenderTarget(width, height)

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
    camera.position.set(0, 0, 1.1)


    // Background
    const cubemap = new THREE.CubeTextureLoader().load([
        "assets/cubeShaderToy/Box_Right.jpeg",
        "assets/cubeShaderToy/Box_Left.jpeg",
        "assets/cubeShaderToy/Box_Top.jpeg",
        "assets/cubeShaderToy/Box_Bottom.jpeg",
        "assets/cubeShaderToy/Box_Front.jpeg",
        "assets/cubeShaderToy/Box_Back.jpeg"
    ])
    scene.background = cubemap
    const loader = new THREE.FileLoader();

    // shader loaders
    loader.load("/shaders/DiamondVertex.glsl?raw",function (DiamondVertexShader) {
        loader.load("/shaders/DiamondFragment2d.glsl?raw", function (DiamondFragmentShader) {
            loader.load("/shaders/MultiproposeBackfaceVertex.glsl?raw", function (MultiProposeBackfaceVertexShader) {
                loader.load("/shaders/MultiproposeBackfaceFragment.glsl?raw", function (MultiProposeBackfaceFragmentShader) {
                    // Geometry
                    const gltfLoader = new GLTFLoader();
                    var baseGLTFObject;
                    gltfLoader.load('assets/cube.gltf', obj => {
                        baseGLTFObject = obj.scene.children[0];
                        baseGLTFObject.scale.set(1 * width / height, 1, 1);

                        let diamond3Dmodel = baseGLTFObject;


                        // Main Side Material (Front)
                        const frontMaterial = new THREE.ShaderMaterial({
                            vertexShader: DiamondVertexShader,
                            fragmentShader: DiamondFragmentShader,
                            depthTest: false,
                            depthWrite: true,
                            side: THREE.FrontSide,
                            uniforms: {
                                tCube: {value: cubemap},
                                //uBackfaceMap: {value: backfaceRenderTarget.texture},
                                //uColor: {value: new THREE.Color(settings.uColor)},
                                campos: {value: new THREE.Vector3()},
                                mospos: {value: mosPos},
                                rainbow: {value: settings.rainbow},
                                uContrast: {value: settings.uContrast},
                                uBrightness: {value: settings.uBrightness},
                                uIor: {value: settings.uIor},
                                uResolution: {
                                    value: [
                                        width * renderer.getPixelRatio(),
                                        height * renderer.getPixelRatio(),
                                    ]
                                },
                            }
                        })
                        console.log("width = " +
                            width * renderer.getPixelRatio());
                        console.log("height = " +
                            height * renderer.getPixelRatio());
                        //3D Front object assign Material
                        diamond3Dmodel.traverse(n => {
                            if (n.material && n.material.name == 'Diamond_main') {
                                n.material = frontMaterial
                            }
                        })
                        scene.add(diamond3Dmodel)



                        //GUI
                        const ranges = {
                            uContrast: {min: 1, max: 5, step: 0.1},
                            uBrightness: {min: -1, max: 2, step: 0.0001},
                            uIor: {min: 1, max: 3, step: 0.01},
                            rainbow: {min: 0, max: 1, step: 0.1},
                        }
                        const gui = new GUI()
                        // New Controllers
                        for (const [index, [key, value]] of Object.entries(Object.entries(settings)))
                            gui.add(settings, key, ranges[key].min, ranges[key].max, ranges[key].step).name(key)


                        //*  Update per each frame  //
                        function animate() {
                            // Update Shader material
                            frontMaterial.uniforms.mospos.value = mosPos
                            frontMaterial.uniforms.uContrast.value = settings.uContrast
                            frontMaterial.uniforms.uBrightness.value = settings.uBrightness
                            frontMaterial.uniforms.uIor.value = settings.uIor
                            frontMaterial.uniforms.rainbow.value = settings.rainbow
                            // Render
                            renderer.setRenderTarget(backfaceRenderTarget)
                            renderer.clearDepth()
                            renderer.render(backfaceScene, camera)
                            renderer.setRenderTarget(null)
                            renderer.clearDepth()
                            renderer.render(scene, camera)

                            // Update renderer
                            requestAnimationFrame(animate)
                        }

                        requestAnimationFrame(animate)
                    });
                });
            });
        });
    });
}
main().then(r => {})
