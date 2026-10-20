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
  it("populates the full street and bridge at comparable walking density, with mixed directions and pauses", () => {
    let bridgePopulation = 0,
      streetPopulation = 0,
      pauses = 0,
      forward = 0,
      backward = 0;
    for (let t = 0; t < 300; t += 2.7) {
      const poses = Array.from({ length: BRIDGE_WALKERS }, (_, i) =>
        walkPose(i, t, 9243),
      );
      const span = poses
        .map(local)
        .filter((p) => Math.abs(p.u) < BRIDGE.length / 2 - 0.2);
      expect(span.length).toBeGreaterThanOrEqual(16);
      for (const side of [-1, 1])
        expect(
          span.filter((p) => Math.sign(p.v) === side).length,
        ).toBeGreaterThan(4);
      for (const p of poses) {
        const point = local(p);
        expect(p.y).toBeCloseTo(bridgeHeight(point.u));
        expect(Math.abs(point.v)).toBeGreaterThan(0.5);
        expect(Math.abs(point.v)).toBeLessThan(0.9);
        if (Math.abs(point.u) < BRIDGE.length / 2) bridgePopulation++;
        else if (Math.abs(point.u) < 13.5) streetPopulation++;
        if (!p.moving) pauses++;
        if (Math.cos(p.angle - BRIDGE.angle) > 0) forward++;
        else backward++;
      }
    }
    const ratio =
      streetPopulation /
      (27 - BRIDGE.length) /
      (bridgePopulation / BRIDGE.length);
    expect(ratio).toBeGreaterThan(0.65);
    expect(ratio).toBeLessThan(1.5);
    expect(pauses).toBeGreaterThan(100);
    expect(forward).toBeGreaterThan(100);
    expect(backward).toBeGreaterThan(100);
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
    const c = roof.uniforms.alternatePigment.value;
    expect(Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)).toBeLessThan(
      0.05,
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
