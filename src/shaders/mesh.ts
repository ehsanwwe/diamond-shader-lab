import { environmentGLSL } from "./environment";

export const backfaceVertex = `
varying vec3 vNormal;
void main(){
  vNormal=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`;

export const backfaceFragment = `
varying vec3 vNormal;
void main(){gl_FragColor=vec4(vNormal*.5+.5,1.);}`;

export const diamondVertex = `
varying vec3 vNormal;
varying vec3 vWorld;
void main(){
  vec4 world=modelMatrix*vec4(position,1.);
  vWorld=world.xyz;
  vNormal=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*world;
}`;

export const diamondFragment = `precision highp float;
uniform sampler2D uBackface;
uniform vec2 uResolution;
uniform float uIor,uDispersion,uTint,uExposure;
varying vec3 vNormal;
varying vec3 vWorld;
${environmentGLSL}

float fresnelSchlick(vec3 ray,vec3 normal,float ior){
  float r0=(1.-ior)/(1.+ior);r0*=r0;
  return clamp(r0+(1.-r0)*pow(1.-max(dot(-ray,normal),0.),5.),0.,.94);
}

vec3 internalTrace(vec3 incident,vec3 frontNormal,vec3 rearNormal,float ior){
  vec3 ray=refract(incident,frontNormal,1./ior);
  vec3 exitRay=refract(ray,-rearNormal,ior);
  if(length(exitRay)>.001)return environment(exitRay);

  ray=reflect(ray,-rearNormal);
  exitRay=refract(ray,-frontNormal,ior);
  if(length(exitRay)>.001)return environment(exitRay)*.94;

  ray=reflect(ray,-frontNormal);
  exitRay=refract(ray,-rearNormal,ior);
  if(length(exitRay)>.001)return environment(exitRay)*.88;

  ray=reflect(ray,-rearNormal);
  exitRay=refract(ray,-frontNormal,ior);
  if(length(exitRay)>.001)return environment(exitRay)*.82;
  return environment(reflect(ray,-frontNormal))*.76;
}

void main(){
  vec3 incident=normalize(vWorld-cameraPosition);
  vec3 frontNormal=normalize(vNormal);
  vec2 screenUv=gl_FragCoord.xy/uResolution;
  vec3 rearNormal=normalize(texture2D(uBackface,screenUv).rgb*2.-1.);

  float spread=uDispersion*1.35;
  vec3 transmitted;
  transmitted.r=internalTrace(incident,frontNormal,rearNormal,max(1.01,uIor-spread)).r;
  transmitted.g=internalTrace(incident,frontNormal,rearNormal,uIor).g;
  transmitted.b=internalTrace(incident,frontNormal,rearNormal,uIor+spread).b;

  vec3 reflected=environment(reflect(incident,frontNormal));
  float fresnel=fresnelSchlick(incident,frontNormal,uIor);
  vec3 tint=mix(vec3(1.),vec3(1.,.86,.62),uTint*.34);
  vec3 color=mix(transmitted*1.48,reflected*1.72,fresnel)*tint;

  float facetEdge=pow(1.-abs(dot(frontNormal,rearNormal)),3.);
  float whiteFire=pow(max(dot(reflect(incident,frontNormal),normalize(vec3(-.35,.78,.28))),0.),96.);
  color+=facetEdge*transmitted*.32+whiteFire*vec3(2.6,2.35,2.05);
  color*=uExposure;
  color=color/(1.+max(color,vec3(0.)));
  color=pow(max(color,0.),vec3(1./2.2));
  gl_FragColor=vec4(color,.98);
}`;
