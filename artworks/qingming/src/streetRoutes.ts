import {
  BRIDGE,
  HALLS,
  bridgePoint,
  streetAngle,
  onBank,
  type PassagePoint,
} from "./passageLayout";
import { STATIC_OBSTACLES, WALKER_RADIUS } from "./passageSpace";
import {
  CROSSROADS_ROUTES,
  CROSSROADS_CARTS,
  CROSSROADS_CART_HALF,
  CROSSROADS_WELL,
} from "./crossroads";

// Walking routes through the western street network. Every route is derived
// from the traced crossroads streets and, where it joins the main street, from
// bridgePoint/streetAngle, so it follows any change to the bridge or houses.
// Each route is a dense centreline with a fitted clear band: walkers keep to
// lanes inside the band and riders keep to its middle.
export const ROUTE_STEP = 0.1;
export const RIDER_RADIUS = 0.22;
export const RIDER_REACH = 0.22;
// Walkers keep left in the western streets. At the main street this matches
// the existing two lanes on its western side (inner lane toward the bridge).
export const JOIN_SIDE = -1;
export const JOIN_LANES = { inner: 0.52, outer: 0.88 };
const LANE_SPREAD = 0.55,
  FIT_MARGIN = 0.03,
  SLOPE = 0.4,
  OFFSETS = Array.from({ length: 121 }, (_, i) => -2.4 + i * 0.04);

export type RouteSample = {
  s: number;
  d: number;
  angle: number;
  c: number;
  spread: number;
};
export type StreetRoute = {
  name: string;
  samples: RouteSample[];
  polyLength: number;
  // Optional continuation along the main street, from x0 to the hidden end.
  join?: { x0: number; end: number };
  length: number;
  riders: boolean;
};
type Disc = PassagePoint & { radius: number };
// Tree trunks and other fixed scenery registered by the scene data modules.
export const STREET_OBSTACLES: Disc[] = [];

function rectangleGap(
  p: PassagePoint,
  s: number,
  d: number,
  angle: number,
  halfU: number,
  halfV: number,
) {
  const ds = p.s - s,
    dd = p.d - d,
    u = ds * Math.cos(angle) + dd * Math.sin(angle),
    v = -ds * Math.sin(angle) + dd * Math.cos(angle);
  return Math.hypot(
    Math.max(0, Math.abs(u) - halfU),
    Math.max(0, Math.abs(v) - halfV),
  );
}
// Broad phase over everything a street walker must avoid.
type Item =
  | { kind: "hall"; h: (typeof HALLS)[number] }
  | { kind: "disc"; o: Disc }
  | { kind: "cart"; c: readonly number[] };
let gridKey = "";
const grid = new Map<string, Item[]>();
function prepare() {
  const key = STATIC_OBSTACLES.length + ":" + STREET_OBSTACLES.length;
  if (key === gridKey) return;
  gridKey = key;
  grid.clear();
  const add = (s: number, d: number, r: number, item: Item) => {
    for (let x = Math.floor(s - r - 1); x <= Math.floor(s + r + 1); x++)
      for (let z = Math.floor(d - r - 1); z <= Math.floor(d + r + 1); z++) {
        const k = x + ":" + z,
          a = grid.get(k) ?? [];
        a.push(item);
        grid.set(k, a);
      }
  };
  HALLS.forEach((h) =>
    add(h.s, h.d, Math.hypot(h.width / 2 + 0.2, h.depth / 2 + 0.23), {
      kind: "hall",
      h,
    }),
  );
  [...STATIC_OBSTACLES, ...STREET_OBSTACLES, CROSSROADS_WELL].forEach((o) =>
    add(o.s, o.d, o.radius, { kind: "disc", o }),
  );
  CROSSROADS_CARTS.forEach((c) =>
    add(
      c[0],
      c[1],
      Math.hypot(CROSSROADS_CART_HALF.length, CROSSROADS_CART_HALF.width),
      { kind: "cart", c },
    ),
  );
}
// Whether a disc stays off the traced western streets' carriageways, so
// standing figures leave them to the walkers.
export function offStreet(p: PassagePoint, radius: number) {
  return CROSSROADS_ROUTES.every((route) =>
    route.every((b, i) => {
      if (!i) return true;
      const a = route[i - 1],
        ds = b[0] - a[0],
        dd = b[1] - a[1],
        t = Math.max(0, Math.min(1, ((p.s - a[0]) * ds + (p.d - a[1]) * dd) / (ds * ds + dd * dd)));
      return Math.hypot(p.s - a[0] - ds * t, p.d - a[1] - dd * t) > radius + 1.0;
    }),
  );
}
// Shared by lane fitting and by the per-step crowd simulation.
export function streetClear(p: PassagePoint, radius: number) {
  prepare();
  if (!onBank("near", p, 0.08)) return false;
  for (const item of grid.get(Math.floor(p.s) + ":" + Math.floor(p.d)) ?? []) {
    if (item.kind === "hall") {
      const h = item.h;
      if (
        rectangleGap(p, h.s, h.d, h.angle, h.width / 2 + 0.2, h.depth / 2 + 0.23) <
        radius + 0.045
      )
        return false;
    } else if (item.kind === "disc") {
      if (Math.hypot(p.s - item.o.s, p.d - item.o.d) < item.o.radius + radius + 0.035)
        return false;
    } else if (
      rectangleGap(
        p,
        item.c[0],
        item.c[1],
        item.c[2],
        CROSSROADS_CART_HALF.length,
        CROSSROADS_CART_HALF.width,
      ) <
      radius + 0.04
    )
      return false;
  }
  return true;
}
// The swept rectangle of a one-way cart on the main street (same envelope the
// main-street lanes use near the curved landings).
const streetNodes = Array.from({ length: 1067 }, (_, i) => {
  const q = -40 + i * 0.075;
  return { q, ...bridgePoint(q), a: streetAngle(q) };
});
function cartGap(p: PassagePoint) {
  let best = Infinity;
  for (const c of streetNodes) {
    if (Math.abs(p.s - c.s) > 1.8 || Math.abs(p.d - c.d) > 1.8) continue;
    best = Math.min(best, rectangleGap(p, c.s, c.d, c.a, 1.35, 0.32));
  }
  return best;
}
function streetDistance(p: PassagePoint) {
  let best = Infinity;
  for (const c of streetNodes)
    best = Math.min(best, Math.hypot(p.s - c.s, p.d - c.d));
  return best;
}

type Point = [number, number];
function resample(points: Point[], step = ROUTE_STEP): Point[] {
  const out: Point[] = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const [as, ad] = points[i - 1],
      [bs, bd] = points[i],
      length = Math.hypot(bs - as, bd - ad);
    let t = step - carry;
    while (t <= length) {
      out.push([as + ((bs - as) * t) / length, ad + ((bd - ad) * t) / length]);
      t += step;
    }
    carry = length - (t - step);
  }
  const last = points.at(-1)!;
  if (Math.hypot(last[0] - out.at(-1)![0], last[1] - out.at(-1)![1]) > step * 0.3)
    out.push(last);
  return out;
}
// Rounded corners: a moving average of the dense centreline, endpoints fixed.
function smooth(points: Point[], window: number) {
  const n = Math.round(window / ROUTE_STEP);
  return points.map((p, i) => {
    const k = Math.min(n, i, points.length - 1 - i);
    if (k === 0) return p;
    let s = 0,
      d = 0;
    for (let j = i - k; j <= i + k; j++) {
      s += points[j][0];
      d += points[j][1];
    }
    return [s / (2 * k + 1), d / (2 * k + 1)] as Point;
  });
}
function extend(points: Point[], before: number, after: number): Point[] {
  const [a, b] = [points[0], points[1]],
    [y, z] = [points.at(-2)!, points.at(-1)!];
  const la = Math.hypot(b[0] - a[0], b[1] - a[1]),
    lz = Math.hypot(z[0] - y[0], z[1] - y[1]);
  return [
    [a[0] - ((b[0] - a[0]) * before) / la, a[1] - ((b[1] - a[1]) * before) / la],
    ...points,
    [z[0] + ((z[0] - y[0]) * after) / lz, z[1] + ((z[1] - y[1]) * after) / lz],
  ];
}
function crossing(a: Point[], b: Point[]) {
  for (let i = 1; i < a.length; i++)
    for (let j = 1; j < b.length; j++) {
      const [p, r] = [a[i - 1], [a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]]],
        [q, s] = [b[j - 1], [b[j][0] - b[j - 1][0], b[j][1] - b[j - 1][1]]],
        den = r[0] * s[1] - r[1] * s[0];
      if (Math.abs(den) < 1e-9) continue;
      const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / den,
        u = ((q[0] - p[0]) * r[1] - (q[1] - p[1]) * r[0]) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1)
        return { i, j, p: [p[0] + r[0] * t, p[1] + r[1] * t] as Point };
    }
  throw new Error("Crossroads streets do not cross");
}

// The two traced streets, extended past the faded paper edge so that walkers
// enter and leave unseen.
function streets() {
  const west = extend(CROSSROADS_ROUTES[0] as unknown as Point[], 3.5, 0),
    north = extend(CROSSROADS_ROUTES[1] as unknown as Point[], 2.5, 2.5);
  const x = crossing(west, north);
  return {
    west,
    north,
    westOfCross: [...west.slice(0, x.i), x.p] as Point[],
    eastOfCross: [x.p, ...west.slice(x.i)] as Point[],
    northOfCross: [...north.slice(0, x.j), x.p] as Point[],
    southOfCross: [x.p, ...north.slice(x.j)] as Point[],
  };
}
const reverse = (p: Point[]) => [...p].reverse();
// Clearance-weighted A* through the free ground between two points. The
// near-bank market square fills the traced shop street east of the crossroads,
// so the join weaves between stalls, browsers and loiterers.
function plan(from: Point, goals: Point[], radius: number) {
  const h = 0.1,
    pad = 8,
    all = [from, ...goals],
    s0 = Math.min(...all.map((p) => p[0])) - pad,
    d0 = Math.min(...all.map((p) => p[1])) - pad,
    w = Math.ceil((Math.max(...all.map((p) => p[0])) - s0 + pad) / h) + 1,
    hgt = Math.ceil((Math.max(...all.map((p) => p[1])) - d0 + pad) / h) + 1,
    at = (i: number) => [s0 + (i % w) * h, d0 + Math.floor(i / w) * h] as Point,
    cell = (p: Point) =>
      Math.round((p[1] - d0) / h) * w + Math.round((p[0] - s0) / h);
  const free = new Uint8Array(w * hgt),
    clearance = new Float64Array(w * hgt).fill(Infinity);
  const queue: number[] = [];
  for (let i = 0; i < w * hgt; i++) {
    const [s, d] = at(i),
      p = { s, d };
    free[i] = streetClear(p, radius) && (streetDistance(p) > 2.6 || cartGap(p) > radius + 0.04) ? 1 : 0;
    if (!free[i]) {
      clearance[i] = 0;
      queue.push(i);
    }
  }
  // Breadth-first distance to the nearest blocked cell.
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k],
      x = i % w,
      y = Math.floor(i / w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= hgt) continue;
      const j = ny * w + nx;
      if (clearance[j] > clearance[i] + h) {
        clearance[j] = clearance[i] + h;
        queue.push(j);
      }
    }
  }
  const start = cell(from),
    targets = new Map(goals.map((g, k) => [cell(g), k])),
    cost = new Float64Array(w * hgt).fill(Infinity),
    done = new Uint8Array(w * hgt),
    back = new Int32Array(w * hgt).fill(-1),
    heap: [number, number][] = [];
  const push = (f: number, i: number) => {
    heap.push([f, i]);
    for (let c = heap.length - 1; c > 0; ) {
      const parent = (c - 1) >> 1;
      if (heap[parent][0] <= heap[c][0]) break;
      [heap[parent], heap[c]] = [heap[c], heap[parent]];
      c = parent;
    }
  };
  const pop = () => {
    const top = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let c = 0; ; ) {
        const l = 2 * c + 1,
          r = l + 1;
        let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };
  let goal = -1;
  cost[start] = 0;
  push(0, start);
  while (heap.length) {
    const [, i] = pop();
    if (targets.has(i)) {
      goal = i;
      break;
    }
    if (done[i]) continue;
    done[i] = 1;
    const x = i % w,
      y = Math.floor(i / w);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx,
          ny = y + dy;
        if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= w || ny >= hgt) continue;
        const j = ny * w + nx;
        if (!free[j] && !targets.has(j)) continue;
        const step =
          Math.hypot(dx, dy) * h * (1 + 4 * Math.max(0, 0.75 - clearance[j]));
        if (cost[i] + step < cost[j]) {
          cost[j] = cost[i] + step;
          back[j] = i;
          push(cost[j], j);
        }
      }
  }
  if (goal < 0) throw new Error("No street path from " + from + " to the main street");
  const path: Point[] = [],
    reached = targets.get(goal)!;
  for (let i = goal; i >= 0; i = back[i]) path.unshift(at(i));
  path[0] = from;
  path[path.length - 1] = goals[reached];
  return { path, reached };
}
// Leave the traced shop street before the market square, find a way through
// it and arrive straight along the centre of the main street's western lane
// pair, beyond the cart sweep of the bridge landing.
function joinMainStreet(path: Point[]) {
  const middle = (JOIN_SIDE * (JOIN_LANES.inner + JOIN_LANES.outer)) / 2,
    // Candidate joins along the near approach, beyond the landing's cart sweep.
    joins = Array.from({ length: 30 }, (_, k) => -BRIDGE.length / 2 - 3.9 - k * 0.5),
    dense = resample(path);
  let cut = dense.length - 1;
  for (let i = 0; i < dense.length; i++) {
    const [s, d] = dense[i],
      a = Math.atan2(
        dense[Math.min(i + 1, dense.length - 1)][1] - dense[Math.max(0, i - 1)][1],
        dense[Math.min(i + 1, dense.length - 1)][0] - dense[Math.max(0, i - 1)][0],
      );
    // The street stays open while some band of two lanes crosses it.
    let run = 0,
      open = false;
    for (const o of OFFSETS) {
      run = streetClear(
        { s: s - Math.sin(a) * o, d: d + Math.cos(a) * o },
        WALKER_RADIUS + FIT_MARGIN,
      )
        ? run + 1
        : 0;
      if (run >= 13) {
        open = true;
        break;
      }
    }
    if (!open || streetDistance({ s, d }) < 2.6) {
      cut = Math.max(1, i - 15);
      break;
    }
  }
  let kept = dense.slice(0, cut + 1);
  const way = plan(
      kept.at(-1)!,
      joins.map((x) => {
        const p = bridgePoint(x - 2.6, middle);
        return [p.s, p.d] as Point;
      }),
      WALKER_RADIUS + FIT_MARGIN,
    ),
    x0 = joins[way.reached],
    end = bridgePoint(x0, middle);
  // When the way back out of a blocked street retraces it, leave the street
  // where the way departs instead of walking in and turning round.
  let departKept = kept.length - 1,
    departWay = 0;
  way.path.forEach((p, k) => {
    for (let j = 0; j < departKept; j++)
      if (Math.hypot(p[0] - kept[j][0], p[1] - kept[j][1]) < 0.3) {
        departKept = j;
        departWay = k;
        break;
      }
  });
  kept = kept.slice(0, Math.max(2, departKept + 1));
  return {
    kept,
    curve: [...way.path.slice(departWay + 1), [end.s, end.d] as Point],
    x0,
  };
}

function fit(
  name: string,
  path: Point[],
  riders: boolean,
  joinMain: boolean,
): StreetRoute {
  let points = smooth(resample(path), 1.3),
    joinStart = Infinity,
    x0 = 0;
  if (joinMain) {
    const j = joinMainStreet(points);
    x0 = j.x0;
    joinStart = j.kept.length;
    // Round the turn onto the straight approach. Smoothing windows shrink
    // toward the fixed end, so the last stretch stays on the main lane line.
    points = resample(smooth(smooth(resample([...j.kept, ...j.curve]), 1.2), 1.2));
    joinStart = Math.min(joinStart, points.length - 1);
  }
  const n = points.length,
    m = OFFSETS.length,
    angle = points.map((_, i) => {
      const a = points[Math.max(0, i - 1)],
        b = points[Math.min(n - 1, i + 1)];
      return Math.atan2(b[1] - a[1], b[0] - a[0]);
    });
  // Distance from the end of the curve onto the main street.
  const tail = points.map((_, i) => (n - 1 - i) * ROUTE_STEP);
  const tailLength = 2.4,
    endSpread = (JOIN_LANES.outer - JOIN_LANES.inner) / 2;
  // For each sample and lane-centre offset: how far the clear band reaches on
  // both sides (capped), or -1 when the centre itself is blocked.
  const reach: Float32Array[] = points.map(([s, d], i) => {
    const ns = -Math.sin(angle[i]),
      nd = Math.cos(angle[i]),
      nearMain = joinMain && streetDistance({ s, d }) < 2.8;
    const clear = OFFSETS.map((o) => {
      const p = { s: s + ns * o, d: d + nd * o };
      return (
        streetClear(p, WALKER_RADIUS + FIT_MARGIN) &&
        (!nearMain || cartGap(p) > WALKER_RADIUS + 0.04 + FIT_MARGIN)
      );
    });
    const r = new Float32Array(m).fill(-1);
    for (let c = 0; c < m; c++) {
      if (!clear[c]) continue;
      let k = 0;
      while (
        k * 0.04 < LANE_SPREAD + 0.04 &&
        c - k - 1 >= 0 &&
        c + k + 1 < m &&
        clear[c - k - 1] &&
        clear[c + k + 1]
      )
        k++;
      r[c] = k * 0.04;
    }
    return r;
  });
  // Dynamic programme over lane-centre offsets: stay near the street's middle,
  // keep the widest lanes, and turn by at most one offset per sample.
  const minimum = riders ? 0.12 : 0;
  const cost = new Float64Array(n * m).fill(Infinity),
    from = new Int16Array(n * m).fill(-1);
  const nodeCost = (i: number, c: number) =>
    reach[i][c] < minimum
      ? Infinity
      : ROUTE_STEP *
        (4 * (LANE_SPREAD - Math.min(LANE_SPREAD, reach[i][c])) + 0.5 * Math.abs(OFFSETS[c]));
  for (let c = 0; c < m; c++) cost[c] = nodeCost(0, c);
  for (let i = 1; i < n; i++)
    for (let c = 0; c < m; c++) {
      const own = nodeCost(i, c);
      if (own === Infinity) continue;
      for (let dc = -1; dc <= 1; dc++) {
        const b = c + dc;
        if (b < 0 || b >= m) continue;
        const total = cost[(i - 1) * m + b] + own;
        if (total < cost[i * m + c]) {
          cost[i * m + c] = total;
          from[i * m + c] = b;
        }
      }
    }
  let best = -1;
  for (let c = 0; c < m; c++)
    if (best < 0 || cost[(n - 1) * m + c] < cost[(n - 1) * m + best]) best = c;
  if (cost[(n - 1) * m + best] === Infinity) {
    let i = 0;
    while (i < n && cost.subarray(i * m, i * m + m).some((v) => v < Infinity)) i++;
    throw new Error("Street route " + name + " is blocked at " + points[i]);
  }
  const centre = new Int16Array(n);
  for (let i = n - 1; i >= 0; i--) {
    centre[i] = best;
    best = from[i * m + best];
  }
  // Lane spreads may only narrow inside the clear band; a Lipschitz lower
  // envelope lets them open and close gently.
  const spread = points.map((_, i) => {
    const w = joinMain ? Math.max(0, Math.min(1, 1 - tail[i] / tailLength)) : 0,
      cap = LANE_SPREAD + (endSpread - LANE_SPREAD) * w * w * (3 - 2 * w);
    return Math.max(0, Math.min(cap, reach[i][centre[i]]));
  });
  const k = SLOPE * ROUTE_STEP;
  for (let i = 1; i < n; i++) spread[i] = Math.min(spread[i], spread[i - 1] + k);
  for (let i = n - 2; i >= 0; i--) spread[i] = Math.min(spread[i], spread[i + 1] + k);
  const samples = points.map(([s, d], i) => {
    let c = OFFSETS[centre[i]],
      width = spread[i];
    // The last stretch lands exactly on the main street's western lanes.
    const last = joinMain ? Math.max(0, Math.min(1, 1 - tail[i] / 1.2)) : 0;
    c += (0 - c) * last;
    width += (endSpread - width) * last;
    return { s, d, angle: angle[i], c, spread: width };
  });
  if (joinMain) samples[n - 1].angle = streetAngle(x0);
  const polyLength = (n - 1) * ROUTE_STEP;
  const join = joinMain ? { x0, end: 40 } : undefined;
  return {
    name,
    samples,
    polyLength,
    join,
    length: polyLength + (join ? join.end - join.x0 : 0),
    riders,
  };
}

let cached: StreetRoute[] | null = null,
  cachedKey = "";
export function streetRoutes(): StreetRoute[] {
  const key = STATIC_OBSTACLES.length + ":" + STREET_OBSTACLES.length;
  if (cached && key === cachedKey) return cached;
  const st = streets();
  cachedKey = key;
  cached = [
    // West edge, along the shop street, onto the main street and over the bridge.
    fit("west-street-to-bridge", st.west, false, true),
    // North to south through the crossroads.
    fit("crossroads-north-south", st.north, true, false),
    // Turning at the crossroads toward the western edge.
    fit("north-to-west", [...st.northOfCross, ...reverse(st.westOfCross)], true, false),
    fit("south-to-west", [...reverse(st.southOfCross), ...reverse(st.westOfCross)], true, false),
    // From the southern street, east along the shop street and over the bridge.
    fit("south-to-bridge", [...reverse(st.southOfCross), ...st.eastOfCross], false, true),
  ];
  return cached;
}

// Position on a route. u in [-1, 1] picks a lane inside the band: +1 is the
// left-hand lane in the direction of increasing q.
export function routeSample(route: StreetRoute, q: number) {
  const x = Math.max(0, Math.min(route.samples.length - 1.000001, q / ROUTE_STEP)),
    i = Math.floor(x),
    t = x - i,
    a = route.samples[i],
    b = route.samples[i + 1];
  const ca = Math.cos(a.angle) * (1 - t) + Math.cos(b.angle) * t,
    sa = Math.sin(a.angle) * (1 - t) + Math.sin(b.angle) * t;
  return {
    s: a.s + (b.s - a.s) * t,
    d: a.d + (b.d - a.d) * t,
    angle: Math.atan2(sa, ca),
    c: a.c + (b.c - a.c) * t,
    spread: a.spread + (b.spread - a.spread) * t,
  };
}
export function riderDiscs(p: PassagePoint & { track: number }) {
  return [-1, 1].map((k) => ({
    s: p.s + Math.cos(p.track) * RIDER_REACH * k,
    d: p.d + Math.sin(p.track) * RIDER_REACH * k,
    radius: RIDER_RADIUS,
  }));
}
