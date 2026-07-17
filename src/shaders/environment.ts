export const environmentGLSL = `
uniform sampler2D uEnvironment;
vec3 environment(vec3 d){
 d=normalize(d);
 vec2 uv=vec2(atan(d.z,d.x)/6.28318530718+.5,asin(clamp(d.y,-1.,1.))/3.14159265359+.5);
 return texture2D(uEnvironment,uv).rgb;
}`;
