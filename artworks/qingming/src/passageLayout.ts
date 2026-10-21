// Coordinates in the reference crop's horizontal/depth basis. All terrain,
// architecture and pedestrian routes share this basis before world rotation.
export type BankSide = "far" | "near";
export type PassagePoint = { s: number; d: number };
export const GROUND_Y = 0.42; // about 0.93 m / three feet above the mean waterline
export const PERSON_SCALE = 1.25; // nominal adult height 0.85: bridge width ≈ 3.8 adult heights
export const PERSON_WIDTH_SCALE = 1.05; // retain the existing walking clearance
export const BRIDGE_RAIL_HEIGHT = 0.42;
export const MIN_EAVE_HEIGHT = 1.12;
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
    [10, 4.2],
    [16, 6.1],
    [22, 6.4],
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
  gable?: boolean;
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
  const angle = 0; // Roofs follow the two street/courtyard axes, not shoreline bends.
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
  waterfrontHall("far", -18.3, 3.8, 2.0, 0.72, 3.7),
  waterfrontHall("far", -13.5, 3.4, 2.2, 0.86, 3.7),
  waterfrontHall("far", -9.2, 3, 2.2, 0.95, 1.6),
  waterfrontHall("far", -0.7, 3.8, 2.7, 1.1, 3.7),
  waterfrontHall("far", 3.45, 3.3, 2.3, 1, 3.7),
  waterfrontHall("far", 10.2, 4.4, 2.3, 0.88, 1.4),
  waterfrontHall("far", 16, 4.6, 2.4, 0.83, 1.4),
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
  { s: -16.7, d: 4.6 },
  { s: -13.7, d: 10 },
  { s: -3.4, d: 9.8 },
  { s: 1.6, d: 10.5 },
].forEach((p, i) => Object.assign(HALLS[7 + i], p, { angle: 0 }));
// Leave the bridge axis open as a continuous market street on both banks.
HALLS[1].d = -11.3;
HALLS[1].depth = 2.05;
HALLS[8].width = 4.4;
HALLS[9].width = 4;
HALLS[2].s = -9.55;
HALLS[2].width = 2.4;
// Broad foreground roofs and a small waterside shelter frame the open right
// reach in the reference. Keep their full eaves on dry land and off the street.
HALLS.push(
  { ...waterfrontHall("near", 6.9, 3.8, 2.5, 1.05, 2.2), d: 9.0, angle: 0 },
  waterfrontHall("near", 11.4, 3.3, 2.0, 0.88, 1.55),
  waterfrontHall("far", 6.6, 1.6, 1.2, 0.58, 1.4),
);
// Hand-read roof axes: the foreground hall immediately right of the bridge
// has its ridge perpendicular to the adjoining hall and the riverfront shops.
HALLS[9].angle = Math.PI / 2;
HALLS[9].gable = true;
HALLS[9].depth = 3.0;
HALLS[10].angle = 0;
HALLS[3].angle = 0;
HALLS[3].width = 3.35;
// Small shelter beside the near landing and roofs partly visible behind the
// far street. These were omitted when the scene was reduced to landmark blocks.
Object.assign(HALLS[11], {
  s: -3.8,
  d: 6.2,
  width: 1.8,
  depth: 1.1,
  height: 0.65,
  angle: 0,
});
HALLS.push(
  {
    side: "near",
    s: -19,
    d: 9.4,
    width: 2.4,
    depth: 2.7,
    height: 0.85,
    angle: Math.PI / 2,
    gable: true,
  },
  {
    side: "near",
    s: 11.6,
    d: 11.2,
    width: 2.1,
    depth: 1.6,
    height: 0.78,
    angle: Math.PI / 2,
    gable: true,
  },
  {
    side: "far",
    s: -16.4,
    d: -13.35,
    width: 2.5,
    depth: 0.6,
    height: 0.55,
    angle: 0,
  },
  {
    side: "far",
    s: -11.8,
    d: -13.35,
    width: 2.6,
    depth: 0.6,
    height: 0.67,
    angle: 0,
  },
  {
    side: "far",
    s: 1.3,
    d: -13.4,
    width: 2.9,
    depth: 0.7,
    height: 0.64,
    angle: 0,
  },
  {
    side: "far",
    s: 12,
    d: -11.7,
    width: 3.4,
    depth: 1.6,
    height: 0.86,
    angle: 0,
  },
  {
    side: "near",
    s: 17.5,
    d: 11.3,
    width: 3.1,
    depth: 2,
    height: 0.8,
    angle: 0,
  },
);
// Small shop roofs formerly had eaves below adult head height. Keep their
// authored footprints, but provide headroom for the tallest standing profile.
HALLS.forEach(h => { h.height = Math.max(h.height, MIN_EAVE_HEIGHT); });
// The old bare tree's trunk stands beside the near quay, behind the foreground
// roof line, with the crown reaching into the water silhouette.
export const REFERENCE_TREE = {
  s: 6.1,
  d: 4.4,
  size: 1.45,
  form: "spreading" as const,
};
// Both full-width landings sit inland. Local x runs from near bank to far bank.
const near = { s: -7.4, d: 3.35 },
  far = { s: -5.9, d: -7.35 };
export const BRIDGE = {
  near,
  far,
  width: 3.2,
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
// Looser browsing groups leave gaps between counters and river watchers.
export const BRIDGE_PEOPLE_PER_SIDE = 16;
export const BRIDGE_SHOPS = [-1, 1].flatMap((side) =>
  Array.from({ length: 8 }, (_, i) => {
    const station = 1 + i * 4;
    return {
      x:
        -BRIDGE.length / 2 +
        0.4 +
        (station * (BRIDGE.length - 0.8)) / 31,
      lateral: side * (BRIDGE.width / 2 + 0.04),
      width: 0.84,
      depth: 0.24,
      station,
      side,
      kind: i % 4,
      canopy: i % 4 === 0,
    };
  }),
);
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
