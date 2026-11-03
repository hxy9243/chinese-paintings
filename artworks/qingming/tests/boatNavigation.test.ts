import { describe, expect, it } from "vitest";
import { BOATS, TERRAIN_BOUNDS, shoreDepth } from "../src/passageLayout";
import { MOORED_BOATS } from "../src/moorings";
import { boatPose } from "../src/passageLife";
import {
  BOAT_PERIOD,
  BOAT_SPEED,
  CHANNEL,
  CHANNEL_WIDTH,
  ROUTE_STEP,
} from "../src/boatNavigation";
import { vesselFootprint } from "./helpers/vesselGeometry";

type Hull = { s: number; d: number; angle: number; length: number; width: number; cabin: boolean };
// Rendered footprint in plan: native +z runs along the keel, +x to starboard.
function footprint(h: Hull) {
  return vesselFootprint(h.length, h.width, h.cabin).map((v) => ({
    s: h.s + v.z * Math.cos(h.angle) + v.x * Math.sin(h.angle),
    d: h.d + v.z * Math.sin(h.angle) - v.x * Math.cos(h.angle),
  }));
}
// Separating-axis gap between two convex footprints (negative when they overlap).
function gap(a: Hull, b: Hull) {
  const A = footprint(a),
    B = footprint(b);
  let separation = -Infinity;
  for (const poly of [A, B])
    for (let i = 0; i < poly.length; i += 2) {
      const p = poly[i],
        q = poly[(i + 2) % poly.length],
        length = Math.hypot(q.s - p.s, q.d - p.d);
      if (length < 1e-7) continue;
      const x = -(q.d - p.d) / length,
        y = (q.s - p.s) / length;
      const pa = A.map((p) => p.s * x + p.d * y),
        pb = B.map((p) => p.s * x + p.d * y);
      separation = Math.max(
        separation,
        Math.min(...pb) - Math.max(...pa),
        Math.min(...pa) - Math.max(...pb),
      );
    }
  return separation;
}
const hullAt = (i: number, t: number): Hull => ({ ...BOATS[i], ...boatPose(i, t) });

describe("navigation along the shoreline-derived channel", () => {
  it("traces a centreline down the west reach, round the bend and out past the east crop", () => {
    expect(CHANNEL[0].d).toBeLessThan(TERRAIN_BOUNDS.dMin);
    expect(CHANNEL.at(-1)!.s).toBeGreaterThan(TERRAIN_BOUNDS.sMax);
    CHANNEL.forEach((p, i) => {
      expect(p.d, `centre ${i}`).toBeGreaterThan(shoreDepth("far", p.s) + 2);
      expect(p.d, `centre ${i}`).toBeLessThan(shoreDepth("near", p.s) - 2);
      // Mid-channel: neither bank is more than twice as far as the other.
      const { left, right } = CHANNEL_WIDTH[i];
      expect(Math.max(left, right) / Math.min(left, right), `centre ${i}`).toBeLessThan(2.2);
      if (i) expect(Math.hypot(p.s - CHANNEL[i - 1].s, p.d - CHANNEL[i - 1].d)).toBeCloseTo(ROUTE_STEP, 2);
    });
  });

  it("moves every boat over time", () => {
    BOATS.forEach((_, i) => {
      const a = boatPose(i, 0),
        b = boatPose(i, 30);
      expect(Math.hypot(a.s - b.s, a.d - b.d), `boat ${i}`).toBeGreaterThan(BOAT_SPEED * 30 * 0.6);
    });
  });

  it("keeps every rendered hull between the banks along the whole route", () => {
    for (let i = 0; i < BOATS.length; i++) {
      let bankGap = Infinity,
        where = "";
      // One sample per route step covers the full passage, including recycling.
      for (let t = 0; t < BOAT_PERIOD; t += ROUTE_STEP / BOAT_SPEED / 2) {
        const h = hullAt(i, t);
        for (const p of footprint(h)) {
          const g = Math.min(p.d - shoreDepth("far", p.s), shoreDepth("near", p.s) - p.d);
          if (g < bankGap) {
            bankGap = g;
            where = `t ${t} at ${p.s.toFixed(2)},${p.d.toFixed(2)}`;
          }
        }
      }
      expect(bankGap, `boat ${i} ${where}`).toBeGreaterThan(0.02);
    }
  });

  it("never lets passing boats overlap each other or the moored hulls", () => {
    let boatGap = Infinity,
      mooredGap = Infinity;
    const reach = (h: { length: number }) => h.length * 0.62;
    for (let t = 0; t < BOAT_PERIOD; t += 0.5) {
      const hulls = BOATS.map((_, i) => hullAt(i, t));
      hulls.forEach((a, i) => {
        for (const b of hulls.slice(i + 1))
          if (Math.hypot(a.s - b.s, a.d - b.d) < reach(a) + reach(b))
            boatGap = Math.min(boatGap, gap(a, b));
        for (const m of MOORED_BOATS)
          if (Math.hypot(a.s - m.s, a.d - m.d) < reach(a) + reach(m))
            mooredGap = Math.min(mooredGap, gap(a, m));
      });
    }
    expect(boatGap).toBeGreaterThan(0.1);
    expect(mooredGap).toBeGreaterThan(0.08);
  });
});
