import {BUILDING_KINDS} from "../src/passageLife";
import { FIGURE_HEIGHT } from "../src/figures";
import { describe, expect, it } from "vitest";
import {
  BRIDGE,
  passageOutline,
  BOATS,
  HALLS,
  GROUND_Y,
  PERSON_SCALE,
  bridgePoint,
  bridgeHeight,
  onBank,
  roofFootprint,
  shoreDepth,
} from "../src/passageLayout";

describe("reference passage geometry", () => {
  it("rounds the outer corners and turns the bridge across the bank", () => {
    const outline = passageOutline();
    expect(outline.length).toBeGreaterThan(60);
    expect(
      outline.some(([s, d]) => Math.abs(s) === 22 && Math.abs(d) === 14),
    ).toBe(false);
    const tangent = Math.atan(
      (shoreDepth("far", BRIDGE.far.s + 1) -
        shoreDepth("far", BRIDGE.far.s - 1)) /
        2,
    );
    const crossAngle = (Math.abs(BRIDGE.angle - tangent) * 180) / Math.PI;
    expect(Math.abs(crossAngle - 90)).toBeLessThan(10);
  });
  it("keeps every roof overhang on its own riverbank", () => {
    for (const h of HALLS)
      for (const p of roofFootprint(h)) {
        expect(
          onBank(h.side, p, 0.24),
          `house at ${h.s}, roof at ${p.s},${p.d}`,
        ).toBe(true);
        expect(Math.abs(p.s)).toBeLessThan(22);
        expect(Math.abs(p.d)).toBeLessThan(14);
      }
  });
  it("leaves space between neighboring roofs", () => {
    for (let i = 0; i < HALLS.length; i++)
      for (let j = i + 1; j < HALLS.length; j++) {
        const a = HALLS[i],
          b = HALLS[j];
        const separated = [
          a.angle,
          a.angle + Math.PI / 2,
          b.angle,
          b.angle + Math.PI / 2,
        ].some((angle) => {
          const project = (h: typeof a) =>
            roofFootprint(h).map(
              (p) => p.s * Math.cos(angle) + p.d * Math.sin(angle),
            );
          const pa = project(a),
            pb = project(b);
          return (
            Math.max(...pa) + 0.08 < Math.min(...pb) ||
            Math.max(...pb) + 0.08 < Math.min(...pa)
          );
        });
        expect
          .soft(separated, `roofs ${a.s},${a.d} and ${b.s},${b.d}`)
          .toBe(true);
      }
  });
  it("seats the entire bridge landing width on both banks", () => {
    for (const [sign, side] of [
      [-1, "near"],
      [1, "far"],
    ] as const) {
      for (let i = 0; i <= 20; i++) {
        const p = bridgePoint(
          (sign * BRIDGE.length) / 2,
          (i / 20 - 0.5) * (BRIDGE.width + 0.18),
        );
        expect(onBank(side, p, 0.1), `${side} landing ${p.s},${p.d}`).toBe(
          true,
        );
      }
      expect(bridgeHeight((sign * BRIDGE.length) / 2)).toBeCloseTo(GROUND_Y);
    }
    expect(bridgePoint(-BRIDGE.length / 2).s).toBeCloseTo(BRIDGE.near.s);
    expect(bridgePoint(-BRIDGE.length / 2).d).toBeCloseTo(BRIDGE.near.d);
    expect(bridgePoint(BRIDGE.length / 2).s).toBeCloseTo(BRIDGE.far.s);
    expect(bridgePoint(BRIDGE.length / 2).d).toBeCloseTo(BRIDGE.far.d);
  });
  it("keeps all boat hulls between the shorelines", () => {
    for (const b of BOATS)
      for (let i = 0; i <= 30; i++)
        for (const side of [-1, 1]) {
          const u = (i / 30 - 0.5) * b.length,
            v = side * b.width * 0.66;
          const s = b.s + u * Math.cos(b.angle) - v * Math.sin(b.angle),
            d = b.d + u * Math.sin(b.angle) + v * Math.cos(b.angle);
          expect(d, `boat ${b.s},${b.d}`).toBeGreaterThan(shoreDepth("far", s));
          expect(d, `boat ${b.s},${b.d}`).toBeLessThan(shoreDepth("near", s));
        }
  });
  it("preserves the reference's broad bridge and low roofs relative to people", () => {
    const figureHeight = FIGURE_HEIGHT * PERSON_SCALE;
    expect(BRIDGE.width / BRIDGE.length).toBeGreaterThan(0.2);
    expect(BRIDGE.width / figureHeight).toBeGreaterThan(3.5);
    expect(BRIDGE.width / figureHeight).toBeLessThan(4.1);
    expect(Math.min(...HALLS.map(h=>h.height))*.875).toBeGreaterThan(figureHeight*1.08);
    expect(Math.max(...HALLS.filter((_,i)=>BUILDING_KINDS[i]!=="construction").map((h) => h.height)) / figureHeight).toBeLessThan(
      3,
    );
    expect(bridgeHeight(0)).toBeCloseTo(GROUND_Y + BRIDGE.rise);
  });
});
