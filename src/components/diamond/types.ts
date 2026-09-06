// camera view: azimuth / polar in degrees, zoom = distance relative to the auto-fit distance (1 = fitted)
export type RingView = { azimuth:number; polar:number; zoom:number };
export type RingSettings = RingView & { ior:number; dispersion:number; brightness:number; contrast:number; highlight:number; glow:number; flare:number; flareSize:number; rotation:number; autoRotate:boolean };
