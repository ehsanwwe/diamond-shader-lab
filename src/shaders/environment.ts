export const environmentGLSL = `
vec3 environment(vec3 d){
 d=normalize(d); float horizon=pow(1.0-abs(d.y),3.0); float key=pow(max(dot(d,normalize(vec3(-.6,.7,.35))),0.0),64.0); float strip=pow(max(dot(d,normalize(vec3(.7,.1,-.7))),0.0),18.0);
 return vec3(.025,.035,.055)+horizon*vec3(.12,.15,.2)+key*vec3(3.2,2.8,2.3)+strip*vec3(.55,.7,1.0);
}`;
