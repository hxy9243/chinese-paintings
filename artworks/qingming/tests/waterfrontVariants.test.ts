import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildReferenceBoat, buildReferenceTree, type BoatVariant } from "../src/referenceAssets";

function positions(g: THREE.Object3D, name: string) {
  let count = 0;
  g.traverse(o => {
    if (o.name === name && o instanceof THREE.Mesh) count += o.geometry.getAttribute("position").count;
  });
  return count;
}
function dispose(g: THREE.Object3D) {
  g.traverse(o => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose();
  });
}
describe("waterfront working-boat and open-tree variants", () => {
  it("keeps every optional silhouette within existing navigation bounds at every detail", () => {
    for (const variant of ["standard", "open-hold", "short-reed", "low-service"] as BoatVariant[])
      for (const detail of [0, 1, 2] as const) {
        const boat = buildReferenceBoat(5.4, 1.1, "freight", detail, variant);
        const bounds = new THREE.Box3().setFromObject(boat);
        expect(bounds.min.x).toBeGreaterThan(-1.1 * .7);
        expect(bounds.max.x).toBeLessThan(1.1 * .7);
        expect(bounds.min.z).toBeGreaterThan(-5.4 * .62);
        expect(bounds.max.z).toBeLessThan(5.4 * .62);
        expect(bounds.max.y).toBeLessThan(1.15);
        dispose(boat);
      }
  });
  it("creates a true deck opening over a recessed hold instead of a cream cabin", () => {
    for (const detail of [0, 2] as const) {
      const boat = buildReferenceBoat(5.4, 1.1, "freight", detail, "open-hold");
      boat.updateMatrixWorld(true);
      expect(boat.getObjectByName("timber-cabin")).toBeUndefined();
      expect(boat.getObjectByName("hold-floor")).toBeDefined();
      const ray = new THREE.Raycaster(new THREE.Vector3(.05, 2, .05), new THREE.Vector3(0, -1, 0));
      expect(ray.intersectObject(boat.getObjectByName("deck")!)).toHaveLength(0);
      const floor = new THREE.Box3().setFromObject(boat.getObjectByName("hold-floor")!);
      expect(floor.max.y).toBeLessThan(.15);
      dispose(boat);
    }
  });
  it("makes visibly shorter reed covers and lower aft service cabins", () => {
    const full = buildReferenceBoat(5.4, 1.1, "canopy");
    const short = buildReferenceBoat(5.4, 1.1, "canopy", 2, "short-reed");
    const service = buildReferenceBoat(5.4, 1.1, "cabin", 2, "low-service");
    [full, short, service].forEach(g => g.updateMatrixWorld(true));
    const cover = (g: THREE.Object3D) => new THREE.Box3().setFromObject(g.getObjectByName("woven-canopy")!);
    expect(cover(short).getSize(new THREE.Vector3()).z).toBeLessThan(cover(full).getSize(new THREE.Vector3()).z * .6);
    expect(cover(short).getCenter(new THREE.Vector3()).z).toBeLessThan(0);
    const cabin = new THREE.Box3().setFromObject(service.getObjectByName("low-service-cabin")!);
    expect(cabin.max.y).toBeLessThan(.83);
    expect(cabin.getCenter(new THREE.Vector3()).z).toBeLessThan(-.8);
    [full, short, service].forEach(dispose);
  });
  it("thins only requested foliage without removing any branch tips", () => {
    for (const detail of [0, 2] as const) {
      const full = buildReferenceTree("spreading", 6.1, detail, true);
      const open = buildReferenceTree("spreading", 6.1, detail, true, "open");
      expect(open.userData.branchBounds).toEqual(full.userData.branchBounds);
      expect(positions(open, "pine-needle-fascicles")).toBeGreaterThan(0);
      expect(positions(open, "pine-needle-fascicles")).toBeLessThan(positions(full, "pine-needle-fascicles") * .35);
      [full, open].forEach(dispose);
    }
  });
});
