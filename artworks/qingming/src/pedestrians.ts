import {
  BRIDGE,
  BRIDGE_PEOPLE_PER_SIDE,
  HALLS,
  onBank,
  GROUND_Y,
  bridgeHeight,
  bridgePoint,
  streetAngle,
  shoreDepth,
} from "./passageLayout";
import {
  BANK_LOOPS,
  bankCenter,
  STATIC_OBSTACLES,
  WALKER_RADIUS,
  PERSON_RADIUS,
} from "./passageSpace";
import { activityClock, randomUnit } from "./peopleMotion";

// One population spans both streets and the bridge. The bank paths have their
// own population, so the streets no longer empty out at the bridge landings.
export const MAIN_STREET_WALKERS = 156;
export const WALKER_COUNT = MAIN_STREET_WALKERS + 48;
const STEP = 0.2,
  // Include interpolation clearance between fixed steps, including bank bends.
  GAP = 0.34,
  EDGE = 40;
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
// Near each curved landing, a long cart sweeps farther sideways than its
// half-width. Reserve its complete swept rectangle before placing walking lanes.
const laneFloors = new Map<number, number>();
function laneFloor(q: number, side: number) {
  if (Math.abs(Math.abs(q) - BRIDGE.length / 2) > 3.7) return 0.51;
  const rounded = Math.round(q * 40) / 40,
    key = Math.round(q * 40) * 2 + (side > 0 ? 1 : 0);
  const cached = laneFloors.get(key);
  if (cached !== undefined) return cached;
  function gap(lateral: number) {
    const p = bridgePoint(rounded, side * lateral);
    let minimum = Infinity;
    for (let k = -24; k <= 24; k++) {
      const cq = rounded + k * 0.075,
        c = bridgePoint(cq),
        a = streetAngle(cq),
        ds = p.s - c.s,
        dd = p.d - c.d;
      minimum = Math.min(
        minimum,
        Math.hypot(
          Math.max(0, Math.abs(ds * Math.cos(a) + dd * Math.sin(a)) - 1.35),
          Math.max(0, Math.abs(-ds * Math.sin(a) + dd * Math.cos(a)) - 0.32),
        ),
      );
    }
    return minimum;
  }
  let lo = 0.51,
    hi = 0.89;
  for (let i = 0; i < 10; i++) {
    const m = (lo + hi) / 2;
    if (gap(m) < WALKER_RADIUS + 0.04) lo = m;
    else hi = m;
  }
  const floor = hi;
  laneFloors.set(key, floor);
  return floor;
}
function actualLateral(index: number, q: number, lateral: number) {
  return Math.max(lateral, laneFloor(q, index % 2 ? 1 : -1));
}

// Broad-phase cells avoid scanning every house and prop on each fixed step.
let obstacleCount = -1;
type Bounds = {
  s: number;
  d: number;
  r: number;
  h?: (typeof HALLS)[number];
  c?: number;
  sn?: number;
};
const environment = new Map<string, Bounds[]>();
function prepareEnvironment() {
  if (obstacleCount === STATIC_OBSTACLES.length) return;
  obstacleCount = STATIC_OBSTACLES.length;
  environment.clear();
  const add = (o: Bounds) => {
    for (
      let x = Math.floor(o.s - o.r - 0.5);
      x <= Math.floor(o.s + o.r + 0.5);
      x++
    )
      for (
        let z = Math.floor(o.d - o.r - 0.5);
        z <= Math.floor(o.d + o.r + 0.5);
        z++
      ) {
        const k = x + ":" + z,
          a = environment.get(k) ?? [];
        a.push(o);
        environment.set(k, a);
      }
  };
  HALLS.forEach((h) =>
    add({
      s: h.s,
      d: h.d,
      r: Math.hypot(h.width / 2 + 0.2, h.depth / 2 + 0.23),
      h,
      c: Math.cos(h.angle),
      sn: Math.sin(h.angle),
    }),
  );
  STATIC_OBSTACLES.forEach((o) => add({ s: o.s, d: o.d, r: o.radius }));
  for (let i = 0; i < BRIDGE_PEOPLE_PER_SIDE * 2; i++) {
    const x =
        -BRIDGE.length / 2 +
        0.4 +
        (Math.floor(i / 2) * (BRIDGE.length - 0.8)) /
          (BRIDGE_PEOPLE_PER_SIDE - 1),
      p = bridgePoint(x, i % 2 ? 1.32 : -1.32);
    add({ ...p, r: PERSON_RADIUS + 0.008 });
  }
}
function environmentClear(
  p: { s: number; d: number },
  index: number,
  q: number,
) {
  if (index >= MAIN_STREET_WALKERS) {
    if (!onBank(bankRoute(index).side, p, 0.08)) return false;
  } else if (
    Math.abs(q) > BRIDGE.length / 2 + 0.05 &&
    !onBank(q < 0 ? "near" : "far", p, 0.02)
  )
    return false;
  for (const o of environment.get(Math.floor(p.s) + ":" + Math.floor(p.d)) ??
    []) {
    if (o.h) {
      const ds = p.s - o.s,
        dd = p.d - o.d,
        u = ds * o.c! + dd * o.sn!,
        v = -ds * o.sn! + dd * o.c!;
      if (
        Math.hypot(
          Math.max(0, Math.abs(u) - o.h.width / 2 - 0.2),
          Math.max(0, Math.abs(v) - o.h.depth / 2 - 0.23),
        ) <
        WALKER_RADIUS + 0.045
      )
        return false;
    } else if (Math.hypot(p.s - o.s, p.d - o.d) < o.r + WALKER_RADIUS + 0.035)
      return false;
  }
  return true;
}
function location(index: number, q: number, lateral: number) {
  if (index < MAIN_STREET_WALKERS)
    return {
      ...bridgePoint(
        q,
        (index % 2 ? 1 : -1) * actualLateral(index, q, lateral),
      ),
      y: bridgeHeight(q),
      angle: streetAngle(q),
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
  prepareEnvironment();
  const actors: Actor[] = [],
    placed: { s: number; d: number }[] = [];
  for (let i = 0; i < WALKER_COUNT; i++) {
    const id = i + seed * 101,
      main = i < MAIN_STREET_WALKERS;
    const desired = main
      ? -24 +
        ((Math.floor(i / 2) + 0.15 + randomUnit(id, 1) * 0.45) /
          (MAIN_STREET_WALKERS / 2)) *
          48
      : ((Math.floor((i - MAIN_STREET_WALKERS) / 4) +
          0.2 +
          randomUnit(id, 1) * 0.6) /
          12) *
        perimeter(i);
    const direction = main && randomUnit(id, 2) < 0.5 ? -1 : 1,
      lateral = direction > 0 ? 0.52 : 0.88;
    let q = desired,
      p = location(i, q, lateral),
      found = false;
    for (let attempt = 0; attempt < 2400; attempt++) {
      q = main
        ? Math.max(
            -24,
            Math.min(
              24,
              desired + (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * 0.08,
            ),
          )
        : (desired + attempt * 0.08) % perimeter(i);
      p = location(i, q, lateral);
      if (
        environmentClear(p, i, q) &&
        placed.every((o) => Math.hypot(o.s - p.s, o.d - p.d) >= GAP)
      ) {
        found = true;
        break;
      }
    }
    if (!found) throw new Error("No clear initial walking site for " + i);
    placed.push(p);
    actors.push({
      q,
      lateral,
      direction,
      speed: 0.14 + randomUnit(id, 5) * 0.1,
      stride: 0,
      heading: p.angle + (direction < 0 ? Math.PI : 0),
      moving: false,
      scheduled: activityClock(i, 0, seed).moving,
      recycled: false,
    });
  }
  return actors;
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
    // Extended hidden approaches retain numeric cell keys.
    cell = (p: { s: number; d: number }) =>
      Math.floor(p.s / 0.5) * 256 + Math.floor(p.d / 0.5);
  points.forEach((p, i) => {
    const key = cell(p);
    if (!grid.has(key)) grid.set(key, new Set());
    grid.get(key)!.add(i);
  });
  function clear(p: { s: number; d: number }, index: number, q: number) {
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
    return environmentClear(p, index, q);
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
      const nextPoint = location(i, old.q + 0.01, old.lateral);
      const metric = Math.max(
        1,
        Math.hypot(nextPoint.s - points[i].s, nextPoint.d - points[i].d) / 0.01,
      );
      const distance = (a.direction * a.speed * STEP) / metric;
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
        if (!clear(p, i, q)) continue;
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
    // A quay walk turns back at a building or occupied bank stretch.
    if (i >= MAIN_STREET_WALKERS && scheduled && !a.moving) a.direction *= -1;
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
