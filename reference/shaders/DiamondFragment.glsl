uniform samplerCube tCube;
uniform sampler2D uBackfaceMap;
uniform vec2 uResolution;

uniform vec3 uColor;
uniform float uContrast;
uniform float uBrightness;
uniform float uRefractionRatio;
uniform float uFresnelBias;
uniform float uFresnelScale;
uniform float uFresnelPower;
uniform float uBackfaceVisibility;

varying vec3 worldNormal;
varying vec3 viewDirection;

const vec4 diamondColor = vec4(.98, 0.95, 0.9,1.);
void main() {
	// Backface Normals
	vec3 backfaceNormal = texture2D(uBackfaceMap, gl_FragCoord.xy / uResolution).rgb;

	// Reflection
	vec3 vReflect = reflect(viewDirection, worldNormal);
	float vReflectionFactor = uFresnelBias + uFresnelScale * pow(1.0 + dot(normalize(viewDirection), worldNormal), uFresnelPower);

	// Refraction
	vec3 vRefract[6];
	vec3 normal = worldNormal * (1.0 - uBackfaceVisibility) - backfaceNormal * uBackfaceVisibility;
	vRefract[0] = refract(normalize(viewDirection), normal, uRefractionRatio);
	vRefract[1] = refract(normalize(viewDirection), normal, uRefractionRatio * 0.995);
	vRefract[2] = refract(normalize(viewDirection), normal, uRefractionRatio * 0.99);

	vRefract[3] += refract(normalize(viewDirection), normal, uRefractionRatio * 0.5);
	vRefract[4] += refract(normalize(viewDirection), normal, uRefractionRatio * 0.495);
	vRefract[4] += refract(normalize(viewDirection), normal, uRefractionRatio * 0.49);

	// Reflected Color
	vec4 reflectedColor = textureCube(tCube, vec3(vReflect.x, vReflect.x ,vReflect.x)) * vec4(5.0); // Add some white

	// Refracted Color
	vec4 refractedColor = vec4(1.0);
	refractedColor.r = textureCube(tCube, vec3(-vRefract[0].x, vRefract[0].yz)).r;
	refractedColor.g = textureCube(tCube, vec3(-vRefract[1].x, vRefract[1].yz)).r;
	refractedColor.b = textureCube(tCube, vec3(-vRefract[2].x, vRefract[2].yz)).r;

	refractedColor.r += textureCube(tCube, vec3(-vRefract[3].x, vRefract[3].yz)).g;
	refractedColor.g += textureCube(tCube, vec3(-vRefract[4].x, vRefract[4].yz)).g;
	refractedColor.b += textureCube(tCube, vec3(-vRefract[4].x, vRefract[4].yz)).g;

	vec4 finalCol =  mix(refractedColor, reflectedColor, clamp(vReflectionFactor, 0.0, 1.0)) * vec4(uColor, 1.0);
	finalCol *=diamondColor;
	if (gl_FrontFacing)
	{
		gl_FragColor = (finalCol+uBrightness-0.4)*(uContrast+1.2);
		gl_FragColor.a = .6;
	}
	else
	{
		gl_FragColor = (finalCol+uBrightness-0.4)*(uContrast+1.2);
		gl_FragColor.a = 1.4;
	}
}
