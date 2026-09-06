import * as THREE from "three";
import { ConvexHull } from "three/examples/jsm/math/ConvexHull.js";
import { MAX_PLANES } from "@/shaders/hullDiamond";

// Extract the facet planes of a point set's convex hull, merging coplanar faces.
// Returns a flat [nx,ny,nz,offset, ...] array (offset = dot(normal, point) on the face).
export function hullPlanes(points: THREE.Vector3[]): { data: Float32Array; count: number } {
  const hull = new ConvexHull().setFromPoints(points);
  const planes: { n: THREE.Vector3; d: number }[] = [];
  for (const face of hull.faces) {
    const n = face.normal; // outward unit normal
    const d = n.dot(face.edge.head().point); // signed distance of the face plane
    let merged = false;
    for (const p of planes) {
      if (p.n.dot(n) > 0.985 && Math.abs(p.d - d) < 0.03) {
        merged = true;
        break;
      }
    }
    if (!merged) planes.push({ n: n.clone(), d });
  }
  const count = Math.min(planes.length, MAX_PLANES);
  const data = new Float32Array(MAX_PLANES * 4);
  for (let i = 0; i < count; i++) {
    data[i * 4] = planes[i].n.x;
    data[i * 4 + 1] = planes[i].n.y;
    data[i * 4 + 2] = planes[i].n.z;
    data[i * 4 + 3] = planes[i].d;
  }
  return { data, count };
}
