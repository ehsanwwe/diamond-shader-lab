#define pi 3.141593
struct RenderData
{
    vec3 col;
    vec3 pos;
    vec3 norm;
    int objnr;
};


float fov = 5.;

const vec3 ambientColor = vec3(0.7);
const float ambientint = 0.08;


const int nb_refr = 5;
const float specint = 0.2;
const float specshin = 20.;

const float normdelta = 0.0004;
const float maxdist = 155.;

const float ior_r = 0.008;
const float ior_g = 0.024;
const float ior_b = 0.032;


uniform float uIor;
uniform samplerCube tCube;
uniform sampler2D uBackfaceMap;
uniform vec2 uResolution;
uniform float uContrast;
uniform float uBrightness;
uniform vec2 mospos ;
uniform float rainbow ;
vec3 camdir = vec3(0., -0.1, -1.);

const vec3 diamondColor = vec3(.98, 0.95, 0.9);
vec2 angler(){
    vec2 directions = vec2(
    2.*pi*mospos.x/uResolution.x
    , -2.*pi*mospos.y/uResolution.y
    );
    return directions;
}
float map_simple(vec3 pos)
{
    float angle = angler().x;
    float angle2 = angler().y;

    vec3 posr = pos;
    posr = vec3(posr.x, posr.y*cos(angle2) + posr.z*sin(angle2), posr.y*sin(angle2) - posr.z*cos(angle2));
    posr = vec3(posr.x*cos(angle) + posr.z*sin(angle), posr.y, posr.x*sin(angle) - posr.z*cos(angle));

    float d = 1.05;
    float s = atan(posr.y, posr.x);

    vec3 flatvec = vec3(cos(s), sin(s), 1.444);
    vec3 flatvec2 = vec3(cos(s), sin(s), -1.072);

    float d1 = dot(flatvec, posr) - d;                        // Crown
    d1 = max(dot(flatvec2, posr) - d, d1);                    // Pavillon
    d1 = max(dot(vec3(0., 0., 1.), posr) - 0.35, d1);         // Table
    return d1;
}
float map(vec3 pos)
{
    float angle = angler().x;
    float angle2 = angler().y;

    vec3 posr = pos;
    posr = vec3(posr.x, posr.y*cos(angle2) + posr.z*sin(angle2), posr.y*sin(angle2) - posr.z*cos(angle2));
    posr = vec3(posr.x*cos(angle) + posr.z*sin(angle), posr.y, posr.x*sin(angle) - posr.z*cos(angle));

    float d = 0.94;
    float b = 0.5;

    float af2 = 4./pi;
    float s = atan(posr.y, posr.x);
    float sf = floor(s*af2 + b)/af2;
    float sf2 = floor(s*af2)/af2;

    vec3 flatvec = vec3(cos(sf), sin(sf), 1.444);
    vec3 flatvec2 = vec3(cos(sf), sin(sf), -1.072);
    vec3 flatvec3 = vec3(cos(s), sin(s), 0);
    float csf1 = cos(sf + 0.21);
    float csf2 = cos(sf - 0.21);
    float ssf1 = sin(sf + 0.21);
    float ssf2 = sin(sf - 0.21);
    vec3 flatvec4 = vec3(csf1, ssf1, -1.02);
    vec3 flatvec5 = vec3(csf2, ssf2, -1.02);
    vec3 flatvec6 = vec3(csf2, ssf2, 1.03);
    vec3 flatvec7 = vec3(csf1, ssf1, 1.03);
    vec3 flatvec8 = vec3(cos(sf2 + 0.393), sin(sf2 + 0.393), 2.21);

    float d1 = dot(flatvec, posr) - d;                           // Crown, bezel facets
    d1 = max(dot(flatvec2, posr) - d, d1);                       // Pavillon, pavillon facets
    d1 = max(dot(vec3(0., 0., 1.), posr) - 0.3, d1);             // Table
    d1 = max(dot(vec3(0., 0., -1.), posr) - 0.865, d1);          // Cutlet
    d1 = max(dot(flatvec3, posr) - 0.911, d1);                   // Girdle
    d1 = max(dot(flatvec4, posr) - 0.9193, d1);                  // Pavillon, lower-girdle facets
    d1 = max(dot(flatvec5, posr) - 0.9193, d1);                  // Pavillon, lower-girdle facets
    d1 = max(dot(flatvec6, posr) - 0.912, d1);                   // Crown, upper-girdle facets
    d1 = max(dot(flatvec7, posr) - 0.912, d1);                   // Crown, upper-girdle facets
    d1 = max(dot(flatvec8, posr) - 1.131, d1);                   // Crown, star facets
    return d1;
}
// Fresnel reflectance factor through Schlick's approximation: https://en.wikipedia.org/wiki/Schlick's_approximation
float fresnel(vec3 ray, vec3 norm, float n2)
{
    float n1 = 1.; // air
    float angle = clamp(acos(-dot(ray, norm)), -pi/2.15, pi/2.15);
    float r0 = pow((n1-n2)/(n1+n2), 2.);
    float r = r0 + (1. - r0)*pow(1. - cos(angle), 5.);
    return clamp(0., 0.9, r);
}
vec3 GetCameraRayDir(vec2 vWindow, vec3 vCameraDir, float fov)
{
    vec3 vForward = normalize(vCameraDir);
    vec3 vRight = normalize(cross(vec3(0.0, 1.0, 0.0), vForward));
    vec3 vUp = normalize(cross(vForward, vRight));

    vec3 vDir = normalize(vWindow.x * vRight + vWindow.y * vUp + vForward * fov);

    return vDir;
}
// From https://www.shadertoy.com/view/MstGDM
vec3 getNormal(vec3 pos, float e, bool inside)
{
    vec2 q = vec2(0, e);
    return (inside?-1.:1.)*normalize(vec3(map(pos + q.yxx) - map(pos - q.yxx),
    map(pos + q.xyx) - map(pos - q.xyx),
    map(pos + q.xxy) - map(pos - q.xxy)));
}
float trace(vec3 cam, vec3 ray, float maxdist, bool inside)
{
    float t = 4.2;
    float dist;

    // "Bounding" tracing
    if (!inside)
    {
        for (int i = 0; i < 12; ++i)
        {
            vec3 pos = ray*t + cam;
            dist = map_simple(pos);
            if (dist>maxdist || abs(dist)<0.001)
            break;
            t+= dist*0.95;
        }
    }

    // "Actual" tracing
    for (int i = 0; i < 30; ++i)
    {
        vec3 pos = ray*t + cam;
        dist = inside?-map(pos):map(pos);
        if (dist>maxdist)
        break;
        t+= dist*(inside?0.4:0.8);
    }
    return t;
}

vec3 sky_color(vec3 ray)
{
    vec3 rc = texture(tCube, ray).rrr;
    return rc;
}


RenderData trace0(vec3 tpos, vec3 ray, bool inside)
{
    float tx = trace(tpos, ray, maxdist, inside);
    vec3 col;
    int objnr;

    vec3 pos = tpos + tx*ray;
    vec3 norm;
    if (tx<10.)
    {
        norm = getNormal(pos, normdelta, inside);
        if (!inside)
        {
            // Coloring
            col = ambientColor*ambientint;
            objnr = 1;
        }
    }
    else
    {
        // Sky
        col = sky_color(ray);
        objnr = 3;
    }
    return RenderData(col, pos, norm, objnr);
}

vec4 renderer(vec2 fragCoord, vec3 campos, float ior)
{
    vec2 uv = fragCoord.xy / uResolution.xy;
    uv = uv*2.0 - 1.0;
    uv.x*= uResolution.x / uResolution.y;

    vec3 ray = GetCameraRayDir(uv,camdir, fov);

    RenderData traceinf = trace0(campos, ray, false);
    vec3 col = traceinf.col;


    if (traceinf.objnr==1)
    {
        vec3 norm = traceinf.norm;
        vec3 ray_r = refract(ray, traceinf.norm, 1./ior);
        vec3 ray_r2;

        int n2;
        for (int n=0; n<nb_refr; n++)
        {
            traceinf = trace0(traceinf.pos, ray_r, true);
            col+= traceinf.col;
            col*= diamondColor;
            ray_r2 = refract(ray_r, traceinf.norm, ior);
            if (length(ray_r2)!=0.)
            {
                col+= sky_color(ray_r2)*diamondColor;
                break;
            }
            ray_r2 = reflect(ray_r, traceinf.norm);
            ray_r = ray_r2;
            n2 = n;
        }
        if (n2==nb_refr-1)
        col+= sky_color(ray_r2)*diamondColor;

        // Outer reflection
        float r = fresnel(ray, norm, ior);

        col *= uContrast;
        col += uBrightness;

        col = mix(col, sky_color(reflect(ray, norm)), r);
    }
    return vec4(col, 1.0);
}
vec4 render_rgb(vec2 fragCoord, vec3 campos)
{
    vec4 col;
    col.r = renderer(fragCoord, campos, uIor + ior_r * rainbow).r;
    col.g = renderer(fragCoord, campos, uIor + ior_g * rainbow).g;
    col.b = renderer(fragCoord, campos, uIor + ior_b * rainbow).b;
    col.a = 1.;
    return col;
}

void main() {
    if(rainbow > 0.)
    gl_FragColor = render_rgb(gl_FragCoord.xy,vec3(0., 0.5, 5.));
    else
    gl_FragColor = renderer(gl_FragCoord.xy,vec3(0., 0.5, 5.),uIor);
}
