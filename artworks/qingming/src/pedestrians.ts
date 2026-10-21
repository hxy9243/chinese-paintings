import {
  BRIDGE,
  GROUND_Y,
  bridgeHeight,
  bridgePoint,
  shoreDepth,
} from "./passageLayout";
import { BANK_LOOPS, bankCenter } from "./passageSpace";
import { activityClock, randomUnit } from "./peopleMotion";

// One population spans both streets and the bridge. The bank paths have their
// own population, so the streets no longer empty out at the bridge landings.
export const MAIN_STREET_WALKERS = 156;
export const WALKER_COUNT = MAIN_STREET_WALKERS + 48;
const STEP = 0.2,
  // Include interpolation clearance between fixed steps, including bank bends.
  GAP = 0.34,
  EDGE = 24;
type Actor = {
  q: number;
  lateral: number;
  direction: number;
  speed: number;
  stride: number;
  heading: number;
  moving: boolean;
  scheduled: boolean;
  recycled: boolean;
};
export type WalkPose = {
  s: number;
  d: number;
  y: number;
  angle: number;
  moving: boolean;
  stride: number;
};

function bankRoute(index: number) {
  const k = index - MAIN_STREET_WALKERS;
  return BANK_LOOPS[(k % 2) * 2 + (Math.floor(k / 2) % 2)];
}
function perimeter(index: number) {
  const loop = bankRoute(index);
  return 2 * (loop.end - loop.start) + 2 * Math.PI * 0.26;
}
function location(index: number, q: number, lateral: number) {
  if (index < MAIN_STREET_WALKERS)
    return {
      ...bridgePoint(q, (index % 2 ? 1 : -1) * lateral),
      y: bridgeHeight(q),
      angle: BRIDGE.angle,
    };
  const loop = bankRoute(index),
    straight = loop.end - loop.start,
    radius = 0.26;
  q = ((q % perimeter(index)) + perimeter(index)) % perimeter(index);
  let s: number, offset: number, angle: number;
  if (q < straight) {
    s = loop.start + q;
    offset = -radius;
    angle = 0;
  } else if ((q -= straight) < Math.PI * radius) {
    const a = -Math.PI / 2 + q / radius;
    s = loop.end + radius * Math.cos(a);
    offset = radius * Math.sin(a);
    angle = a + Math.PI / 2;
  } else if ((q -= Math.PI * radius) < straight) {
    s = loop.end - q;
    offset = radius;
    angle = Math.PI;
  } else {
    q -= straight;
    const a = Math.PI / 2 + q / radius;
    s = loop.start + radius * Math.cos(a);
    offset = radius * Math.sin(a);
    angle = a + Math.PI / 2;
  }
  const slope =
    (shoreDepth(loop.side, s + 0.01) - shoreDepth(loop.side, s - 0.01)) / 0.02;
  return {
    s,
    d: bankCenter(loop.side, s) + offset,
    y: GROUND_Y,
    angle: Math.atan2(
      Math.sin(angle) + slope * Math.cos(angle),
      Math.cos(angle),
    ),
  };
}
function initial(seed: number): Actor[] {
  return Array.from({ length: WALKER_COUNT }, (_, i) => {
    const id = i + seed * 101,
      main = i < MAIN_STREET_WALKERS;
    const q = main
      ? -EDGE +
        ((Math.floor(i / 2) + 0.15 + randomUnit(id, 1) * 0.45) /
          (MAIN_STREET_WALKERS / 2)) *
          EDGE *
          2
      : ((Math.floor((i - MAIN_STREET_WALKERS) / 4) +
          0.2 +
          randomUnit(id, 1) * 0.6) /
          12) *
        perimeter(i);
    const direction = main && randomUnit(id, 2) < 0.5 ? -1 : 1,
      lateral = direction > 0 ? 0.52 : 0.88;
    return {
      q,
      lateral,
      direction,
      speed: 0.14 + randomUnit(id, 5) * 0.1,
      stride: 0,
      heading: location(i, q, lateral).angle + (direction < 0 ? Math.PI : 0),
      moving: false,
      scheduled: activityClock(i, 0, seed).moving,
      recycled: false,
    };
  });
}
type Timeline = {
  tick: number;
  before: Actor[];
  after: Actor[];
  poses?: WalkPose[];
  time?: number;
};
// Bounded caches keep absolute-time seeking repeatable without accumulating
// frame-rate errors or retaining every historical frame.
const timelines = new Map<number, Timeline>();
function reset(seed: number): Timeline {
  const actors = initial(seed);
  return { tick: 0, before: actors, after: actors };
}
function advance(states: Actor[], time: number, seed: number): Actor[] {
  const next = states.map((a) => ({ ...a, moving: false, recycled: false }));
  const points = states.map((a, i) => location(i, a.q, a.lateral));
  const grid = new Map<number, Set<number>>(),
    // Route coordinates stay within ±24; numeric cell keys avoid per-step strings.
    cell = (p: { s: number; d: number }) =>
      Math.floor(p.s / 0.5) * 256 + Math.floor(p.d / 0.5);
  points.forEach((p, i) => {
    const key = cell(p);
    if (!grid.has(key)) grid.set(key, new Set());
    grid.get(key)!.add(i);
  });
  function clear(p: { s: number; d: number }, index: number) {
    const x = Math.floor(p.s / 0.5),
      z = Math.floor(p.d / 0.5);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const nearby = grid.get((x + dx) * 256 + z + dz);
        if (!nearby) continue;
        for (const other of nearby)
          if (
            other !== index &&
            (points[other].s - p.s) ** 2 + (points[other].d - p.d) ** 2 <
              GAP * GAP
          )
            return false;
      }
    return true;
  }
  // Rotate priority deterministically; a long-lived actor never owns right of way.
  const first = Math.floor(time / STEP) % states.length;
  for (let k = 0; k < states.length; k++) {
    const i = (first + k) % states.length,
      a = next[i],
      old = states[i],
      id = i + seed * 101;
    const scheduled = activityClock(i, time, seed).moving;
    if (
      i < MAIN_STREET_WALKERS &&
      scheduled &&
      !old.scheduled &&
      randomUnit(id, Math.floor(time / 18) + 80) < 0.27
    )
      a.direction *= -1;
    a.scheduled = scheduled;
    if (scheduled) {
      const main = i < MAIN_STREET_WALKERS;
      const variation = randomUnit(id, Math.floor(time / 18) + 55) * 0.04;
      const target =
        (a.direction > 0 ? 0.53 + variation : 0.87 - variation) +
        Math.sin(time * 0.19 + id) * 0.018;
      const lateralStep = Math.max(
        -0.09 * STEP,
        Math.min(0.09 * STEP, target - a.lateral),
      );
      const distance = a.direction * a.speed * STEP;
      // Try a normal step, a slower step and then a small passing sidestep.
      for (const [forward, sideways] of [
        [1, lateralStep],
        [0.5, lateralStep],
        [0, lateralStep],
        [0, -lateralStep || 0.08 * STEP],
      ]) {
        let q = old.q + distance * forward;
        const lateral = main
          ? Math.max(0.51, Math.min(0.89, old.lateral + sideways))
          : old.lateral;
        const recycled = main && Math.abs(q) > EDGE;
        if (recycled) q -= Math.sign(q) * EDGE * 2;
        if (forward === 0 && Math.abs(lateral - old.lateral) < 0.00001)
          continue;
        const p = location(i, q, lateral);
        if (!clear(p, i)) continue;
        grid.get(cell(points[i]))!.delete(i);
        const traveled = recycled
          ? Math.abs(distance * forward)
          : Math.hypot(p.s - points[i].s, p.d - points[i].d);
        points[i] = p;
        const key = cell(p);
        if (!grid.has(key)) grid.set(key, new Set());
        grid.get(key)!.add(i);
        a.q = q;
        a.lateral = lateral;
        a.recycled = recycled;
        a.stride += traveled * 15;
        a.moving = traveled > 0.00001;
        break;
      }
    }
    const desired =
      location(i, a.q, a.lateral).angle + (a.direction < 0 ? Math.PI : 0);
    const turn = Math.atan2(
      Math.sin(desired - old.heading),
      Math.cos(desired - old.heading),
    );
    a.heading = old.heading + Math.max(-2 * STEP, Math.min(2 * STEP, turn));
  }
  return next;
}
export function pedestrianPoses(time: number, seed = 0): WalkPose[] {
  time = Math.max(0, time);
  const tick = Math.floor(time / STEP) + 1;
  let line = timelines.get(seed);
  if (!line || tick < line.tick) {
    line = reset(seed);
    timelines.set(seed, line);
  }
  if (line.time === time && line.poses) return line.poses;
  while (line.tick < tick) {
    line.before = line.after;
    line.after = advance(line.before, (line.tick + 1) * STEP, seed);
    line.tick++;
  }
  const t = Math.max(0, Math.min(1, (time - (line.tick - 1) * STEP) / STEP));
  line.poses = line.after.map((b, i) => {
    const a = line!.before[i],
      blend = b.recycled ? (t < 0.5 ? 0 : 1) : t;
    const q = a.q + (b.q - a.q) * blend;
    const p = location(i, q, a.lateral + (b.lateral - a.lateral) * blend);
    return {
      ...p,
      angle: a.heading + (b.heading - a.heading) * t,
      moving: b.moving,
      stride: a.stride + (b.stride - a.stride) * t,
    };
  });
  line.time = time;
  if (timelines.size > 4) timelines.delete(timelines.keys().next().value!);
  return line.poses;
}
