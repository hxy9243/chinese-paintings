import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { marketParasol, marketStall, parasolStyle } from "../src/marketModels";
import { hall } from "../src/bridgeStudy";
import { MIN_EAVE_HEIGHT, GROUND_Y } from "../src/passageLayout";
import { FIGURE_HEIGHT } from "../src/figures";
import { PERSON_SCALE, BRIDGE_RAIL_HEIGHT } from "../src/passageLayout";

const dispose = (g: THREE.Object3D) =>
  g.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line)
      o.geometry.dispose();
  });
describe("reference-led market and human scale", () => {
  it("varies canopy color and silhouette while clearing adults and staying within reserved sites", () => {
    const colors = new Set<number>(),
      forms = new Set<string>();
    // These are the actual parasol indices in the larger street market.
    for (let i = 16; i < 52; i += 3)
      for (const compact of [false, true]) {
        const root = new THREE.Group();
        root.scale.set(compact ? 0.4125 : 0.55, 0.72, compact ? 0.4125 : 0.55);
        const canopy = marketParasol(root, i, compact),
          spec = parasolStyle(i, compact);
        colors.add(spec.color);
        forms.add(spec.form);
        root.updateMatrixWorld(true);
        canopy.traverse((o) => {
          if (!(o instanceof THREE.Mesh || o instanceof THREE.Line)) return;
          const p = o.geometry.getAttribute("position");
          for (let j = 0; j < p.count; j++) {
            const v = new THREE.Vector3()
              .fromBufferAttribute(p, j)
              .applyMatrix4(o.matrixWorld);
            expect(Math.hypot(v.x, v.z)).toBeLessThan(compact ? 0.5 : 0.97);
          }
        });
        expect(spec.rimHeight * 0.72).toBeGreaterThan(
          FIGURE_HEIGHT * PERSON_SCALE * 1.08 + 0.08,
        );
        dispose(root);
      }
    expect(colors.size).toBe(8);
    expect(forms.size).toBe(4);
  });
  it("combines low displays and standing counters instead of repeating a single table silhouette", () => {
    const roots = Array.from({ length: 6 }, (_, i) =>
      marketStall(new THREE.Group(), i, false),
    );
    expect(new Set(roots.map((g) => g.userData.display))).toEqual(
      new Set(["low-trestle", "counter"]),
    );
    const height = (g: THREE.Group) => {
      g.updateMatrixWorld(true);
      return new THREE.Box3().setFromObject(
        g.getObjectByName("display-counter")!,
      ).max.y;
    };
    expect(height(roots[1])).toBeLessThan(height(roots[0]) * 0.7);
    roots.forEach(dispose);
  });
  it("keeps actual doorway headers and courtyard entry roofs above the tallest adult", () => {
    const headY = FIGURE_HEIGHT * PERSON_SCALE * 1.08 + GROUND_Y;
    for (const kind of [
      "dwelling",
      "shop",
      "warehouse",
      "gallery",
      "compound",
      "courtyard",
    ] as const) {
      const g = hall(new THREE.Group(), 0, 0, 3.1, 2, MIN_EAVE_HEIGHT, 0, kind);
      g.updateMatrixWorld(true);
      const lintel = g.getObjectByName("entry-lintel");
      if (lintel) {
        expect(new THREE.Box3().setFromObject(lintel).min.y).toBeGreaterThan(
          headY + 0.04,
        );
      } else {
        const hits = new THREE.Raycaster(
          new THREE.Vector3(0, headY, 2),
          new THREE.Vector3(0, 0, -1),
        )
          .intersectObject(g, true)
          .filter((h) => h.object instanceof THREE.Mesh);
        expect(hits.length).toBeGreaterThan(0);
        // The first surface is the recessed interior, beyond the front frame.
        expect(hits[0].point.z).toBeLessThan(0.9);
      }
      dispose(g);
    }
  });
  it("keeps the side-facing gable doorway tall enough for the adult profile", () => {
    const g = hall(
      new THREE.Group(),
      0,
      0,
      3.1,
      2,
      MIN_EAVE_HEIGHT,
      0,
      "shop",
      true,
    );
    g.updateMatrixWorld(true);
    const headY = FIGURE_HEIGHT * PERSON_SCALE * 1.08 + GROUND_Y;
    const hits = new THREE.Raycaster(
      new THREE.Vector3(3, headY, 0),
      new THREE.Vector3(-1, 0, 0),
    )
      .intersectObject(g, true)
      .filter((h) => h.object instanceof THREE.Mesh);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].point.x).toBeLessThan(1.45);
    dispose(g);
  });
  it("places the upper bridge rail around an adult's waist", () => {
    expect(BRIDGE_RAIL_HEIGHT / (FIGURE_HEIGHT * PERSON_SCALE)).toBeGreaterThan(
      0.45,
    );
    expect(BRIDGE_RAIL_HEIGHT / (FIGURE_HEIGHT * PERSON_SCALE)).toBeLessThan(
      0.56,
    );
  });
});
