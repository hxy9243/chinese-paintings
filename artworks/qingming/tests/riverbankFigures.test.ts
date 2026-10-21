import { expect, it } from "vitest";
import * as THREE from "three";
import {
  bankSection,
  buildBankFace,
  buildBridgeFoundations,
} from "../src/riverbanks";
import {
  BRIDGE,
  GROUND_Y,
  PERSON_SCALE,
  shoreDepth,
  bridgeHeight,
} from "../src/passageLayout";
import { mooringAnchor, MOORED_BOATS } from "../src/moorings";
import { WATER_LEVEL } from "../src/riverSurface";
import { figureDetail } from "../src/figureTypes";
import { buildFigure, FIGURE_HEIGHT } from "../src/figures";

it("raises occupied ground roughly three feet while leaving the water and vessel datum fixed", () => {
  const metres =
    ((GROUND_Y - WATER_LEVEL) / (FIGURE_HEIGHT * PERSON_SCALE)) * 1.7;
  expect(metres).toBeGreaterThan(0.8);
  expect(metres).toBeLessThan(1.1);
  MOORED_BOATS.forEach((_,i)=>{for(const side of [-1,1]){const p=mooringAnchor(i,side);expect(shoreDepth("far",p.s)-p.d).toBeGreaterThan(.2);}});
  for (const side of ["far", "near"] as const)
    for (let s = -22; s <= 22; s += 0.1) {
      const top = bankSection(side, s, 0),
        toe = bankSection(side, s, 1);
      expect(top.y).toBeGreaterThan(GROUND_Y);
      expect(toe.y).toBeLessThan(WATER_LEVEL);
      expect(Math.abs(toe.d - shoreDepth(side, s))).toBeLessThan(0.09);
    }
});
it("closes each shoreline with a solid face and confines foundations to the bridge ends", () => {
  for (const side of ["far", "near"] as const) {
    const bank = buildBankFace(side),
      box = new THREE.Box3().setFromObject(bank);
    expect(box.max.y).toBeGreaterThan(GROUND_Y);
    expect(box.min.y).toBeLessThan(WATER_LEVEL);
    bank.traverse((n) => {
      if (n instanceof THREE.Mesh) n.geometry.dispose();
    });
  }
  const abutments = buildBridgeFoundations();
  for (const brick of abutments.children) {
    const box = new THREE.Box3().setFromObject(brick);
    expect(Math.min(Math.abs(box.min.x), Math.abs(box.max.x))).toBeGreaterThan(
      BRIDGE.length / 2 - 1.5,
    );
    expect(box.max.y).toBeLessThan(
      bridgeHeight(Math.min(Math.abs(box.min.x), Math.abs(box.max.x))),
    );
  }
});
it("uses coarse figures for the complete scroll and hysteresis between all three budgets", () => {
  expect(figureDetail(25)).toBe(0);
  expect(figureDetail(55)).toBe(1);
  expect(figureDetail(180)).toBe(2);
  expect(figureDetail(35, 0)).toBe(0);
  expect(figureDetail(35, 1)).toBe(1);
  expect(figureDetail(80, 2)).toBe(2);
  expect(figureDetail(80, 1)).toBe(1);
});
it("adds real open-front outerwear and facial relief only when detail can be seen", () => {
  const make = (variant: number, detail: 0 | 1 | 2) =>
    buildFigure(new THREE.Group(), variant, false, detail, () => {});
  const low = make(6, 0),
    close = make(6, 2);
  expect(low.getObjectByName("open-front-beizi")).toBeUndefined();
  const coat = close.getObjectByName("open-front-beizi") as THREE.Mesh;
  expect(coat).toBeDefined();
  const position = coat.geometry.getAttribute("position"),
    index = coat.geometry.index!;
  // No triangle bridges the front gap: the inner blouse/skirt remains exposed.
  for (let i = 0; i < index.count; i += 3) {
    const xs = [0, 1, 2].map((j) => position.getX(index.getX(i + j)));
    const zs = [0, 1, 2].map((j) => position.getZ(index.getX(i + j)));
    expect(
      xs.some((x) => x < 0) &&
        xs.some((x) => x > 0) &&
        zs.every((z) => z > 0.015),
    ).toBe(false);
  }
  expect(close.getObjectByName("shaped-nose")).toBeDefined();
  expect(low.getObjectByName("shaped-nose")).toBeUndefined();
  const triangles = (g: THREE.Group) => {
    let n = 0;
    g.traverse((o) => {
      if (o instanceof THREE.Mesh)
        n +=
          (o.geometry.index?.count ??
            o.geometry.getAttribute("position").count) / 3;
    });
    return n;
  };
  expect(triangles(low)).toBeLessThan(triangles(close) * 0.12);
});
