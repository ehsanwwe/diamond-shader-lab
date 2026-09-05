import { environmentGLSL } from "./environment";

export const fullscreenVertex = `void main(){gl_Position=vec4(position,1.);}`;

// Analytic convex-polytope tracer. The diamond is described by the facet planes
// of the model's convex hull (extracted from math-diamond.gltf at load time and
// uploaded as uPlanes). Optics: Fresnel reflection, refraction in, up to 5
// internal bounces (total-internal-reflection) and chromatic dispersion.
//
// The 360 environment is sampled in MONOCHROME for refraction/reflection, but the
// three colour channels are traced at slightly different IOR, so the dispersion
// still separates into a coloured rainbow at the facet edges. Output is LINEAR;
// the post pipeline adds bloom (glow + glare) and the sRGB output pass.
export const MAX_PLANES = 96;

// Shared tracer core. Rays are traced in the diamond's own (plane) space; uEnvRot
// rotates directions into world space before the environment lookup, so the same
// code serves the fullscreen box (identity) and stones placed anywhere in a scene.
export const hullTraceGLSL = `
uniform float uIor,uDispersion,uExposure,uContrast;
uniform int uPlaneCount;
uniform vec4 uPlanes[${MAX_PLANES}];   // xyz = outward unit normal, w = offset (dot(n,x) <= w inside)
uniform mat3 uEnvRot;
${environmentGLSL}

// desaturated environment lookup — refraction/reflection stay black & white
vec3 grayEnv(vec3 d){vec3 c=environment(uEnvRot*d);return vec3(dot(c,vec3(.299,.587,.114)));}

// Ray vs convex hull: entry (tN,nN) and exit (tF,nF). Inside is dot(n,x) <= w for every plane.
bool intersectHull(vec3 ro,vec3 rd,out float tN,out vec3 nN,out float tF,out vec3 nF){
 tN=-1e9;tF=1e9;nN=vec3(0.);nF=vec3(0.);
 for(int i=0;i<${MAX_PLANES};i++){
  if(i>=uPlaneCount)break;
  vec4 pl=uPlanes[i];vec3 n=pl.xyz;float w=pl.w;
  float denom=dot(n,rd);
  float side=dot(n,ro)-w;
  if(abs(denom)<1e-6){ if(side>0.)return false; }      // parallel & outside this slab
  else{
   float t=-side/denom;
   if(denom<0.){ if(t>tN){tN=t;nN=n;} }                // entering half-space
   else{ if(t<tF){tF=t;nF=n;} }                        // leaving half-space
  }
 }
 return tF>=tN && tF>0.;
}

float schlick(vec3 ray,vec3 n,float ior){float r0=(1.-ior)/(1.+ior);r0*=r0;return clamp(r0+(1.-r0)*pow(1.-max(dot(-ray,n),0.),5.),0.,.94);}

// ro/rd must already be known to hit the hull (tN >= 0)
vec3 traceDiamond(vec3 ro,vec3 rd,float ior){
 float tN,tF;vec3 nN,nF;
 intersectHull(ro,rd,tN,nN,tF,nF);
 vec3 hit=ro+rd*tN;
 vec3 reflected=grayEnv(reflect(rd,nN));
 vec3 ray=refract(rd,nN,1./ior);
 vec3 pos=hit;vec3 transmitted=vec3(0.);
 for(int b=0;b<5;b++){
  float eN,eF;vec3 enN,enF;
  vec3 o=pos+ray*.0015;
  if(!intersectHull(o,ray,eN,enN,eF,enF))break;         // find the exit face
  vec3 exitPos=o+ray*eF;
  vec3 outN=enF;                                        // outward normal of the exit face
  vec3 exitRay=refract(ray,-outN,ior);                  // normal must oppose the outgoing ray
  if(length(exitRay)>.001){transmitted=grayEnv(exitRay);break;}
  ray=reflect(ray,outN);                                // total internal reflection
  pos=exitPos;
  if(b==4)transmitted=grayEnv(ray);
 }
 float f=schlick(rd,nN,ior);
 return mix(transmitted,reflected,f);
}

// three channels at slightly different IOR -> dispersion; contrast, exposure, Reinhard
vec3 shadeDiamond(vec3 ro,vec3 rd){
 float spread=.032*uDispersion;
 vec3 col;
 col.r=traceDiamond(ro,rd,uIor+spread*.25).r;
 col.g=traceDiamond(ro,rd,uIor+spread*.75).g;
 col.b=traceDiamond(ro,rd,uIor+spread).b;
 col=(col-.5)*uContrast+.5;
 col*=uExposure;
 return col/(1.+max(col,vec3(0.)));   // Reinhard tone map, LINEAR out (sRGB done by OutputPass)
}`;

// Fullscreen version: the gem sits at the origin, rays come from the camera.
export const hullFragment = `precision highp float;
uniform vec2 uResolution;
uniform vec3 uCamPos;
uniform mat4 uInvViewProj;
uniform float uBackground;
${hullTraceGLSL}

void main(){
 vec2 ndc=(gl_FragCoord.xy/uResolution)*2.-1.;
 vec4 far=uInvViewProj*vec4(ndc,1.,1.);far/=far.w;
 vec3 ro=uCamPos;
 vec3 rd=normalize(far.xyz-ro);
 // flat grey backdrop where the ray misses the gem (env still used inside the stone)
 float mtN,mtF;vec3 mnN,mnF;
 if(!intersectHull(ro,rd,mtN,mnN,mtF,mnF)||mtN<0.){gl_FragColor=vec4(vec3(uBackground),1.);return;}
 gl_FragColor=vec4(shadeDiamond(ro,rd),1.);
}`;

// Mesh version: applied as the material of a stone whose geometry IS the hull.
// The rasterised surface point gives the entry ray; the tracer does the rest.
export const stoneVertex = `varying vec3 vLocal;
void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const stoneFragment = `precision highp float;
uniform vec3 uLocalCam;   // camera position in the stone's local space
varying vec3 vLocal;
${hullTraceGLSL}

void main(){
 vec3 rd=normalize(vLocal-uLocalCam);
 gl_FragColor=vec4(shadeDiamond(uLocalCam,rd),1.);
}`;
