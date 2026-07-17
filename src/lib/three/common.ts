import * as THREE from 'three';
export function rendererFor(canvas:HTMLCanvasElement){
 const context=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});
 const precision=context?.getShaderPrecisionFormat(context.FRAGMENT_SHADER,context.HIGH_FLOAT);
 if(!context||!precision)throw new Error('A functional WebGL2 context with fragment shader precision is required.');
 const renderer=new THREE.WebGLRenderer({canvas,context,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;return renderer;
}
export function fitRenderer(renderer:THREE.WebGLRenderer,canvas:HTMLCanvasElement){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),dpr=Math.min(devicePixelRatio,2);renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);return {w,h,dpr};}
export function lifecycle(renderer:THREE.WebGLRenderer,canvas:HTMLCanvasElement,frame:(time:number)=>void,onResize:()=>void,onError:()=>void){let raf=0,alive=true,visible=!document.hidden;const loop=(t:number)=>{if(!alive)return;if(visible)frame(t);raf=requestAnimationFrame(loop)};const resize=new ResizeObserver(onResize);resize.observe(canvas);const visibility=()=>{visible=!document.hidden};const lost=(e:Event)=>{e.preventDefault();onError()};document.addEventListener('visibilitychange',visibility);canvas.addEventListener('webglcontextlost',lost);raf=requestAnimationFrame(loop);return()=>{alive=false;cancelAnimationFrame(raf);resize.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);renderer.dispose();renderer.forceContextLoss()};}
