import {
  BOATS,
  BRIDGE,
  TERRAIN_BOUNDS,
  bridgeCoordinates,
  bridgeHeight,
  shoreDepth,
  type BankSide,
  type PassagePoint,
} from "./passageLayout";
import { MOORED_BOATS } from "./moorings";
import { loweringRigAngle } from "./referenceDetails";

// Working boats navigate a channel derived from the two shorelines alone, so
// reshaped banks, bends and abutments move the route with them. The channel is
// traced from beyond the east crop, round the west bend and out through the
// top crop; boats recycle beyond those painted edges, where the paper fade has
// already hidden them.

const { sMin, sMax, dMin } = TERRAIN_BOUNDS;
/** Arc-length spacing of every route table. */
export const ROUTE_STEP = 0.25;
/** Unhurried travel speed in plan units per second (a slow punted pace). */
export const BOAT_SPEED = 0.2;
/** How far the traced channel continues past the terrain crop at each end. */
const OVERRUN = 14;
/** Hull outline used for clearance: footprints reach about .59 L and .63 W. */
export const HULL_HALF_LENGTH = 0.6,
  HULL_HALF_WIDTH = 0.66;
/**
 * Highest point of each rendered hull style (cabin roofs and canopies reach
 * about 1.12, open skiffs 0.56), kept clear of the arch's soffit, which
 * sits 0.48 below the deck line.
 */
export function hullTop(boat: { length: number; cabin: boolean }) {
  return boat.cabin || boat.length >= 3.8 ? 1.13 : 0.57;
}
const SOFFIT = 0.48,
  HEADROOM_MARGIN = 0.12;
const BANK_MARGIN = 0.1,
  MOORED_MARGIN = 0.15;

type Hull = PassagePoint & { angle: number; length: number; width: number; top?: number };

// Dense bank tables keep route construction cheap; they sample shoreDepth.
const TABLE_STEP = 0.02;
const bankTable = (side: BankSide) =>
  Float64Array.from(
    { length: Math.round((sMax - sMin) / TABLE_STEP) + 1 },
    (_, i) => shoreDepth(side, sMin + i * TABLE_STEP),
  );
const FAR = bankTable("far"),
  NEAR = bankTable("near");
function bankAt(table: Float64Array, s: number) {
  const x = (Math.max(sMin, Math.min(sMax, s)) - sMin) / TABLE_STEP,
    i = Math.min(table.length - 2, Math.floor(x));
  return table[i] + (table[i + 1] - table[i]) * (x - i);
}
export function inChannel(s: number, d: number) {
  return d > bankAt(FAR, s) && d < bankAt(NEAR, s);
}
const wrapAngle = (a: number) =>
  a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** Distance from p along a unit direction to the first dry ground. */
function rayToBank(p: PassagePoint, ds: number, dd: number, max = 40) {
  if (!inChannel(p.s, p.d)) return 0;
  let lo = 0,
    hi = 0;
  while (hi < max) {
    hi = Math.min(max, hi + 0.2);
    if (!inChannel(p.s + ds * hi, p.d + dd * hi)) break;
    lo = hi;
  }
  if (lo === hi) return max;
  for (let k = 0; k < 10; k++) {
    const mid = (lo + hi) / 2;
    if (inChannel(p.s + ds * mid, p.d + dd * mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * The channel centreline is the clearest passage through the water: a
 * least-cost path over a distance-to-bank field, where cost falls with the
 * square of bank clearance, so it keeps to the middle of every reach and bend.
 */
function traceCentreline() {
  const h = 0.25,
    s0 = sMin,
    d0 = dMin - OVERRUN,
    columns = Math.round((sMax + OVERRUN - s0) / h) + 1,
    rows = Math.round((TERRAIN_BOUNDS.dMax - d0) / h) + 1,
    cells = columns * rows;
  const at = (i: number, j: number) => j * columns + i;
  // Dead-reckoning distance transform: each cell tracks its nearest dry cell.
  const nearI = new Int32Array(cells).fill(-1),
    nearJ = new Int32Array(cells).fill(-1),
    clearance = new Float64Array(cells).fill(Infinity);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < columns; i++)
      if (!inChannel(s0 + i * h, d0 + j * h)) {
        const c = at(i, j);
        clearance[c] = 0;
        nearI[c] = i;
        nearJ[c] = j;
      }
  const relax = (i: number, j: number, di: number, dj: number) => {
    const a = at(i + di, j + dj);
    if (nearI[a] < 0) return;
    const c = at(i, j),
      e = Math.hypot(i - nearI[a], j - nearJ[a]);
    if (e < clearance[c]) {
      clearance[c] = e;
      nearI[c] = nearI[a];
      nearJ[c] = nearJ[a];
    }
  };
  for (let j = 1; j < rows - 1; j++)
    for (let i = 1; i < columns - 1; i++)
      for (const [di, dj] of [[-1, -1], [0, -1], [1, -1], [-1, 0]]) relax(i, j, di, dj);
  for (let j = rows - 2; j > 0; j--)
    for (let i = columns - 2; i > 0; i--)
      for (const [di, dj] of [[1, 1], [0, 1], [-1, 1], [1, 0]]) relax(i, j, di, dj);
  // Enter at the clearest water of the east edge, leave by the top edge.
  const widest = (indices: number[]) =>
    indices.reduce((a, b) => (clearance[b] > clearance[a] ? b : a));
  const source = widest(Array.from({ length: rows - 2 }, (_, j) => at(columns - 2, j + 1))),
    target = widest(Array.from({ length: columns - 2 }, (_, i) => at(i + 1, 1)));
  const cost = new Float64Array(cells).fill(Infinity),
    previous = new Int32Array(cells).fill(-1),
    heap: [number, number][] = [[0, source]];
  cost[source] = 0;
  const push = (item: [number, number]) => {
    heap.push(item);
    for (let k = heap.length - 1; k > 0; ) {
      const parent = (k - 1) >> 1;
      if (heap[parent][0] <= heap[k][0]) break;
      [heap[parent], heap[k]] = [heap[k], heap[parent]];
      k = parent;
    }
  };
  const pop = () => {
    const top = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let k = 0; ; ) {
        const l = 2 * k + 1,
          r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [c0, c] = pop();
    if (c0 > cost[c]) continue;
    if (c === target) break;
    const i = c % columns,
      j = (c - i) / columns;
    for (let di = -1; di <= 1; di++)
      for (let dj = -1; dj <= 1; dj++) {
        if ((!di && !dj) || i + di < 1 || j + dj < 1 || i + di >= columns - 1 || j + dj >= rows - 1) continue;
        const n = at(i + di, j + dj);
        if (clearance[n] === 0) continue;
        const next = c0 + Math.hypot(di, dj) / clearance[n] ** 2;
        if (next < cost[n]) {
          cost[n] = next;
          previous[n] = c;
          push([next, n]);
        }
      }
  }
  // Route direction: from the top crop, through the bend, out of the east crop.
  const points: PassagePoint[] = [];
  for (let c = target; c >= 0; c = previous[c]) {
    const i = c % columns;
    points.push({ s: s0 + i * h, d: d0 + ((c - i) / columns) * h });
  }
  let path = resample(points);
  for (let pass = 0; pass < 4; pass++) path = resample(smoothPoints(path, 12));
  return path;
}
function smoothPoints(points: PassagePoint[], radius: number) {
  return points.map((_, i) => {
    const r = Math.min(radius, i, points.length - 1 - i);
    let s = 0,
      d = 0;
    for (let j = i - r; j <= i + r; j++) {
      s += points[j].s;
      d += points[j].d;
    }
    return { s: s / (2 * r + 1), d: d / (2 * r + 1) };
  });
}
function resample(points: PassagePoint[]) {
  const out: PassagePoint[] = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      span = Math.hypot(b.s - a.s, b.d - a.d);
    let t = ROUTE_STEP - carry;
    while (t <= span) {
      out.push({ s: a.s + ((b.s - a.s) * t) / span, d: a.d + ((b.d - a.d) * t) / span });
      t += ROUTE_STEP;
    }
    carry = span - (t - ROUTE_STEP);
  }
  return out;
}
function tangents(points: PassagePoint[], reach = 2) {
  return points.map((_, i) => {
    const a = points[Math.max(0, i - reach)],
      b = points[Math.min(points.length - 1, i + reach)];
    return Math.atan2(b.d - a.d, b.s - a.s);
  });
}

export const CHANNEL = traceCentreline();
const CHANNEL_ANGLE = tangents(CHANNEL);
/** Free water to the left (+normal) and right of the centreline. */
export const CHANNEL_WIDTH = CHANNEL.map((p, i) => {
  const ns = -Math.sin(CHANNEL_ANGLE[i]),
    nd = Math.cos(CHANNEL_ANGLE[i]);
  return { left: rayToBank(p, ns, nd, 20), right: rayToBank(p, -ns, -nd, 20) };
});

/**
 * Conservative plan outline of a reference hull: the rendered footprints reach
 * from -.59 to +.57 of the length and taper from about .62 of the beam
 * amidships to the pointed ends, so a flattened ellipse encloses them.
 */
function halfBeam(h: Hull, q: number) {
  return h.width * HULL_HALF_WIDTH * Math.max(0, 1 - Math.abs(q) ** 8) ** 0.4;
}
function hullOutline(h: Hull, margin: number) {
  const c = Math.cos(h.angle),
    n = Math.sin(h.angle),
    half = h.length * HULL_HALF_LENGTH,
    steps = Math.max(8, Math.ceil((2 * half) / 0.3)),
    points: PassagePoint[] = [];
  const add = (z: number, x: number) =>
    points.push({ s: h.s + z * c - x * n, d: h.d + z * n + x * c });
  for (let j = 0; j <= steps; j++) {
    const q = -1 + (2 * j) / steps,
      x = halfBeam(h, q) + margin;
    add(q * half, x);
    add(q * half, -x);
  }
  add(half + margin, 0);
  add(-half - margin, 0);
  return points;
}
function hullContains(h: Hull, p: PassagePoint, margin: number) {
  const ds = p.s - h.s,
    dd = p.d - h.d,
    z = ds * Math.cos(h.angle) + dd * Math.sin(h.angle),
    x = -ds * Math.sin(h.angle) + dd * Math.cos(h.angle),
    half = h.length * HULL_HALF_LENGTH;
  if (Math.abs(z) > half + margin) return false;
  return Math.abs(x) < halfBeam(h, Math.max(-1, Math.min(1, z / half))) + margin;
}
/** Separation of the bounding rectangles of two hulls (negative if they overlap). */
function rectangleGap(a: Hull, b: Hull) {
  let separation = -Infinity;
  for (const axis of [a.angle, a.angle + Math.PI / 2, b.angle, b.angle + Math.PI / 2]) {
    const x = Math.cos(axis),
      y = Math.sin(axis);
    const reach = (h: Hull) =>
      Math.abs(Math.cos(h.angle - axis)) * h.length * HULL_HALF_LENGTH +
      Math.abs(Math.sin(h.angle - axis)) * h.width * HULL_HALF_WIDTH;
    separation = Math.max(separation, Math.abs((a.s - b.s) * x + (a.d - b.d) * y) - reach(a) - reach(b));
  }
  return separation;
}
const BRIDGE_COS = Math.cos(BRIDGE.angle),
  BRIDGE_SIN = Math.sin(BRIDGE.angle);
// Moored hulls are fixed obstacles for every passing boat.
const mooredHulls: Hull[] = MOORED_BOATS.map((b) => ({ ...b }));
const mooredOutlines = mooredHulls.map((m) => hullOutline(m, 0));
/** Hull afloat, clear of moored boats, and below the arch wherever beneath the deck. */
export function hullClear(h: Hull, margin = BANK_MARGIN) {
  for (const p of hullOutline(h, margin)) {
    if (!inChannel(p.s, p.d)) return false;
    const ds = p.s - BRIDGE.center.s,
      dd = p.d - BRIDGE.center.d;
    if (
      Math.abs(-ds * BRIDGE_SIN + dd * BRIDGE_COS) < BRIDGE.width / 2 + 0.3 &&
      bridgeHeight(ds * BRIDGE_COS + dd * BRIDGE_SIN) < (h.top ?? 1.13) + SOFFIT + HEADROOM_MARGIN
    )
      return false;
  }
  const reach = h.length * HULL_HALF_LENGTH + MOORED_MARGIN;
  let outline: PassagePoint[] | undefined;
  return mooredHulls.every((m, i) => {
    if (Math.hypot(m.s - h.s, m.d - h.d) > reach + m.length * HULL_HALF_LENGTH) return true;
    if (rectangleGap(h, m) > MOORED_MARGIN) return true;
    outline ??= hullOutline(h, MOORED_MARGIN);
    return (
      outline.every((p) => !hullContains(m, p, 0)) &&
      mooredOutlines[i].every((p) => !hullContains(h, p, MOORED_MARGIN))
    );
  });
}

/**
 * The main boat's folding mast and battened sail reach beyond its beam. Keep
 * their whole swept volume, at the rig's current lowering, under the arch.
 */
function rigClear(h: Hull) {
  const distance = rigBridgeDistance(0, h),
    tilt = loweringRigAngle(distance),
    mast = Math.min(3.2, h.length * 0.55),
    top = 0.34 + 0.72 + mast * Math.cos(tilt) + 0.15,
    reach = mast * Math.sin(tilt) + 0.3,
    socketX = h.width * 0.37,
    socketZ = -h.length * 0.29,
    breadth = h.width * 1.75;
  const c = Math.cos(h.angle),
    n = Math.sin(h.angle);
  for (let x = socketX - 0.45 * breadth; x <= socketX + 0.6 * breadth; x += 0.25)
    for (let z = socketZ - reach; z <= socketZ + reach; z += 0.25) {
      const ds = h.s + x * n + z * c - BRIDGE.center.s,
        dd = h.d - x * c + z * n - BRIDGE.center.d;
      if (
        Math.abs(-ds * BRIDGE_SIN + dd * BRIDGE_COS) < BRIDGE.width / 2 + 0.3 &&
        bridgeHeight(ds * BRIDGE_COS + dd * BRIDGE_SIN) < top + 0.42 + 0.15
      )
        return false;
    }
  return true;
}
function vesselClear(index: number, h: Hull) {
  return hullClear({ ...h, top: hullTop(BOATS[index]) }) && (!SWINGS[index] || rigClear(h));
}

/** Nearest centreline sample and signed lateral offset of a plan point. */
export function channelCoordinates(p: PassagePoint) {
  let best = 0,
    distance = Infinity;
  CHANNEL.forEach((c, i) => {
    const e = Math.hypot(p.s - c.s, p.d - c.d);
    if (e < distance) {
      distance = e;
      best = i;
    }
  });
  const a = CHANNEL_ANGLE[best],
    c = CHANNEL[best];
  return {
    index: best,
    along: best * ROUTE_STEP + (p.s - c.s) * Math.cos(a) + (p.d - c.d) * Math.sin(a),
    offset: -(p.s - c.s) * Math.sin(a) + (p.d - c.d) * Math.cos(a),
  };
}

// The main boat swings across the current beneath the arch, as painted, so its
// keel meets the bridge squarely while the crew lower the folding mast.
const SWING_FULL = BRIDGE.width / 2 + 0.6,
  SWING_FADE = 7;
function bridgeSwing(p: PassagePoint) {
  const x = clamp((Math.abs(bridgeCoordinates(p).cross) - SWING_FULL) / (SWING_FADE - SWING_FULL), 0, 1);
  return 1 - x * x * (3 - 2 * x);
}
const SQUARE_TO_BRIDGE = BRIDGE.angle + Math.PI / 2;

/**
 * Downstream (+1) boats run from the top crop to the east crop; upstream (-1)
 * boats return. All share one speed, so the traffic pattern repeats exactly.
 */
export const BOAT_DIRECTIONS = [1, -1, 1, 1, -1];
/** Share of the half-channel to the right of a boat's course that it keeps to. */
const TRAFFIC_SHARE = 0.8,
  SETTLE = 12;
const SWINGS = [true, false, false, false, false];

type Lane = { s: Float64Array; d: Float64Array; angle: Float64Array; start: number };
const LANE_STEP = 0.125,
  PASSES = 6,
  BAND = 2.5;
/**
 * Each boat keeps its painted share of the water, steering smoothly round
 * moored hulls, banks and abutments. The lane is the cheapest feasible offset
 * sequence (dynamic programming over the centreline samples), re-solved with
 * the resulting headings so long hulls are checked as they actually lie.
 */
function buildLane(index: number): Lane {
  const boat = BOATS[index],
    direction = BOAT_DIRECTIONS[index],
    count = CHANNEL.length;
  const home = channelCoordinates(boat),
    width0 = home.offset >= 0 ? CHANNEL_WIDTH[home.index].left : CHANNEL_WIDTH[home.index].right;
  const share = clamp(home.offset / Math.max(width0, 1e-6), -0.85, 0.85),
    keep = -direction * TRAFFIC_SHARE;
  // Near its painted place a boat holds its painted share of the water; away
  // from it, boats keep to the right of their own course so opposing traffic
  // passes side by side.
  const target = CHANNEL_WIDTH.map((w, k) => {
    const x = clamp((Math.abs(k - home.index) * ROUTE_STEP) / SETTLE, 0, 1),
      blend = x * x * (3 - 2 * x),
      lane = share + (keep - share) * blend;
    return lane * (lane >= 0 ? w.left : w.right);
  });
  const span = Math.max(...CHANNEL_WIDTH.map((w) => Math.max(w.left, w.right)));
  const states = 2 * Math.ceil(span / LANE_STEP) + 1,
    offsetOf = (j: number) => (j - (states - 1) / 2) * LANE_STEP;
  const s = new Float64Array(count),
    d = new Float64Array(count),
    angle = new Float64Array(count),
    offsets = new Float64Array(count),
    travel = Float64Array.from(CHANNEL_ANGLE);
  const at = (k: number, offset: number) => ({
    s: CHANNEL[k].s - Math.sin(CHANNEL_ANGLE[k]) * offset,
    d: CHANNEL[k].d + Math.cos(CHANNEL_ANGLE[k]) * offset,
  });
  const heading = (k: number, p: PassagePoint) => {
    let a = travel[k] + (direction < 0 ? Math.PI : 0);
    if (SWINGS[index]) {
      const square = SQUARE_TO_BRIDGE + Math.PI * Math.round((a - SQUARE_TO_BRIDGE) / Math.PI);
      a += bridgeSwing(p) * wrapAngle(square - a);
    }
    return wrapAngle(a);
  };
  const cost = new Float64Array(count * states),
    from = new Int32Array(count * states),
    checkedAngle = new Float64Array(count * states).fill(NaN),
    checkedClear = new Uint8Array(count * states);
  const reach = Math.max(4, Math.round((boat.length * 0.3) / ROUTE_STEP));
  for (let pass = 0; pass < PASSES; pass++) {
    if (pass > 0)
      for (let k = 0; k < count; k++) {
        // A long hull lies along the chord of its own length through bends;
        // damping lets the headings and the lane settle together.
        const a = Math.max(0, k - reach),
          b = Math.min(count - 1, k + reach);
        travel[k] += 0.5 * wrapAngle(Math.atan2(d[b] - d[a], s[b] - s[a]) - travel[k]);
      }
    for (let k = 0; k < count; k++) {
      const w = CHANNEL_WIDTH[k],
        pull = Math.abs(k - home.index) < 3 ? 400 : 1;
      for (let j = 0; j < states; j++) {
        const o = offsetOf(j),
          c = k * states + j;
        let local = pull * (o - target[k]) ** 2;
        // The first pass searches the whole width; later passes only a band
        // around the previous lane.
        if (o > w.left || o < -w.right || Math.abs(o - (pass ? offsets[k] : target[k])) > (pass ? BAND : Infinity))
          local += 1e6;
        else {
          const p = at(k, o),
            a = heading(k, p);
          // Re-check a state only once its heading has moved appreciably.
          if (pass === PASSES - 1 || !(Math.abs(wrapAngle(a - checkedAngle[c])) < 0.01)) {
            checkedAngle[c] = a;
            checkedClear[c] = +vesselClear(index, { ...p, angle: a, length: boat.length, width: boat.width });
          }
          if (!checkedClear[c]) local += 1e6;
        }
        if (k === 0) {
          cost[c] = local;
          continue;
        }
        let best = Infinity,
          arg = j;
        for (let step = -2; step <= 2; step++) {
          const i = j + step;
          if (i < 0 || i >= states) continue;
          const e = cost[(k - 1) * states + i] + 40 * step * step * LANE_STEP ** 2;
          if (e < best) {
            best = e;
            arg = i;
          }
        }
        cost[c] = best + local;
        from[c] = arg;
      }
    }
    let j = 0;
    for (let i = 1; i < states; i++)
      if (cost[(count - 1) * states + i] < cost[(count - 1) * states + j]) j = i;
    for (let k = count - 1; k >= 0; k--) {
      offsets[k] = offsetOf(j);
      j = from[k * states + j];
    }
    for (let k = 0; k < count; k++) {
      const p = at(k, offsets[k]);
      s[k] = p.s;
      d[k] = p.d;
    }
  }
  // Headings are those the final lane was checked with. Where a long hull
  // still cannot turn in time (the tight west bend), it yaws a little more or
  // less than its course, eased in and out over a few lengths of travel.
  for (let k = 0; k < count; k++) angle[k] = heading(k, { s: s[k], d: d[k] });
  const yaw = new Float64Array(count),
    clear = (k: number, extra: number) =>
      vesselClear(index, { s: s[k], d: d[k], angle: angle[k] + extra, length: boat.length, width: boat.width });
  const ease = Math.round(boat.length / ROUTE_STEP);
  for (let round = 0; round < 8; round++) {
    let repaired = false;
    for (let k = 0; k < count; k++) {
      if (clear(k, yaw[k])) continue;
      for (let step = 1; step <= 30; step++) {
        const extra = yaw[k] + (step % 2 ? 1 : -1) * Math.ceil(step / 2) * 0.02;
        if (!clear(k, extra)) continue;
        for (let m = Math.max(0, k - ease); m <= Math.min(count - 1, k + ease); m++) {
          const x = Math.abs(m - k) / (ease + 1),
            taper = extra * 0.5 * (1 + Math.cos(Math.PI * x));
          if (Math.abs(taper) > Math.abs(yaw[m])) yaw[m] = taper;
        }
        yaw[k] = extra;
        repaired = true;
        break;
      }
    }
    if (!repaired) break;
  }
  for (let k = 0; k < count; k++) angle[k] = wrapAngle(angle[k] + yaw[k]);
  return { s, d, angle, start: home.index * ROUTE_STEP };
}
const lanes: Lane[] = [];
/** Each lane is planned on first use, so modules that never move boats skip the cost. */
export function boatLane(index: number) {
  return (lanes[index] ??= buildLane(index));
}
/** Length of one passage, including the hidden overruns at both ends. */
export const ROUTE_LENGTH = (CHANNEL.length - 1) * ROUTE_STEP;
export const BOAT_PERIOD = ROUTE_LENGTH / BOAT_SPEED;

export function boatPose(index: number, time: number) {
  const lane = boatLane(index),
    travelled = lane.start + BOAT_DIRECTIONS[index] * BOAT_SPEED * time;
  const x = (((travelled % ROUTE_LENGTH) + ROUTE_LENGTH) % ROUTE_LENGTH) / ROUTE_STEP,
    k = Math.min(lane.s.length - 2, Math.floor(x)),
    f = x - k;
  const phase = time * 0.34 + index * 1.71;
  return {
    s: lane.s[k] + (lane.s[k + 1] - lane.s[k]) * f,
    d: lane.d[k] + (lane.d[k + 1] - lane.d[k]) * f,
    y: Math.sin(phase) * 0.008,
    angle: lane.angle[k] + wrapAngle(lane.angle[k + 1] - lane.angle[k]) * f,
    roll: Math.sin(phase + 0.8) * 0.003,
    pitch: Math.cos(phase * 0.8) * 0.002,
    /** Arc position along the channel, for recycling-aware consumers. */
    travelled: x * ROUTE_STEP,
  };
}

/**
 * Distance across the bridge, measured at the folding mast's deck socket
 * (beside the stern quarter, as built by buildLoweringRig), so the rig is
 * lowered while the mast itself is near the arch, not merely the hull centre.
 */
export function rigBridgeDistance(index: number, pose: PassagePoint & { angle: number }) {
  const b = BOATS[index],
    x = b.width * 0.37,
    z = -b.length * 0.29;
  return Math.abs(
    bridgeCoordinates({
      s: pose.s + x * Math.sin(pose.angle) + z * Math.cos(pose.angle),
      d: pose.d - x * Math.cos(pose.angle) + z * Math.sin(pose.angle),
    }).cross,
  );
}
