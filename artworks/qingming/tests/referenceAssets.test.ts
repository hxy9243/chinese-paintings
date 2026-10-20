import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { hall } from "../src/bridgeStudy";
import {
  buildReferenceBoat,
  buildReferenceTree,
  addReferenceArchitecture,
  type BoatStyle,
} from "../src/referenceAssets";
const triangles = (g: THREE.Object3D) => {
  let n = 0;
  g.traverse((o) => {
    if (o instanceof THREE.Mesh)
      n +=
        (o.geometry.index?.count ?? o.geometry.getAttribute("position").count) /
        3;
  });
  return n;
};
const dispose = (g: THREE.Object3D) =>
  g.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line)
      o.geometry.dispose();
  });
describe("reference-led asset geometry", () => {
  it("keeps every actual hull, oar, rudder and lowered rig inside the navigation envelope", () => {
    for (const style of ["cabin", "freight", "canopy", "skiff"] as BoatStyle[])
      for (const level of [0, 2] as const) {
        const g = buildReferenceBoat(5.4, 1.1, style, level),
          bounds = new THREE.Box3().setFromObject(g);
        expect(bounds.min.x).toBeGreaterThan(-1.1 * 0.7);
        expect(bounds.max.x).toBeLessThan(1.1 * 0.7);
        expect(bounds.min.z).toBeGreaterThan(-5.4 * 0.62);
        expect(bounds.max.z).toBeLessThan(5.4 * 0.62);
        expect(bounds.max.y).toBeLessThan(1.15);
        expect(g.getObjectByName("hollow-planked-hull")).toBeDefined();
        if (style === "cabin" || style === "freight") {
          // A side-facing ray above the sill passes through an actual open cabin bay.
          // A solid prefab cabin box would block this ray before the opposite wall.
          const cabin = g.getObjectByName("timber-cabin")!;
          const ray = new THREE.Raycaster(
            new THREE.Vector3(
              1,
              0.7,
              5.4 * (style === "freight" ? 0.2 : 0.245) * 0.23,
            ),
            new THREE.Vector3(-1, 0, 0),
          );
          expect(
            ray
              .intersectObject(cabin, true)
              .filter((hit) => hit.object instanceof THREE.Mesh),
          ).toHaveLength(0);
        }
        dispose(g);
      }
  });
  it("drops actual boat geometry at distance while retaining hull bounds and deck height", () => {
    const fine = buildReferenceBoat(5.4, 1.1, "freight", 2),
      low = buildReferenceBoat(5.4, 1.1, "freight", 0);
    expect(triangles(low)).toBeLessThan(triangles(fine) * 0.7);
    const a = new THREE.Box3().setFromObject(
        fine.getObjectByName("hollow-planked-hull")!,
      ),
      b = new THREE.Box3().setFromObject(
        low.getObjectByName("hollow-planked-hull")!,
      );
    expect(a.min.distanceTo(b.min)).toBeLessThan(0.04);
    expect(a.max.distanceTo(b.max)).toBeLessThan(0.04);
    const deck = fine.getObjectByName("deck") as THREE.Mesh;
    deck.geometry.computeBoundingBox();
    expect(deck.geometry.boundingBox!.max.y).toBeCloseTo(0.335);
    dispose(fine);
    dispose(low);
  });
  it("keeps the old-tree silhouette asymmetric and removes fine twigs in the distant mesh", () => {
    const a = buildReferenceTree("spreading", 6.1, 2, true),
      b = buildReferenceTree("spreading", 6.1, 0, true);
    const A = new THREE.Box3().setFromObject(a),
      B = new THREE.Box3().setFromObject(b);
    expect(Math.abs(A.min.x) - A.max.x).toBeGreaterThan(0.1);
    expect(Math.abs(A.max.y - B.max.y)).toBeLessThan(0.5);
    expect(triangles(b)).toBeLessThan(triangles(a) * 0.2);
    for (const tree of [a, b])
      tree.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          const points = o.geometry.getAttribute("position");
          expect(points.count).toBeGreaterThan(0);
          expect(Array.from(points.array).every(Number.isFinite)).toBe(true);
        }
      });
    dispose(a);
    dispose(b);
  });
  it("recesses the foreground gable entrance behind the plaster face", () => {
    const house = hall(new THREE.Group(), 0, 0, 4, 3, 1.2, 0, "dwelling", true);
    house.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(3, 0.5, 0),
      new THREE.Vector3(-1, 0, 0),
    );
    const hits = ray
      .intersectObject(house, true)
      .filter((hit) => hit.object instanceof THREE.Mesh);
    expect(hits[0].distance).toBeGreaterThan(1.1);
    expect(hits[0].distance).toBeLessThan(1.2);
    dispose(house);
  });
  it("models roof caps above the curved roof surface with real thickness", () => {
    const g = new THREE.Group();
    addReferenceArchitecture(g, 4, 3, 1.2, true);
    const tiles = g.getObjectByName("overlapping-cap-tiles") as THREE.Mesh,
      positions = tiles.geometry.getAttribute("position");
    const roofY = (z: number) => {
      const t = Math.abs(z) / (1.5 + 0.23);
      return 1.84 + (1.3 - 1.84) * t - Math.sin(t * Math.PI) * 0.065;
    };
    let lift = 0;
    for (let j = 0; j < positions.count; j++)
      lift = Math.max(lift, positions.getY(j) - roofY(positions.getZ(j)));
    expect(lift).toBeGreaterThan(0.035);
    expect(lift).toBeLessThan(0.05);
    dispose(g);
  });
});
