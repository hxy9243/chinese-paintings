// Coordinates in the reference crop's horizontal/depth basis. All terrain,
// architecture and pedestrian routes share this basis before world rotation.
export type BankSide = "far" | "near";
export type PassagePoint = { s: number; d: number };
export const GROUND_Y = 0.015;
export const PERSON_SCALE = 0.65; // about 0.36 units tall in the painted passage
export const SHORELINES: Record<BankSide, PassagePoint[]> = {
  far: [
    [-22, -5.8],
    [-13, -6.8],
    [-7, -6.8],
    [-3.6, -5.8],
    [5, -5.5],
    [11, -5],
    [17, -4.2],
    [22, -3.4],
  ].map(([s, d]) => ({ s, d })),
  near: [
    [-22, -0.1],
    [-16, 0.7],
    [-11, 1.8],
    [-8.4, 2.05],
    [-6.5, 2.25],
    [-3, 4],
    [0, 4],
    [4, 1.5],
    [7, 0.7],
    [10, 3],
    [16, 5.4],
    [22, 6],
  ].map(([s, d]) => ({ s, d })),
};
export function shoreDepth(side: BankSide, s: number): number {
  const shore = SHORELINES[side];
  s = Math.max(-22, Math.min(22, s));
  for (let i = 1; i < shore.length; i++) {
    const a = shore[i - 1],
      b = shore[i];
    if (s <= b.s) return a.d + ((b.d - a.d) * (s - a.s)) / (b.s - a.s);
  }
  return shore.at(-1)!.d;
}
// Shared rounded perimeter: straight river entrances, generous curved corners.
export function bankOutline(side: BankSide): number[][] {
  const edge = SHORELINES[side].map(({ s, d }) => [s, d]);
  const sign = side === "far" ? -1 : 1;
  const arc = (cx: number, start: number) =>
    Array.from({ length: 17 }, (_, i) => {
      const angle = start + ((i / 16) * Math.PI) / 2;
      return [cx + 6 * Math.cos(angle), sign * (8 + 6 * Math.sin(angle))];
    });
  return [...edge, ...arc(16, 0), ...arc(-16, Math.PI / 2)];
}
export function passageOutline(): number[][] {
  return [
    ...bankOutline("near").slice(SHORELINES.near.length),
    ...bankOutline("far").slice(SHORELINES.far.length).reverse(),
  ];
}
export function onBank(side: BankSide, p: PassagePoint, margin = 0): boolean {
  return side === "far"
    ? p.d <= shoreDepth(side, p.s) - margin
    : p.d >= shoreDepth(side, p.s) + margin;
}
export interface HallLayout extends PassagePoint {
  side: BankSide;
  width: number;
  depth: number;
  height: number;
  angle: number;
}
// Sample the whole roof footprint, including overhanging eaves, at shoreline bends.
export function roofFootprint(h: HallLayout): PassagePoint[] {
  const points: PassagePoint[] = [];
  for (let i = 0; i <= 20; i++)
    for (const side of [-1, 1]) {
      const u = ((i / 20) * 2 - 1) * (h.width / 2 + 0.2),
        v = side * (h.depth / 2 + 0.23);
      points.push({
        s: h.s + u * Math.cos(h.angle) - v * Math.sin(h.angle),
        d: h.d + u * Math.sin(h.angle) + v * Math.cos(h.angle),
      });
    }
  for (let i = 0; i <= 20; i++)
    for (const side of [-1, 1]) {
      const u = side * (h.width / 2 + 0.2),
        v = ((i / 20) * 2 - 1) * (h.depth / 2 + 0.23);
      points.push({
        s: h.s + u * Math.cos(h.angle) - v * Math.sin(h.angle),
        d: h.d + u * Math.sin(h.angle) + v * Math.cos(h.angle),
      });
    }
  return points;
}
function waterfrontHall(
  side: BankSide,
  s: number,
  width: number,
  depth: number,
  height: number,
  setback: number,
): HallLayout {
  const angle = Math.atan2(
    shoreDepth(side, s + width / 2) - shoreDepth(side, s - width / 2),
    width,
  );
  const h: HallLayout = {
    side,
    s,
    d: shoreDepth(side, s),
    width,
    depth,
    height,
    angle,
  };
  const sign = side === "far" ? -1 : 1;
  const clearance =
    Math.max(
      ...roofFootprint(h).map((p) => sign * (shoreDepth(side, p.s) - p.d)),
    ) + setback;
  h.d += sign * clearance;
  return h;
}
// Low waterfront shops, rear warehouses, broad foreground roofs; heights are
// relative to the same person scale rather than arbitrary per-object scaling.
export const HALLS: HallLayout[] = [
  waterfrontHall("far", -18, 4.4, 2.1, 0.85, 3.7),
  waterfrontHall("far", -13.25, 3.8, 2.6, 1.05, 3.7),
  waterfrontHall("far", -9.2, 3, 2.2, 0.95, 1.6),
  waterfrontHall("far", -0.7, 3.8, 2.7, 1.1, 3.7),
  waterfrontHall("far", 3.45, 3.3, 2.3, 1, 3.7),
  waterfrontHall("far", 9.7, 5.4, 3.1, 1.2, 1.4),
  waterfrontHall("far", 15.5, 5.1, 2.9, 1, 1.4),
  waterfrontHall("near", -16.5, 4.8, 3.8, 1.15, 2.5),
  waterfrontHall("near", -10.4, 5.4, 3.8, 1.35, 3.9),
  waterfrontHall("near", -4.4, 5.2, 3.6, 1.2, 2.5),
  waterfrontHall("near", 1.05, 4.1, 3.5, 1.15, 3.5),
  waterfrontHall("near", 2.6, 3.1, 2.1, 0.8, 1.35),
  ...[-17, -13, -0.9, 3.2].map((s) =>
    waterfrontHall("far", s, 2.7, 1.3, 0.6, 1.35),
  ),
];
// Compact foreground street: matching roof axes and narrow gaps between eaves.
[
  { s: -16.7, d: 5.4 },
  { s: -11, d: 8.2 },
  { s: -5, d: 9.8 },
  { s: 0.4, d: 10 },
].forEach((p, i) => Object.assign(HALLS[7 + i], p, { angle: 0.08 }));
// Both full-width landings sit inland. Local x runs from near bank to far bank.
const near = { s: -7.4, d: 3.35 },
  far = { s: -5.9, d: -7.35 };
export const BRIDGE = {
  near,
  far,
  width: 2.3,
  rise: 2.05,
  length: Math.hypot(far.s - near.s, far.d - near.d),
  angle: Math.atan2(far.d - near.d, far.s - near.s),
  center: { s: (near.s + far.s) / 2, d: (near.d + far.d) / 2 },
};
export function bridgePoint(x: number, lateral = 0): PassagePoint {
  return {
    s:
      BRIDGE.center.s +
      x * Math.cos(BRIDGE.angle) -
      lateral * Math.sin(BRIDGE.angle),
    d:
      BRIDGE.center.d +
      x * Math.sin(BRIDGE.angle) +
      lateral * Math.cos(BRIDGE.angle),
  };
}
export function bridgeHeight(x: number): number {
  return (
    GROUND_Y + BRIDGE.rise * Math.max(0, 1 - ((2 * x) / BRIDGE.length) ** 2)
  );
}
export const BOATS = [
  { s: 16, d: -0.3, length: 7.2, width: 1.2, cabin: true, angle: 0.12 },
  { s: -6.8, d: -3.1, length: 5.4, width: 1.1, cabin: false, angle: 0 },
  { s: -16, d: -3.8, length: 5.1, width: 1, cabin: true, angle: -0.1 },
  { s: 10, d: 0.4, length: 4.9, width: 1, cabin: false, angle: 0.18 },
  { s: 1, d: 1.3, length: 3.5, width: 0.75, cabin: false, angle: -0.25 },
  { s: 25, d: 0, length: 3.8, width: 0.8, cabin: true, angle: 0 },
  { s: -25, d: -3.6, length: 4.2, width: 0.8, cabin: false, angle: 0 },
];
