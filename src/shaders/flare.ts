// Screen-space lens flare: a four-point star (horizontal + vertical streaks)
// grown from pixels brighter than uThreshold. Runs on the HDR buffer, so only
// real glints (specular highlights, total-internal-reflection flashes) streak.
// A slight cool/warm split across the streak mimics the chromatic edge of a
// real anamorphic flare.
import { Vector2 } from "three";

const TAPS = 18;

export const FlareShader = {
  name: "FlareShader",
  uniforms: {
    tDiffuse: { value: null },
    uTexel: { value: new Vector2(1, 1) },
    uFlare: { value: 0.3 },     // strength; 0 disables the pass entirely
    uThreshold: { value: 1.2 }, // linear HDR luminance a pixel needs to streak
    uLength: { value: 3.0 },    // pixel step between taps (streak reach)
  },
  vertexShader: `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform float uFlare,uThreshold,uLength;
varying vec2 vUv;

vec3 bright(vec2 uv){
 vec3 c=texture2D(tDiffuse,uv).rgb;
 float l=dot(c,vec3(.299,.587,.114));
 return c*max(l-uThreshold,0.)/max(l,1e-4);
}

vec3 streak(vec2 dir){
 vec3 acc=vec3(0.);float wsum=0.;
 for(int i=1;i<=${TAPS};i++){
  float t=float(i)/float(${TAPS});
  float w=(1.-t)*(1.-t)*(1.-t);                // fast falloff along the streak (no pow: pow(0,y) is NaN on some GPUs)
  vec2 o=dir*uTexel*uLength*float(i);
  // opposite ends get opposite chromatic tint
  acc+=w*bright(vUv+o)*vec3(1.,.92,.85);
  acc+=w*bright(vUv-o)*vec3(.85,.92,1.);
  wsum+=2.*w;
 }
 return acc/wsum;
}

void main(){
 vec4 base=texture2D(tDiffuse,vUv);
 if(uFlare<=0.){gl_FragColor=base;return;}
 vec3 star=max(streak(vec2(1.,0.))+streak(vec2(0.,1.)),vec3(0.));
 gl_FragColor=vec4(base.rgb+star*uFlare*2.,1.);
}`,
};
