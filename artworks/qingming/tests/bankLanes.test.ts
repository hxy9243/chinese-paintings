import { describe, expect, it } from "vitest";
import {
  TERRAIN_BOUNDS,
  shoreDepth,
  type BankSide,
  type PassagePoint,
} from "../src/passageLayout";
import {
  BANK_LANE_MAX_SETBACK,
  BANK_LANE_MIN_SETBACK,
  BANK_LOOPS,
  bankCenter,
  segmentDistance,
  roofClear,
  bankLaneBlocked,
} from "../src/passageSpace";
import { BANK_LANE_RUNS } from "../src/roadSurface";

// The shoreline as a dense polyline, so steep reaches are measured in plan.
const shoreline = Object.fromEntries(
  (["near", "far"] as BankSide[]).map((side) => {
    const points: PassagePoint[] = [];
    for (let s = TERRAIN_BOUNDS.sMin - 2; s <= TERRAIN_BOUNDS.sMax + 2; s += 0.02)
      points.push({ s, d: shoreDepth(side, s) });
    return [side, points.slice(1).map((b, i) => ({ a: points[i], b }))];
  }),
) as Record<BankSide, { a: PassagePoint; b: PassagePoint }[]>;
const setback = (side: BankSide, p: PassagePoint) =>
  Math.min(...shoreline[side].map((segment) => segmentDistance(p, segment)));

describe("set-back bank lanes", () => {
  it("keeps a strip of natural bank between every walking lane and the water", () => {
    for (const loop of BANK_LOOPS)
      for (let s = loop.start; s <= loop.end; s += 0.25) {
        const p = { s, d: bankCenter(loop.side, s) },
          gap = setback(loop.side, p);
        expect(gap, `${loop.side} lane at ${s.toFixed(2)}`).toBeGreaterThanOrEqual(
          BANK_LANE_MIN_SETBACK - 0.01,
        );
        expect(gap, `${loop.side} lane at ${s.toFixed(2)}`).toBeLessThanOrEqual(
          BANK_LANE_MAX_SETBACK + 0.05,
        );
        // Walkers either side of the lane centre stay on dry land.
        const sign = loop.side === "near" ? 1 : -1;
        expect(setback(loop.side, { s, d: p.d - sign * 0.4 })).toBeGreaterThan(0.5);
      }
  });
  it("paints the bank roads behind the same setback, not on the shoreline", () => {
    expect(BANK_LANE_RUNS.length).toBeGreaterThanOrEqual(2);
    for (const run of BANK_LANE_RUNS) {
      const side: BankSide = run[0].d > shoreDepth("far", run[0].s) ? "near" : "far";
      for (let i = 1; i < run.length; i++)
        for (let t = 0; t <= 1; t += 0.25) {
          const p = {
            s: run[i - 1].s + (run[i].s - run[i - 1].s) * t,
            d: run[i - 1].d + (run[i].d - run[i - 1].d) * t,
          };
          if (p.d < TERRAIN_BOUNDS.dMin || p.d > TERRAIN_BOUNDS.dMax) continue;
          expect(setback(side, p), `${side} road at ${p.s.toFixed(2)}`).toBeGreaterThan(
            BANK_LANE_MIN_SETBACK - 0.08,
          );
        }
    }
  });
  it("follows the bank loosely and keeps walking loops clear of house fronts", () => {
    for (const loop of BANK_LOOPS) {
      const offsets: number[] = [];
      for (let s = loop.start; s <= loop.end; s += 0.5)
        offsets.push(Math.abs(bankCenter(loop.side, s) - shoreDepth(loop.side, s)));
      // The offset varies: the lane is not a copy of the shoreline.
      expect(Math.max(...offsets) - Math.min(...offsets)).toBeGreaterThan(0.1);
    }
    // The far row east of the bridge stands about 1.2 from the water, so no
    // set-back lane fits there; its walkers yield to the houses instead.
    for (const loop of BANK_LOOPS.filter((l) => l !== BANK_LOOPS[3]))
      for (let s = loop.start; s <= loop.end; s += 0.1) {
        expect(bankLaneBlocked(loop.side, s), `${loop.side} ${s}`).toBe(false);
        expect(roofClear({ s, d: bankCenter(loop.side, s) }, 0.3)).toBe(true);
      }
  });
});
