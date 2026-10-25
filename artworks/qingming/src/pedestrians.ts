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
import {
  JOIN_LANES,
  JOIN_SIDE,
  RIDER_RADIUS,
  riderDiscs,
  routeSample,
  streetClear,
  streetRoutes,
} from "./streetRoutes";

// One population spans both streets and the bridge. The bank paths have their
// own population, so the streets no longer empty out at the bridge landings.
// The western street network (crossroads streets, turning routes and the shop
// street that joins the main street and crosses the bridge) has a third
// population, plus a few riders on horseback in the same simulation.
export const MAIN_STREET_WALKERS = 128;
export const BANK_WALKERS = 48;
// Walkers per western route, in streetRoutes() order.
export const WEST_ROUTE_WALKERS = [34, 28, 20, 20, 22] as const;
export const WEST_STREET_WALKERS = WEST_ROUTE_WALKERS.reduce((a, b) => a + b, 0);
export const BANK_START = MAIN_STREET_WALKERS;
export const WEST_START = BANK_START + BANK_WALKERS;
export const WALKER_COUNT = WEST_START + WEST_STREET_WALKERS;
// Riders on the crossroads streets, by route index (riders keep to the middle).
export const STREET_RIDER_ROUTES = [1, 2, 3] as const;
export const STREET_RIDERS = STREET_RIDER_ROUTES.length;
export const ACTOR_COUNT = WALKER_COUNT + STREET_RIDERS;
// Unhurried strolling pace in plan units per second (a figure is 0.85 tall).
export const WALK_SPEED = { min: 0.28, max: 0.42 };
export const RIDE_SPEED = { min: 0.3, max: 0.36 };
const STEP = 0.2,
  // Interpolation clearance between fixed steps, including bank bends.
  MARGIN = 0.06,
  CELL = 0.6,
  // A street walker or rider stuck this many steps turns back.
  PATIENCE = 20,
  // Steps spent in the other lane when overtaking someone who has stopped.
  PASSING = 15,
  EDGE = 40;
type Kind = "main" | "bank" | "route";
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
  blocked: number;
  passing: number;
};
export type WalkPose = {
  s: number;
  d: number;
  y: number;
  angle: number;
  // Direction of the path itself; riders' footprints follow it.
  track?: number;
  moving: boolean;
  stride: number;
};
type Spot = { s: number; d: number; y: number; angle: number };
type Disc = { s: number; d: number; radius: number };

function kind(index: number): Kind {
  return index < BANK_START ? "main" : index < WEST_START ? "bank" : "route";
}
export function isRider(index: number) {
  return index >= WALKER_COUNT;
}
export function routeIndex(index: number) {
  if (isRider(index)) return STREET_RIDER_ROUTES[index - WALKER_COUNT];
  let k = index - WEST_START;
  for (let r = 0; r < WEST_ROUTE_WALKERS.length; r++) {
    if (k < WEST_ROUTE_WALKERS[r]) return r;
    k -= WEST_ROUTE_WALKERS[r];
  }
  throw new Error("Not a street walker: " + index);
}
function routeMember(index: number) {
  if (isRider(index))
    return {
      k: STREET_RIDER_ROUTES.slice(0, index - WALKER_COUNT).filter(
        (r) => r === routeIndex(index),
      ).length,
      count: STREET_RIDER_ROUTES.filter((r) => r === routeIndex(index)).length,
    };
  const r = routeIndex(index);
  let start = WEST_START;
  for (let j = 0; j < r; j++) start += WEST_ROUTE_WALKERS[j];
  return { k: index - start, count: WEST_ROUTE_WALKERS[r] };
}
function route(index: number) {
  return streetRoutes()[routeIndex(index)];
}
function bankRoute(index: number) {
  const k = index - BANK_START;
  return BANK_LOOPS[(k % 2) * 2 + (Math.floor(k / 2) % 2)];
}
function perimeter(index: number) {
  if (kind(index) === "route") return route(index).length;
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
function mainSpot(q: number, side: number, lateral: number): Spot {
  return {
    ...bridgePoint(q, side * Math.max(lateral, laneFloor(q, side))),
    y: bridgeHeight(q),
    angle: streetAngle(q),
  };
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
function mainEnvironmentClear(p: { s: number; d: number }) {
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
// Street routes continue along the main street past their join.
function onMainPart(index: number, q: number) {
  const r = route(index);
  return r.join && q > r.polyLength ? r.join.x0 + q - r.polyLength : null;
}
function environmentClear(spot: Spot, index: number, q: number) {
  const k = kind(index);
  if (k === "bank") {
    if (!onBank(bankRoute(index).side, spot, 0.08)) return false;
    return mainEnvironmentClear(spot);
  }
  const x = k === "main" ? q : onMainPart(index, q);
  if (x !== null) {
    if (
      Math.abs(x) > BRIDGE.length / 2 + 0.05 &&
      !onBank(x < 0 ? "near" : "far", spot, 0.02)
    )
      return false;
    return mainEnvironmentClear(spot);
  }
  return discs(index, spot).every((c) => streetClear(c, c.radius));
}
function location(index: number, q: number, lateral: number): Spot {
  const k = kind(index);
  if (k === "main") return mainSpot(q, index % 2 ? 1 : -1, lateral);
  if (k === "route") {
    const r = route(index),
      x = onMainPart(index, q);
    // u=+1 is the inner lane of the main street's western pair.
    if (x !== null)
      return mainSpot(
        x,
        JOIN_SIDE,
        (JOIN_LANES.inner + JOIN_LANES.outer) / 2 -
          (lateral * (JOIN_LANES.outer - JOIN_LANES.inner)) / 2,
      );
    const p = routeSample(r, q),
      offset = p.c + lateral * p.spread;
    return {
      s: p.s - Math.sin(p.angle) * offset,
      d: p.d + Math.cos(p.angle) * offset,
      y: GROUND_Y,
      angle: p.angle,
    };
  }
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
function discs(index: number, p: Spot): Disc[] {
  return isRider(index)
    ? riderDiscs({ ...p, track: p.angle })
    : [{ s: p.s, d: p.d, radius: WALKER_RADIUS }];
}
function laneTarget(index: number, a: Actor, time: number, id: number) {
  const k = kind(index),
    variation = randomUnit(id, Math.floor(time / 18) + 55) * 0.04,
    sway = Math.sin(time * 0.19 + id);
  // An overtaking walker briefly takes the other lane.
  const lane = a.passing > 0 ? -a.direction : a.direction;
  // The two main-street lanes on each side are only 0.36 apart, barely more
  // than two walkers' clearance; any lateral wander makes opposing walkers
  // collide head-on and knot up, so main-street lanes stay exact.
  if (k === "main") return lane > 0 ? 0.52 : 0.88;
  if (isRider(index)) return sway * 0.08;
  // Keep left; see streetRoutes.
  return (lane > 0 ? 1 : -1) * (0.92 - variation + sway * 0.03);
}
function initial(seed: number): Actor[] {
  prepareEnvironment();
  const actors: Actor[] = [],
    placed: Disc[] = [];
  for (let i = 0; i < ACTOR_COUNT; i++) {
    const id = i + seed * 101,
      k = kind(i),
      main = k === "main";
    let desired: number;
    if (main)
      desired =
        -24 +
        ((Math.floor(i / 2) + 0.15 + randomUnit(id, 1) * 0.45) /
          (MAIN_STREET_WALKERS / 2)) *
          48;
    else if (k === "bank")
      desired =
        ((Math.floor((i - BANK_START) / 4) + 0.2 + randomUnit(id, 1) * 0.6) /
          12) *
        perimeter(i);
    else {
      const m = routeMember(i);
      desired =
        ((m.k + 0.2 + randomUnit(id, 1) * 0.6) / m.count) * perimeter(i);
    }
    const direction = k !== "bank" && randomUnit(id, 2) < 0.5 ? -1 : 1;
    const actor: Actor = {
      q: desired,
      lateral: 0,
      direction,
      speed: isRider(i)
        ? RIDE_SPEED.min + randomUnit(id, 5) * (RIDE_SPEED.max - RIDE_SPEED.min)
        : WALK_SPEED.min + randomUnit(id, 5) * (WALK_SPEED.max - WALK_SPEED.min),
      stride: 0,
      heading: 0,
      moving: false,
      scheduled: activityClock(i, 0, seed).moving,
      recycled: false,
      blocked: 0,
      passing: 0,
    };
    actor.lateral =
      k === "main"
        ? direction > 0
          ? 0.52
          : 0.88
        : k === "route"
          ? laneTarget(i, actor, 0, id)
          : 0;
    let p = location(i, desired, actor.lateral),
      found = false;
    for (let attempt = 0; attempt < 2400; attempt++) {
      const q = main
        ? Math.max(
            -24,
            Math.min(
              24,
              desired + (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * 0.08,
            ),
          )
        : (desired + attempt * 0.08) % perimeter(i);
      p = location(i, q, actor.lateral);
      const mine = discs(i, p);
      if (
        environmentClear(p, i, q) &&
        mine.every((a) =>
          placed.every(
            (b) =>
              Math.hypot(a.s - b.s, a.d - b.d) >= a.radius + b.radius + MARGIN,
          ),
        )
      ) {
        actor.q = q;
        placed.push(...mine);
        found = true;
        break;
      }
    }
    if (!found) throw new Error("No clear initial walking site for " + i);
    actor.heading = p.angle + (direction < 0 ? Math.PI : 0);
    actors.push(actor);
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
const cellKey = (p: { s: number; d: number }) =>
  Math.floor(p.s / CELL) * 256 + Math.floor(p.d / CELL);
function advance(states: Actor[], time: number, seed: number): Actor[] {
  const next = states.map((a) => ({ ...a, moving: false, recycled: false }));
  const points = states.map((a, i) => location(i, a.q, a.lateral));
  const shapes = points.map((p, i) => discs(i, p));
  const grid = new Map<number, Set<number>>();
  const insert = (i: number) =>
    shapes[i].forEach((c) => {
      const key = cellKey(c);
      if (!grid.has(key)) grid.set(key, new Set());
      grid.get(key)!.add(i);
    });
  const remove = (i: number) =>
    shapes[i].forEach((c) => grid.get(cellKey(c))?.delete(i));
  shapes.forEach((_, i) => insert(i));
  function clear(p: Spot, index: number, q: number) {
    for (const c of discs(index, p)) {
      const x = Math.floor(c.s / CELL),
        z = Math.floor(c.d / CELL);
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          const nearby = grid.get((x + dx) * 256 + z + dz);
          if (!nearby) continue;
          for (const other of nearby) {
            if (other === index) continue;
            for (const o of shapes[other]) {
              const gap = c.radius + o.radius + MARGIN;
              if ((o.s - c.s) ** 2 + (o.d - c.d) ** 2 < gap * gap) return false;
            }
          }
        }
    }
    return environmentClear(p, index, q);
  }
  // Rotate priority deterministically; a long-lived actor never owns right of way.
  const first = Math.floor(time / STEP) % states.length;
  for (let n = 0; n < states.length; n++) {
    const i = (first + n) % states.length,
      a = next[i],
      old = states[i],
      id = i + seed * 101,
      k = kind(i),
      rider = isRider(i);
    const scheduled = activityClock(i, time, seed).moving;
    if (
      k !== "bank" &&
      scheduled &&
      !old.scheduled &&
      randomUnit(id, Math.floor(time / 18) + 80) < (rider ? 0.1 : 0.2)
    )
      a.direction *= -1;
    a.scheduled = scheduled;
    let advanced = false;
    a.passing = Math.max(0, old.passing - 1);
    if (scheduled) {
      const target = laneTarget(i, a, time, id);
      const rate = k === "route" ? 0.4 : 0.09;
      const lateralStep = Math.max(
        -rate * STEP,
        Math.min(rate * STEP, target - a.lateral),
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
        [0, -lateralStep || rate * 0.9 * STEP],
      ]) {
        let q = old.q + distance * forward,
          recycled = false;
        const lateral =
          k === "main"
            ? Math.max(0.51, Math.min(0.89, old.lateral + sideways))
            : k === "route"
              ? Math.max(-1, Math.min(1, old.lateral + sideways))
              : old.lateral;
        if (k === "main" && Math.abs(q) > EDGE) {
          q -= Math.sign(q) * EDGE * 2;
          recycled = true;
        } else if (k === "route" && (q < 0 || q > perimeter(i))) {
          q -= Math.sign(q) * perimeter(i);
          recycled = true;
        }
        if (forward === 0 && Math.abs(lateral - old.lateral) < 0.00001)
          continue;
        const p = location(i, q, lateral);
        if (!clear(p, i, q)) continue;
        remove(i);
        const traveled = recycled
          ? Math.abs(distance * forward)
          : Math.hypot(p.s - points[i].s, p.d - points[i].d);
        points[i] = p;
        shapes[i] = discs(i, p);
        insert(i);
        a.q = q;
        a.lateral = lateral;
        a.recycled = recycled;
        a.stride += traveled * 15;
        a.moving = traveled > 0.00001;
        advanced = forward > 0;
        break;
      }
    }
    if (k === "bank") {
      // A quay walk turns back at a building or occupied bank stretch.
      if (scheduled && !a.moving) a.direction *= -1;
    } else {
      // Someone held up head-on in a crowd turns back after a while rather
      // than standing in a permanent knot (the cause of the frozen streets).
      a.blocked = scheduled && !advanced ? old.blocked + 1 : 0;
      if (a.blocked === 2 && !a.passing && !rider && k === "route") a.passing = PASSING;
      if (a.blocked > PATIENCE) {
        a.direction *= -1;
        a.blocked = 0;
      }
    }
    const desired =
      location(i, a.q, a.lateral).angle + (a.direction < 0 ? Math.PI : 0);
    const turn = Math.atan2(
      Math.sin(desired - old.heading),
      Math.cos(desired - old.heading),
    );
    const turnRate = rider ? 1.2 : 2;
    a.heading =
      old.heading + Math.max(-turnRate * STEP, Math.min(turnRate * STEP, turn));
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
    const turn = Math.atan2(
      Math.sin(b.heading - a.heading),
      Math.cos(b.heading - a.heading),
    );
    return {
      ...p,
      angle: a.heading + turn * t,
      track: p.angle,
      moving: b.moving,
      stride: a.stride + (b.stride - a.stride) * t,
    };
  });
  line.time = time;
  if (timelines.size > 4) timelines.delete(timelines.keys().next().value!);
  return line.poses;
}
// Riders on the western streets, in STREET_RIDER_ROUTES order.
export function streetRiderPose(index: number, time: number, seed = 0) {
  return pedestrianPoses(time, seed)[WALKER_COUNT + index];
}
export { RIDER_RADIUS };
