import { describe, it, expect } from "vitest";
import { BRIDGE, bridgeHeight, bridgePoint } from "../src/passageLayout";
import { BRIDGE_WALKERS, walkPose } from "../src/passageLife";
import { paintMaterial } from "../src/paintMaterial";
import { setScenePalette, paletteAmount } from "../src/scenePalette";
import { ROAD_SEGMENTS } from "../src/roadSurface";
import { segmentDistance } from "../src/passageSpace";
const local = (p: { s: number; d: number }) => ({
  u:
    (p.s - BRIDGE.center.s) * Math.cos(BRIDGE.angle) +
    (p.d - BRIDGE.center.d) * Math.sin(BRIDGE.angle),
  v:
    -(p.s - BRIDGE.center.s) * Math.sin(BRIDGE.angle) +
    (p.d - BRIDGE.center.d) * Math.cos(BRIDGE.angle),
});
describe("full-span bridge flow and connected mud roads", () => {
  it("keeps a moving crowd across the length and both inner/outer footways of the actual span", () => {
    for (let t = 0; t < 180; t += 2.7) {
      const poses = Array.from({ length: BRIDGE_WALKERS }, (_, i) =>
        walkPose(i, t, 9243),
      );
      const span = poses
        .map(local)
        .filter((p) => Math.abs(p.u) < BRIDGE.length / 2 - 0.2);
      expect(span.length).toBeGreaterThanOrEqual(72);
      for (const third of [-1, 0, 1])
        expect(
          span.filter((p) => Math.abs(p.u - third * 3.3) < 1.65).length,
        ).toBeGreaterThan(15);
      for (const side of [-1, 1])
        for (const inner of [true, false])
          expect(
            span.filter(
              (p) => Math.sign(p.v) === side && Math.abs(p.v) < 0.68 === inner,
            ).length,
          ).toBeGreaterThan(12);
      poses.forEach((p, i) => {
        const q = walkPose(i, t + 0.5, 9243);
        expect(Math.hypot(q.s - p.s, q.d - p.d)).toBeGreaterThan(0.065);
        expect(p.y).toBeCloseTo(bridgeHeight(local(p).u));
      });
    }
  });
  it("joins the bank roads into both bridge approaches without a raised overlay mesh", () => {
    for (const side of [-1, 1]) {
      const anchor = bridgePoint(side * (BRIDGE.length / 2 + 0.4));
      expect(
        Math.min(
          ...ROAD_SEGMENTS.map((r) => segmentDistance(anchor, r) - r.width),
        ),
      ).toBeLessThan(0);
    }
    for (const r of ROAD_SEGMENTS.slice(1))
      for (const p of [r.a, r.b])
        if (Math.abs(p.s) < 21.9)
          expect(
            ROAD_SEGMENTS.some(
              (other) => other !== r && segmentDistance(p, other) < r.width,
            ),
          ).toBe(true);
    const bank = paintMaterial(0xb09a6d, true, true),
      water = paintMaterial(0xcfbd8e, true);
    expect(bank.uniforms.bank.value).toBe(1);
    expect(water.uniforms.bank.value).toBe(0);
    bank.dispose();
    water.dispose();
  });
  it("switches shared material uniforms without rebuilding geometry and restores original pigments", () => {
    const roof = paintMaterial(0x786746),
      wood = paintMaterial(0x9f814f),
      water = paintMaterial(0xcfbd8e, true);
    const original = roof.uniforms.pigment.value.clone();
    setScenePalette("indigo-amber");
    expect(paletteAmount.value).toBe(1);
    expect(roof.uniforms.alternatePigment.value.b).toBeGreaterThan(
      roof.uniforms.alternatePigment.value.r,
    );
    expect(wood.uniforms.alternatePigment.value.r).toBeGreaterThan(
      wood.uniforms.alternatePigment.value.b,
    );
    expect(water.uniforms.alternatePigment.value.g).toBeGreaterThan(
      water.uniforms.alternatePigment.value.r,
    );
    setScenePalette("silk");
    expect(paletteAmount.value).toBe(0);
    expect(roof.uniforms.pigment.value).toEqual(original);
    for (const m of [roof, wood, water]) m.dispose();
  });
});
