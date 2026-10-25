import {
  BRIDGE,
  HALLS,
  shoreDepth,
  bridgePoint,
  streetAngle,
  TERRAIN_BOUNDS,
  type PassagePoint,
  type BankSide,
} from "./passageLayout";

export const PERSON_RADIUS = 0.255;
export const WALKER_RADIUS = 0.14;
export const CART_RADIUS = 1.35;
export type Segment = { a: PassagePoint; b: PassagePoint };
export type Disc = PassagePoint & { radius: number; kind: string };
export function distance(a: PassagePoint, b: PassagePoint) {
  return Math.hypot(a.s - b.s, a.d - b.d);
}
export function segmentDistance(p: PassagePoint, segment: Segment) {
  const ds = segment.b.s - segment.a.s,
    dd = segment.b.d - segment.a.d;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.s - segment.a.s) * ds + (p.d - segment.a.d) * dd) /
        (ds * ds + dd * dd || 1),
    ),
  );
  return distance(p, { s: segment.a.s + ds * t, d: segment.a.d + dd * t });
}
export function roofClear(p: PassagePoint, radius: number) {
  return HALLS.every((h) => {
    const s = p.s - h.s,
      d = p.d - h.d;
    const u = s * Math.cos(h.angle) + d * Math.sin(h.angle),
      v = -s * Math.sin(h.angle) + d * Math.cos(h.angle);
    return (
      Math.hypot(
        Math.max(0, Math.abs(u) - h.width / 2 - 0.2),
        Math.max(0, Math.abs(v) - h.depth / 2 - 0.23),
      ) >
      radius + 0.04
    );
  });
}
export function bridgeClear(p: PassagePoint, radius: number) {
  const s = p.s - BRIDGE.center.s,
    d = p.d - BRIDGE.center.d;
  const u = s * Math.cos(BRIDGE.angle) + d * Math.sin(BRIDGE.angle),
    v = -s * Math.sin(BRIDGE.angle) + d * Math.cos(BRIDGE.angle);
  return (
    Math.hypot(
      Math.max(0, Math.abs(u) - BRIDGE.length / 2 - 0.45),
      Math.max(0, Math.abs(v) - BRIDGE.width / 2 - 0.15),
    ) >
    radius + 0.08
  );
}
export function dryDisc(p: PassagePoint, radius: number) {
  const side: BankSide = p.d < shoreDepth("far", p.s) ? "far" : "near";
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2,
      s = p.s + Math.cos(a) * radius,
      d = p.d + Math.sin(a) * radius;
    // Rounded terrain, including the back corners.
    if (
      s < TERRAIN_BOUNDS.sMin + 1 ||
      s > TERRAIN_BOUNDS.sMax - 1 ||
      d < TERRAIN_BOUNDS.dMin + 1 ||
      d > TERRAIN_BOUNDS.dMax - 1
    )
      return false;
    if (
      side === "far"
        ? d > shoreDepth(side, s) - 0.04
        : d < shoreDepth(side, s) + 0.04
    )
      return false;
  }
  return true;
}
// Bank lanes are trodden paths a little inland, behind a strip of natural
// bank. Each lane follows a smoothed shoreline loosely, never comes closer to
// the water than BANK_LANE_MIN_SETBACK in plan, and draws back in front of
// house rows so that walkers on both sides of the lane clear the eaves.
// Everything derives from shoreDepth and HALLS; no depth is authored here.
export const BANK_LANE_SETBACK = 1.3;
export const BANK_LANE_MIN_SETBACK = 1.0;
export const BANK_LANE_MAX_SETBACK = 1.75;
const LANE_STEP = 0.05;
// Bank walkers keep 0.26 either side of the lane centre (pedestrians.ts loop
// radius); add a walker body and the eave margin used by environmentClear.
const LANE_ROOF_CLEARANCE = 0.42;
type LaneTable = { s0: number; d: Float64Array; excess: Float64Array };
const laneTables = new Map<BankSide, LaneTable>();
function buildLane(side: BankSide): LaneTable {
  const sign = side === "near" ? 1 : -1,
    s0 = TERRAIN_BOUNDS.sMin - 3,
    n = Math.round((TERRAIN_BOUNDS.sMax + 3 - s0) / LANE_STEP) + 1,
    at = (i: number) => s0 + i * LANE_STEP,
    index = (i: number) => Math.max(0, Math.min(n - 1, i));
  // Work in an inland coordinate u = sign * d: larger u is farther from water.
  const shore = Float64Array.from({ length: n }, (_, i) =>
    sign * shoreDepth(side, at(i)),
  );
  // Upper boundary of the union of shoreline discs of radius r: any point on
  // or beyond it is at least r from the water, including at steep bends.
  const envelope = (i: number, r: number) => {
    const k = Math.floor(r / LANE_STEP);
    let best = -Infinity;
    for (let j = -k; j <= k; j++) {
      const u = j * LANE_STEP;
      best = Math.max(
        best,
        shore[index(i + j)] + Math.sqrt(Math.max(0, r * r - u * u)),
      );
    }
    return best;
  };
  // A broad Gaussian makes the lane follow the bank loosely, not trace it.
  const sigma = 1.6,
    kg = Math.ceil((3 * sigma) / LANE_STEP),
    weights = Array.from({ length: 2 * kg + 1 }, (_, j) =>
      Math.exp(-0.5 * (((j - kg) * LANE_STEP) / sigma) ** 2),
    );
  const phase = side === "near" ? 0.7 : 2.9;
  const roofLimit = new Float64Array(n),
    raw = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let smooth = 0,
      total = 0;
    for (let j = -kg; j <= kg; j++) {
      smooth += shore[index(i + j)] * weights[j + kg];
      total += weights[j + kg];
    }
    const s = at(i),
      setback =
        BANK_LANE_SETBACK +
        0.14 * Math.sin(0.43 * s + phase) +
        0.07 * Math.sin(1.13 * s + 2 * phase);
    // The first house front met walking inland from the water.
    let limit = Infinity;
    for (
      let u = shore[i];
      u <= shore[i] + BANK_LANE_MAX_SETBACK + 0.1;
      u += LANE_STEP
    )
      if (!roofClear({ s, d: sign * u }, LANE_ROOF_CLEARANCE)) {
        limit = u - LANE_STEP;
        break;
      }
    roofLimit[i] = limit;
    raw[i] = Math.min(smooth / total + setback, limit);
  }
  // Erode then average over the same window: the result stays inside every
  // house-front limit while easing smoothly in and out of each row.
  const w = Math.round(1 / LANE_STEP),
    eroded = Float64Array.from({ length: n }, (_, i) => {
      let m = Infinity;
      for (let j = -w; j <= w; j++) m = Math.min(m, raw[index(i + j)]);
      return m;
    });
  const d = new Float64Array(n),
    excess = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let mean = 0;
    for (let j = -w; j <= w; j++) mean += eroded[index(i + j)];
    mean /= 2 * w + 1;
    const lane = Math.min(
      // The sampled envelope can miss a zigzag apex between samples by a hair.
      Math.max(mean, envelope(i, BANK_LANE_MIN_SETBACK + 0.03)),
      envelope(i, BANK_LANE_MAX_SETBACK),
    );
    // Where a house sits closer to the water than the minimum setback allows,
    // the setback wins and walkers there yield to the house.
    excess[i] = Math.max(0, lane - roofLimit[i]);
    d[i] = sign * lane;
  }
  return { s0, d, excess };
}
function laneTable(side: BankSide) {
  let table = laneTables.get(side);
  if (!table) laneTables.set(side, (table = buildLane(side)));
  return table;
}
export function bankCenter(side: BankSide, s: number) {
  const { s0, d } = laneTable(side),
    x = Math.max(0, Math.min(d.length - 1.000001, (s - s0) / LANE_STEP)),
    i = Math.floor(x);
  return d[i] + (d[i + 1] - d[i]) * (x - i);
}
/** True where the minimum setback forces the lane against a house front. */
export function bankLaneBlocked(side: BankSide, s: number) {
  const { s0, excess } = laneTable(side),
    i = Math.round((s - s0) / LANE_STEP);
  // A few hundredths is absorbed by the walkers' own eave margin.
  return excess[Math.max(0, Math.min(excess.length - 1, i))] > 0.04;
}
// A walking loop keeps the longest stretch of its lane that clears every
// house front, so walkers do not queue against a wall standing too close to
// the water for a set-back lane. Short clear stretches keep the full loop.
function trimLoop(side: BankSide, start: number, end: number) {
  const clear = (s: number) =>
    [-0.35, 0, 0.35].every((o) => !bankLaneBlocked(side, s + o));
  let best = { start, end },
    length = 0,
    runStart = NaN;
  for (let s = start; s <= end + 0.05; s += 0.1) {
    const open = s <= end && clear(s);
    if (open && Number.isNaN(runStart)) runStart = s;
    if (!open && !Number.isNaN(runStart)) {
      const runEnd = Math.min(end, s - 0.1);
      if (runEnd - runStart > length)
        (length = runEnd - runStart), (best = { start: runStart, end: runEnd });
      runStart = NaN;
    }
  }
  return length >= 6 ? best : { start, end };
}
export const BANK_LOOPS = ["near", "far"].flatMap((side) => {
  const bank = side as BankSide,
    anchor = bank === "near" ? BRIDGE.near : BRIDGE.far;
  return [
    {
      side: bank,
      ...trimLoop(bank, bank === "far" ? -13 : -26, anchor.s - 2.1),
    },
    { side: bank, ...trimLoop(bank, anchor.s + 2.1, 34) },
  ];
});
export const WALK_SEGMENTS: Segment[] = BANK_LOOPS.flatMap((loop) => {
  const breaks = [
    loop.start,
    ...Array.from(
      { length: Math.ceil((loop.end - loop.start) / 0.2) - 1 },
      (_, i) => loop.start + (i + 1) * 0.2,
    ),
    loop.end,
  ];
  return breaks.slice(1).map((s, i) => ({
    a: { s: breaks[i], d: bankCenter(loop.side, breaks[i]) },
    b: { s, d: bankCenter(loop.side, s) },
  }));
});
export function walkingClear(p: PassagePoint, radius: number) {
  return WALK_SEGMENTS.every(
    (segment) =>
      segmentDistance(p, segment) > radius + 0.31 + WALKER_RADIUS + 0.04,
  );
}
export type CartRoute = Segment &
  PassagePoint & { angle: number; length: number };
// The main street continues the bridge axis through both banks.
export const STREET_HALF_WIDTH = 1.85;
export const CART_LANE_RADIUS = 0.46;
export const MAIN_STREET: Segment = { a: bridgePoint(-40), b: bridgePoint(40) };
export const STREET_SEGMENTS: Segment[] = Array.from(
  { length: 800 },
  (_, i) => ({
    a: bridgePoint(-40 + i * 0.1),
    b: bridgePoint(-40 + (i + 1) * 0.1),
  }),
);
export function streetDistance(p: PassagePoint) {
  return Math.min(...STREET_SEGMENTS.map((s) => segmentDistance(p, s)));
}
export const CART_ROUTES: CartRoute[] = Array.from({ length: 8 }, (_, i) => ({
  ...bridgePoint(-17 + i * 5.5),
  angle: streetAngle(-17 + i * 5.5),
  length: 80,
  ...MAIN_STREET,
}));
export function trafficClear(
  p: PassagePoint,
  radius: number,
  streetClearance = STREET_HALF_WIDTH,
) {
  return (
    walkingClear(p, radius) &&
    bridgeClear(p, radius) &&
    streetDistance(p) > radius + streetClearance + 0.08
  );
}
export const STATIC_OBSTACLES: Disc[] = [];
export function reserve(p: PassagePoint, radius: number, kind: string) {
  if (
    !dryDisc(p, radius) ||
    !roofClear(p, radius) ||
    !trafficClear(p, radius, kind === "shopper" ? 1.1 : STREET_HALF_WIDTH) ||
    STATIC_OBSTACLES.some(
      (other) => distance(p, other) < radius + other.radius + 0.08,
    )
  )
    return false;
  STATIC_OBSTACLES.push({ ...p, radius, kind });
  return true;
}
