import * as THREE from "three";
import { buildReferenceBoat } from "../../src/referenceAssets";
const cache = new Map<
  string,
  { vertices: THREE.Vector3[]; footprint: THREE.Vector3[] }
>();
export function vesselGeometry(length: number, width: number, cabin: boolean) {
  const key = `${length}/${width}/${cabin}`;
  if (cache.has(key)) return cache.get(key)!;
  const style = cabin
    ? "cabin"
    : length > 5
      ? "freight"
      : length < 3.8
        ? "skiff"
        : "canopy";
  const boat = buildReferenceBoat(length, width, style, 2);
  boat.updateMatrixWorld(true);
  const vertices: THREE.Vector3[] = [];
  boat.traverse((n) => {
    if (!(n instanceof THREE.Mesh)) return;
    const p = n.geometry.getAttribute("position");
    for (let i = 0; i < p.count; i++)
      vertices.push(
        new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .applyMatrix4(n.matrixWorld),
      );
  });
  const unique = new Map<string, THREE.Vector3>();
  for (const p of vertices)
    unique.set(`${p.x.toFixed(5)},${p.z.toFixed(5)}`, p);
  const points = [...unique.values()].sort((a, b) => a.x - b.x || a.z - b.z),
    cross = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) =>
      (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  const half = (pts: THREE.Vector3[]) => {
    const h: THREE.Vector3[] = [];
    for (const p of pts) {
      while (h.length >= 2 && cross(h.at(-2)!, h.at(-1)!, p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  const outline = [...half(points), ...half([...points].reverse())],
    footprint: THREE.Vector3[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length],
      steps = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.1);
    for (let j = 0; j < steps; j++)
      footprint.push(a.clone().lerp(b, j / steps));
  }
  boat.traverse((n) => {
    if (n instanceof THREE.Mesh || n instanceof THREE.Line)
      n.geometry.dispose();
  });
  const result = { vertices, footprint };
  cache.set(key, result);
  return result;
}
export const vesselFootprint = (
  length: number,
  width: number,
  cabin: boolean,
) => vesselGeometry(length, width, cabin).footprint;
