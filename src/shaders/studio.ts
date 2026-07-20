import { environmentGLSL } from "./environment";

export const fullscreenVertex = `void main(){gl_Position=vec4(position,1.);}`;

// Studio variant of the procedural tracer:
//  - free 3D orbit camera with a pole-stable basis (no clipping straight up / down)
//  - flat light-grey studio backdrop (the environment photo is NOT drawn behind the gem)
//  - the environment is still sampled for refraction/reflection, but desaturated to monochrome
//  - explicit specular glints on the outer facets, kept bright so bloom turns them into glare
//  - refraction never reaches pure black: its darkest value is floored (~20% grey = 80% black)
//  - outputs LINEAR colour; the post pipeline (bloom + output pass) applies sRGB encoding
export const studioFragment = `precision highp float;
uniform vec2 uResolution,uOrbit;
uniform float uTime,uIor,uBrightness,uContrast,uSpecular,uDistance,uBackground,uRefractFloor;
${environmentGLSL}
#define PI 3.14159265359
const float FAR=12.0;

// The gem is kept fixed (table axis = local +z). We orient it table-up in world space.
vec3 rotateGem(vec3 q){
 vec3 p=q;
 float c=cos(-1.5707963),s=sin(-1.5707963);
 p.yz=mat2(c,-s,s,c)*p.yz;
 return p;
}

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

float march(vec3 ro,vec3 rd,bool inside,out vec3 p){float t=inside?.012:.2;float d=1.;if(!inside){for(int i=0;i<24;i++){p=ro+rd*t;d=boundGem(p);if(abs(d)<.002||t>FAR)break;t+=d*.92;}}for(int i=0;i<30;i++){p=ro+rd*t;d=inside?-gem(p):gem(p);if(abs(d)<.0012||t>FAR)break;t+=d*(inside?.42:.78);}return t;}

float schlick(vec3 ray,vec3 n,float ior){float r0=(1.-ior)/(1.+ior);r0*=r0;return clamp(r0+(1.-r0)*pow(1.-max(dot(-ray,n),0.),5.),0.,.92);}

// desaturated environment lookup — keeps refraction/reflection detail but monochrome
vec3 grayEnv(vec3 d){vec3 c=environment(d);return vec3(dot(c,vec3(.299,.587,.114)));}

vec3 traceDiamond(vec3 ro,vec3 rd,float ior,out float alpha,out float spec){
 alpha=0.;spec=0.;
 vec3 hit;float t=march(ro,rd,false,hit);if(t>FAR)return vec3(uBackground);
 alpha=1.;
 vec3 outerN=normalAt(hit,false);vec3 reflected=grayEnv(reflect(rd,outerN));
 // specular glints from two studio key lights
 vec3 L1=normalize(vec3(.45,.85,.5)),L2=normalize(vec3(-.5,.35,.7));
 vec3 H1=normalize(L1-rd),H2=normalize(L2-rd);
 spec=pow(max(dot(outerN,H1),0.),160.)*1.4+pow(max(dot(outerN,H2),0.),100.)*.7;
 vec3 ray=refract(rd,outerN,1./ior);vec3 pos=hit+ray*.01;vec3 transmitted=vec3(0.);
 for(int bounce=0;bounce<5;bounce++){
  vec3 exitHit;float insideT=march(pos,ray,true,exitHit);if(insideT>FAR)break;
  vec3 innerN=normalAt(exitHit,true);vec3 exitRay=refract(ray,innerN,ior);
  if(length(exitRay)>.001){transmitted=grayEnv(exitRay);break;}
  ray=reflect(ray,innerN);pos=exitHit+ray*.01;
  if(bounce==4)transmitted=grayEnv(ray);
 }
 float fr=schlick(rd,outerN,ior);return mix(transmitted,reflected,fr);
}

void main(){
 vec2 uv=(gl_FragCoord.xy*2.-uResolution)/uResolution.y;
 // orbit camera around the gem with a pole-stable basis (prevents clipping top/bottom)
 float yaw=uOrbit.x,pitch=uOrbit.y,cp=cos(pitch);
 vec3 ro=uDistance*vec3(sin(yaw)*cp,sin(pitch),cos(yaw)*cp);
 vec3 forward=normalize(-ro);
 vec3 wup=abs(forward.y)>.985?vec3(0.,0.,sign(-forward.y)):vec3(0.,1.,0.);
 vec3 right=normalize(cross(wup,forward));
 vec3 up=cross(forward,right);
 vec3 rd=normalize(uv.x*right+uv.y*up+forward*2.7);

 // subtle chromatic spread keeps it monochrome-natural
 float spread=.006;float a=0.,sp=0.,at,st;
 vec3 col;
 col.r=traceDiamond(ro,rd,uIor+spread*.25,at,st).r;
 col.g=traceDiamond(ro,rd,uIor+spread*.75,a,sp).g;
 col.b=traceDiamond(ro,rd,uIor+spread,at,st).b;

 // gem grade (linear space): contrast, brightness, Reinhard tone map
 col=(col-.5)*uContrast+.5;
 col*=uBrightness;
 col=col/(1.+max(col,vec3(0.)));
 // refraction never goes fully black — floor the darkest value
 col=max(col,vec3(uRefractFloor));
 // bright additive specular -> becomes glare through the bloom pass (gem only)
 col+=sp*uSpecular*a;

 // flat studio backdrop for pixels that miss the gem
 col=mix(vec3(uBackground),col,step(.5,a));
 gl_FragColor=vec4(col,1.);
}`;
