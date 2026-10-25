import { expect, it } from "vitest";
import * as THREE from "three";
import { dragDetail } from "../../../packages/scene-kit/lod";
import { createBridgeStudy } from "../src/bridgeStudy";
import { buildDistantReferenceHouse, buildReferenceHouse } from "../src/crossroadsArchitecture";

const count = (root: THREE.Object3D, lines: boolean) => {
  let n = 0;
  root.traverse(o => {
    if (lines ? o instanceof THREE.LineSegments : o instanceof THREE.Mesh) {
      const g = (o as THREE.Mesh).geometry;
      n += lines ? g.getAttribute("position").count / 2 : (g.index?.count ?? g.getAttribute("position").count) / 3;
    }
  });
  return n;
};
const dispose = (root: THREE.Object3D) =>
  root.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose(); });

it("keeps the distant hall's eaves, ridge, tile courses and ink outline at a fraction of the cost", () => {
  const near = buildReferenceHouse(4, 3, 1.2, "dwelling"), far = buildDistantReferenceHouse(4, 3, 1.2, "dwelling");
  const a = new THREE.Box3().setFromObject(near), b = new THREE.Box3().setFromObject(far);
  // Same overhanging roof envelope as the refined hall, so settling does not pop.
  expect(a.min.distanceTo(b.min)).toBeLessThan(0.08);
  expect(a.max.distanceTo(b.max)).toBeLessThan(0.08);
  expect(b.max.x).toBeGreaterThan(2.15); // gable overhang beyond the 2.0 wall
  expect(b.max.z).toBeGreaterThan(1.65); // eave overhang beyond the 1.5 wall
  for (const name of ["distant-curved-tile-roof", "distant-eave-fascia", "distant-tile-courses", "distant-ink-outline"])
    expect(far.getObjectByName(name), name).toBeTruthy();
  expect(count(far.getObjectByName("distant-tile-courses")!, true)).toBeGreaterThan(100);
  // Budget: the distant hall stays under a tenth of the refined hall's triangles.
  expect(count(far, false)).toBeLessThan(count(near, false) * 0.1);
  dispose(near); dispose(far);
});

it("steps drag frames down one level instead of collapsing to boxes and stubs", () => {
  expect([0, 1, 2].map(l => dragDetail(l as 0 | 1 | 2))).toEqual([0, 0, 1]);
  const study = createBridgeStudy(9243), camera = new THREE.OrthographicCamera(-26, 26, 13, -13, 0.1, 250);
  camera.position.set(0, 80, 80); camera.lookAt(0, 0, 0); camera.zoom = 2.5; camera.updateProjectionMatrix();
  study.update(8, camera, 760);
  const settled = study.metadata();
  study.update(8, camera, 760, true);
  const drag = study.metadata();
  expect(settled.buildings.every(l => l === 2)).toBe(true);
  // Close halls keep their tiled base model and trees their medium fans.
  expect(drag.buildings.every(l => l === 1)).toBe(true);
  expect(drag.vegetationLevel).toBe(1);
  const people = (m: typeof drag, level: number) => m.crowd.levels[level].visibleActors;
  const total = (m: typeof drag) => [0, 1, 2].reduce((n, l) => n + people(m, l), 0);
  // Nobody is hidden while dragging; close figures stay articulated.
  expect(total(drag)).toBe(total(settled));
  expect(people(drag, 1)).toBe(people(settled, 2));
  // The settled choice survives the drag, so releasing restores the same frame.
  study.update(8, camera, 760);
  expect(study.metadata().buildings).toEqual(settled.buildings);
  expect(study.metadata().crowd).toEqual(settled.crowd);
  dispose(study.group);
});
