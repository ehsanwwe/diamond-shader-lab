import { environmentGLSL } from "./environment";

export const fullscreenVertex = `void main(){gl_Position=vec4(position,1.);}`;

// Faithful WebGL adaptation of the legacy ShaderToy-inspired diamond tracer.
export const proceduralFragment = `precision highp float;
uniform vec2 uResolution,uPointer;
uniform float uTime,uIor,uBrightness,uContrast,uRainbow;
${environmentGLSL}
#define PI 3.14159265359
const float FAR=12.0;

vec2 angles(){return vec2(uPointer.x+uTime*.035,uPointer.y);}
vec3 rotateGem(vec3 p){vec2 a=angles();float cx=cos(a.y),sx=sin(a.y),cy=cos(a.x),sy=sin(a.x);p.yz=mat2(cx,-sx,sx,cx)*p.yz;p.xz=mat2(cy,-sy,sy,cy)*p.xz;return p;}

float boundGem(vec3 q){vec3 p=rotateGem(q);float s=atan(p.y,p.x);float d=max(dot(vec3(cos(s),sin(s),1.444),p)-1.05,dot(vec3(cos(s),sin(s),-1.072),p)-1.05);return max(d,p.z-.35);}

float gem(vec3 q){
 vec3 p=rotateGem(q);float s=atan(p.y,p.x),af=4./PI;
 float sf=floor(s*af+.5)/af,sf2=floor(s*af)/af;
 vec2 f=vec2(cos(sf),sin(sf));
 float d=dot(vec3(f,1.444),p)-.94;                         // bezel crown
 d=max(d,dot(vec3(f,-1.072),p)-.94);                      // pavilion mains
 d=max(d,p.z-.30);d=max(d,-p.z-.865);                     // table and culet
 d=max(d,length(p.xy)-.911);                              // circular girdle
 d=max(d,dot(vec3(cos(sf+.21),sin(sf+.21),-1.02),p)-.9193);
 d=max(d,dot(vec3(cos(sf-.21),sin(sf-.21),-1.02),p)-.9193);
 d=max(d,dot(vec3(cos(sf-.21),sin(sf-.21),1.03),p)-.912);
 d=max(d,dot(vec3(cos(sf+.21),sin(sf+.21),1.03),p)-.912);
 d=max(d,dot(vec3(cos(sf2+.393),sin(sf2+.393),2.21),p)-1.131);
 return d;
}

vec3 normalAt(vec3 p,bool inside){vec2 e=vec2(.0012,0.);vec3 n=normalize(vec3(gem(p+e.xyy)-gem(p-e.xyy),gem(p+e.yxy)-gem(p-e.yxy),gem(p+e.yyx)-gem(p-e.yyx)));return inside?-n:n;}

float march(vec3 ro,vec3 rd,bool inside,out vec3 p){float t=inside?.012:3.2;float d=1.;if(!inside){for(int i=0;i<12;i++){p=ro+rd*t;d=boundGem(p);if(abs(d)<.002||t>FAR)break;t+=d*.92;}}for(int i=0;i<30;i++){p=ro+rd*t;d=inside?-gem(p):gem(p);if(abs(d)<.0012||t>FAR)break;t+=d*(inside?.42:.78);}return t;}

float schlick(vec3 ray,vec3 n,float ior){float r0=(1.-ior)/(1.+ior);r0*=r0;return clamp(r0+(1.-r0)*pow(1.-max(dot(-ray,n),0.),5.),0.,.92);}

vec3 traceDiamond(vec3 ro,vec3 rd,float ior){
 vec3 hit;float t=march(ro,rd,false,hit);if(t>FAR)return environment(rd);
 vec3 outerN=normalAt(hit,false);vec3 reflected=environment(reflect(rd,outerN));
 vec3 ray=refract(rd,outerN,1./ior);vec3 pos=hit+ray*.01;vec3 transmitted=vec3(0.);
 for(int bounce=0;bounce<5;bounce++){
  vec3 exitHit;float insideT=march(pos,ray,true,exitHit);if(insideT>FAR)break;
  vec3 innerN=normalAt(exitHit,true);vec3 exitRay=refract(ray,innerN,ior);
  if(length(exitRay)>.001){transmitted=environment(exitRay);break;}
  ray=reflect(ray,innerN);pos=exitHit+ray*.01;
  if(bounce==4)transmitted=environment(ray);
 }
 float f=schlick(rd,outerN,ior);return mix(transmitted*vec3(.98,.95,.90),reflected,f);
}

vec3 cameraRay(vec2 uv){vec3 forward=normalize(vec3(0.,-.08,-1.));vec3 right=normalize(cross(vec3(0.,1.,0.),forward));vec3 up=cross(forward,right);return normalize(uv.x*right+uv.y*up+forward*2.7);}

void main(){
 vec2 uv=(gl_FragCoord.xy*2.-uResolution)/uResolution.y;vec3 ro=vec3(0.,.35,4.6),rd=cameraRay(uv);
 float spread=.032*uRainbow;vec3 col;
 col.r=traceDiamond(ro,rd,uIor+spread*.25).r;
 col.g=traceDiamond(ro,rd,uIor+spread*.75).g;
 col.b=traceDiamond(ro,rd,uIor+spread).b;
 col=(col-.5)*uContrast+.5;col*=uBrightness;col=col/(1.+max(col,vec3(0.)));col=pow(max(col,0.),vec3(1./2.2));
 gl_FragColor=vec4(col,1.);
}`;
