import { describe, expect, it } from "vitest";
import { MAIN_STREET_WALKERS, pedestrianPoses } from "../src/pedestrians";
import { BRIDGE, shoreDepth } from "../src/passageLayout";
import { createBoatWakes } from "../src/boatWakes";
import { waterHeight } from "../src/riverSurface";
import { REFERENCE_AZIMUTH } from "../src/scrollLayout";

describe("irregular street journeys and painted wakes", () => {
  it("pauses and reverses real walkers, and recycles only beyond the visible terrain", () => {
    let previous = pedestrianPoses(0, 9243),
      wraps = 0;
    const stopped = new Set<number>(),
      reversed = new Set<number>();
    const initialDirection = previous.map((p) =>
      Math.sign(Math.cos(p.angle - BRIDGE.angle)),
    );
    for (let t = 0.5; t < 900; t += 0.5) {
      const people = pedestrianPoses(t, 9243);
      people.forEach((p, i) => {
        const distance = Math.hypot(p.s - previous[i].s, p.d - previous[i].d);
        if (distance > 1) {
          expect(Math.abs(p.d)).toBeGreaterThan(20);
          expect(Math.abs(previous[i].d)).toBeGreaterThan(20);
          wraps++;
        } else expect(distance).toBeLessThan(0.2);
        if (i < MAIN_STREET_WALKERS) {
          if (!p.moving) stopped.add(i);
          const traveled =
            (p.s - previous[i].s) * Math.cos(BRIDGE.angle) +
            (p.d - previous[i].d) * Math.sin(BRIDGE.angle);
          if (distance < 1 && traveled * initialDirection[i] < -0.001)
            reversed.add(i);
        }
      });
      previous = people;
    }
    expect(stopped.size).toBe(MAIN_STREET_WALKERS);
    expect(reversed.size).toBeGreaterThan(MAIN_STREET_WALKERS * 0.8);
    expect(wraps).toBeGreaterThan(0);
  }, 30000);
  it("replays the same absolute time after seeking and different frame cadences", () => {
    const expected = pedestrianPoses(12.345, 7);
    pedestrianPoses(80, 7);
    expect(pedestrianPoses(12.345, 7)).toEqual(expected);
    pedestrianPoses(0, 7);
    for (let t = 0; t < 12; t += 0.137) pedestrianPoses(t, 7);
    expect(pedestrianPoses(12.345, 7)).toEqual(expected);
    expect(pedestrianPoses(12.345, 99)).not.toEqual(expected);
  });
  it("keeps fading wake ribbons on the water and freezes reused buffers at a fixed time", () => {
    const wakes = createBoatWakes(),
      geometry = wakes.mesh.geometry;
    wakes.update(32);
    const positions = geometry.getAttribute("position"),
      opacity = geometry.getAttribute("opacity");
    for (let i = 0; i < positions.count; i++) {
      expect(Number.isFinite(positions.getX(i))).toBe(true);
      expect(positions.getY(i)).toBeGreaterThan(-.065);
      expect(positions.getY(i)).toBeLessThan(-.008);
      expect(opacity.getX(i)).toBeGreaterThanOrEqual(0);
      expect(opacity.getX(i)).toBeLessThanOrEqual(0.55);
      if (opacity.getX(i) === 0) continue;
      const x = positions.getX(i),
        z = positions.getZ(i);
      const s =
        x * Math.cos(REFERENCE_AZIMUTH) - z * Math.sin(REFERENCE_AZIMUTH);
      const d =
        x * Math.sin(REFERENCE_AZIMUTH) + z * Math.cos(REFERENCE_AZIMUTH);
      expect(positions.getY(i)-waterHeight(s,d,32)).toBeCloseTo(.010,1);
      expect(d).toBeGreaterThan(shoreDepth("far", s));
      expect(d).toBeLessThan(shoreDepth("near", s));
    }
    expect(opacity.getX(0)).toBeGreaterThan(opacity.getX(39 * 6));
    const at32 = Array.from(positions.array),
      alpha32 = Array.from(opacity.array);
    wakes.update(32);
    expect(Array.from(positions.array)).toEqual(at32);
    expect(Array.from(opacity.array)).toEqual(alpha32);
    wakes.update(38);
    expect(Array.from(positions.array)).not.toEqual(at32);
    expect(wakes.mesh.geometry).toBe(geometry);
    geometry.dispose();
    wakes.mesh.material.dispose();
  });
});
