import {
  BRIDGE,
  HALLS,
  SHORELINES,
  shoreDepth,
  bridgePoint,
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
      Math.abs(s) > 21.9 ||
      Math.abs(d) > 13.9 ||
      Math.hypot(Math.max(0, Math.abs(s) - 16), Math.max(0, Math.abs(d) - 8)) >
        5.9
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
export const BANK_LOOPS = ["near", "far"].flatMap((side) => {
  const bank = side as BankSide,
    anchor = bank === "near" ? BRIDGE.near : BRIDGE.far;
  return [
    { side: bank, start: -20, end: anchor.s - 2.1 },
    { side: bank, start: anchor.s + 2.1, end: 20 },
  ];
});
export function bankCenter(side: BankSide, s: number) {
  return shoreDepth(side, s) + (side === "near" ? 1 : -1) * 0.8;
}
export const WALK_SEGMENTS: Segment[] = BANK_LOOPS.flatMap((loop) => {
  const breaks = [
    loop.start,
    ...SHORELINES[loop.side]
      .map((p) => p.s)
      .filter((s) => s > loop.start && s < loop.end),
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
export const MAIN_STREET: Segment = { a: bridgePoint(-22), b: bridgePoint(22) };
export const CART_ROUTES: CartRoute[] = Array.from({ length: 8 }, (_, i) => ({
  ...bridgePoint(-17 + i * 4.6),
  angle: BRIDGE.angle,
  length: 44,
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
    segmentDistance(p, MAIN_STREET) > radius + streetClearance + 0.08
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
