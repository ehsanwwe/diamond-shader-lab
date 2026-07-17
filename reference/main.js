import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";



async function main() {
    const settings = {
        uContrast: -0.7,
        uBrightness: 0.5,
        uRefractionRatio: -0.88,
        uFresnelBias: -0.9,
        uFresnelPower: 0.36,
        uFresnelScale: 0.13,
        uBackfaceVisibility: 0.38,
    }
    const canvas = document.getElementById('canvas');
    const canvasParent = document.getElementById('canvasParent');
    // Dimensions
    const width = canvasParent.getBoundingClientRect().width * 0.99
    const height = canvasParent.getBoundingClientRect().height *0.98
    const clock = new THREE.Clock()


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

    // Backface Render Target
    const backfaceRenderTarget = new THREE.WebGLRenderTarget(width, height)

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
    camera.position.set(0, 0, 5)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    // Background
    const cubemap = new THREE.CubeTextureLoader().load([
        "/assets/cubeShaderToy/Box_Right.jpeg",
        "/assets/cubeShaderToy/Box_Left.jpeg",
        "/assets/cubeShaderToy/Box_Top.jpeg",
        "/assets/cubeShaderToy/Box_Bottom.jpeg",
        "/assets/cubeShaderToy/Box_Front.jpeg",
        "/assets/cubeShaderToy/Box_Back.jpeg"
    ])
    scene.background = cubemap
    const loader = new THREE.FileLoader();

    // shader loaders
    loader.load("/shaders/DiamondVertex.glsl?raw",function (DiamondVertexShader) {
        loader.load("/shaders/DiamondFragment.glsl?raw",function (DiamondFragmentShader) {
            loader.load("/shaders/MultiproposeBackfaceVertex.glsl?raw",function (MultiProposeBackfaceVertexShader) {
                loader.load("/shaders/MultiproposeBackfaceFragment.glsl?raw",function (MultiProposeBackfaceFragmentShader) {
                // Geometry
                const gltfLoader = new GLTFLoader();
                var baseGLTFObject;
                gltfLoader.load('/assets/ehsan.gltf',obj => {
                    baseGLTFObject = obj.scene.children[0];

                    let diamond3Dmodel = baseGLTFObject;
                    let diamond3DmodelBack = diamond3Dmodel.clone();

                    //  Backface Material
                    const backMaterial = new THREE.ShaderMaterial({
                        vertexShader: MultiProposeBackfaceVertexShader,
                        fragmentShader: MultiProposeBackfaceFragmentShader,
                        side: THREE.BackSide
                    })

                    // Main Side Material (Front)
                    const frontMaterial = new THREE.ShaderMaterial({
                        vertexShader: DiamondVertexShader,
                        fragmentShader: DiamondFragmentShader,
                        forceSinglePass: false,
                        depthTest: false,
                        depthWrite: true,
                        premultipliedAlpha: true,
                        side: THREE.DoubleSide,
                        transparent: true,
                        uniforms: {
                            tCube: {value: cubemap},
                            uBackfaceMap: {value: backfaceRenderTarget.texture},
                            uColor: {value: new THREE.Color(settings.uColor)},
                            uContrast: {value: settings.uContrast},
                            uBrightness: {value: settings.uBrightness},
                            uRefractionRatio: {value: settings.uRefractionRatio},
                            uFresnelBias: {value: settings.uFresnelBias},
                            uFresnelPower: {value: settings.uFresnelPower},
                            uFresnelScale: {value: settings.uFresnelScale},
                            uBackfaceVisibility: {value: settings.uBackfaceVisibility},
                            uResolution: {
                                value: [
                                    width * renderer.getPixelRatio(),
                                    height * renderer.getPixelRatio(),
                                ]
                            },
                        }
                    })

                    //3D Front object assign Material
                    diamond3Dmodel.traverse(n => {
                        if (n.material && n.material.name == 'Diamond_main') {
                            n.material = frontMaterial
                        }
                    })
                    scene.add(diamond3Dmodel)

                    //3D back object assign Material
                    diamond3DmodelBack.traverse(n => {
                        if (n.material && n.material.name == 'Diamond_main') {
                            n.material = backMaterial
                        }
                    })
                    scene.add(diamond3DmodelBack)

                    //GUI
                    const ranges = {
                        uContrast: {min: -5, max: 5, step: 0.1},
                        uBrightness: {min: -1, max: 2, step: 0.0001},
                        uRefractionRatio: {min: -1, max: 0, step: 0.01},
                        uFresnelBias: {min: -1, max: 0, step: 0.01},
                        uFresnelPower: {min: -2, max: 2, step: 0.01},
                        uFresnelScale: {min: -2, max: 2, step: 0.01},
                        uBackfaceVisibility: {min: 0, max: 3, step: 0.01}
                    }
                    const gui = new GUI()
                    // New Controllers
                    for (const [index, [key, value]] of Object.entries(Object.entries(settings)))
                        gui.add( settings, key, ranges[key].min, ranges[key].max, ranges[key].step).name( key )


                    //*  Update per each frame  //
                    function animate() {
                        // Update Shader material
                        frontMaterial.uniforms.uContrast.value = settings.uContrast
                        frontMaterial.uniforms.uBrightness.value = settings.uBrightness
                        frontMaterial.uniforms.uRefractionRatio.value = settings.uRefractionRatio
                        frontMaterial.uniforms.uFresnelBias.value = settings.uFresnelBias
                        frontMaterial.uniforms.uFresnelPower.value = settings.uFresnelPower
                        frontMaterial.uniforms.uFresnelScale.value = settings.uFresnelScale
                        frontMaterial.uniforms.uBackfaceVisibility.value = settings.uBackfaceVisibility
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
