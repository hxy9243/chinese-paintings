import { expect, it } from "vitest";
import * as THREE from "three";
import { paintMaterial } from "../src/paintMaterial";
import { faceDepth, faceProfile, buildCloseFace } from "../src/faceModels";
it("sculpts the nose continuously and differentiates child, adult and elder profiles", () => {
  const profiles = Array.from({ length: 12 }, (_, i) => faceProfile(i));
  expect(new Set(profiles.map((p) => JSON.stringify(p))).size).toBe(12);
  expect(faceProfile(8).nose).toBeLessThan(faceProfile(7).nose);
  expect(faceProfile(8).age).toBeLessThan(12);
  expect(faceProfile(7).age).toBeGreaterThan(60);
  for (let i = 0; i < 12; i++) {
    expect(faceDepth(0, -0.009, i)).toBeGreaterThan(
      faceDepth(0.009, -0.009, i) + 0.004,
    );
    for (let y = -0.045; y < 0.05; y += 0.001)
      expect(Number.isFinite(faceDepth(0, y, i))).toBe(true);
  }
});
it("creates finite smooth head geometry with eyes lying on their sockets and stable articulation", () => {
  const material = paintMaterial(0xbfa17e);
  for (const variant of [0, 6, 7, 8, 12, 13, 14, 15]) {
    const parent = new THREE.Group(),
      face = buildCloseFace(parent, variant, {
        skin: material,
        skinLight: material,
        hair: material,
        cloth: material,
      });
    const head = face.getObjectByName("sculpted-head") as THREE.Mesh;
    const pos = head.geometry.getAttribute("position"),
      normal = head.geometry.getAttribute("normal");
    expect(pos.count).toBeGreaterThan(2000);
    expect(normal.getZ(24 * 65)).toBeGreaterThan(0.5);
    for (let i = 0; i < pos.count; i++) {
      expect(Number.isFinite(pos.getZ(i))).toBe(true);
      const around = i % 65;
      if (around < 16 || around > 48)
        expect(pos.getZ(i)).toBeCloseTo(
          faceDepth(pos.getX(i), pos.getY(i), variant),
          5,
        );
      const n = new THREE.Vector3().fromBufferAttribute(normal, i).length();
      expect(n).toBeCloseTo(1, 4);
    }
    let eyes = 0;
    face.traverse((o) => {
      if (o.name === "almond-eye") {
        eyes++;
        const p = (o as THREE.Mesh).geometry.getAttribute("position");
        for (let i = 0; i < p.count; i++)
          expect(
            p.getZ(i) - faceDepth(p.getX(i), p.getY(i), variant),
          ).toBeCloseTo(0.001, 5);
      }
    });
    expect(eyes).toBe(2);
    expect(parent.children[0]).toBe(face);
    expect(face.position.length()).toBe(0);
    face.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
});
