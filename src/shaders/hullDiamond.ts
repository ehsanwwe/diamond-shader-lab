import { environmentGLSL } from "./environment";

// Analytic convex-polytope diamond tracer, applied as the material of every
// stone of the ring. The diamond is described by the facet planes of the
// model's convex hull (extracted from the stone geometry at load time and
// uploaded as uPlanes). Optics: Fresnel reflection, refraction in, up to 5
// internal bounces (total-internal-reflection) and chromatic dispersion.
//
// The 360 environment is sampled in MONOCHROME for refraction/reflection, but the
// three colour channels are traced at slightly different IOR, so the dispersion
// still separates into a coloured rainbow at the facet edges. Output is LINEAR;
// the post pipeline adds bloom, lens flare and the sRGB output pass.
export const MAX_PLANES = 96;

// Rays are traced in the stone's own (plane) space; uEnvRot rotates directions
// into world space before the environment lookup.
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

// three channels at slightly different IOR -> dispersion; contrast + exposure, LINEAR, unclamped (HDR)
vec3 traceDiamondHDR(vec3 ro,vec3 rd){
 float spread=.032*uDispersion;
 vec3 col;
 col.r=traceDiamond(ro,rd,uIor+spread*.25).r;
 col.g=traceDiamond(ro,rd,uIor+spread*.75).g;
 col.b=traceDiamond(ro,rd,uIor+spread).b;
 col=(col-.5)*uContrast+.5;
 return max(col*uExposure,vec3(0.));
}`;

// The rasterised surface point of the stone gives the entry ray; the tracer does the rest.
export const stoneVertex = `varying vec3 vLocal;
void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

// Facet detail is Reinhard-mapped (always < 1) so the stone keeps its cut from
// every angle. On top, the true glints (luminance above 1) are added back as HDR
// scaled by uHighlight, so bloom / lens flare react to them.
export const stoneFragment = `precision highp float;
uniform vec3 uLocalCam;   // camera position in the stone's local space
uniform float uHighlight;
varying vec3 vLocal;
${hullTraceGLSL}

void main(){
 vec3 rd=normalize(vLocal-uLocalCam);
 vec3 col=traceDiamondHDR(uLocalCam,rd);
 vec3 base=col/(1.+col);                          // facet detail, always < 1
 float l=dot(col,vec3(.299,.587,.114));
 vec3 glint=col*smoothstep(1.,4.,l)*uHighlight;   // HDR glints for bloom / lens flare
 gl_FragColor=vec4(base+glint,1.);
}`;
