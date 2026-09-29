import {
  BOATS,
  BRIDGE,
  GROUND_Y,
  HALLS,
  bridgeHeight,
  bridgePoint,
  shoreDepth,
  type BankSide,
  type PassagePoint,
} from "./passageLayout";

export type BuildingKind =
  | "dwelling"
  | "warehouse"
  | "shop"
  | "courtyard"
  | "gallery"
  | "shed"
  | "openhall"
  | "compound";
export const BUILDING_KINDS: BuildingKind[] = [
  "warehouse",
  "compound",
  "shed",
  "courtyard",
  "dwelling",
  "gallery",
  "compound",
  "courtyard",
  "gallery",
  "dwelling",
  "compound",
  "openhall",
  "shop",
  "shed",
  "openhall",
  "shop",
];
export const WALKER_COUNT = 36;
export const BRIDGE_WALKERS = 12;

export function insideRoof(p: PassagePoint, margin = 0) {
  return HALLS.some((h) => {
    const s = p.s - h.s,
      d = p.d - h.d;
    const u = s * Math.cos(h.angle) + d * Math.sin(h.angle),
      v = -s * Math.sin(h.angle) + d * Math.cos(h.angle);
    return (
      Math.abs(u) < h.width / 2 + 0.2 + margin &&
      Math.abs(v) < h.depth / 2 + 0.23 + margin
    );
  });
}
export function walkPose(index: number, time: number) {
  const crossing = index < BRIDGE_WALKERS;
  const phase =
    (time * (crossing ? 0.014 : 0.006) + ((index * 0.61803398875) % 2)) % 2;
  const forward = phase < 1,
    leg = forward ? phase : 2 - phase;
  const travel = Math.max(0, Math.min(1, (leg - 0.025) / 0.95));
  const moving = leg > 0.025 && leg < 0.975;
  if (crossing) {
    const x = -BRIDGE.length / 2 + travel * BRIDGE.length;
    return {
      ...bridgePoint(x, index % 2 ? 0.32 : -0.32),
      y: bridgeHeight(x),
      angle: BRIDGE.angle + (forward ? 0 : Math.PI),
      moving,
    };
  }
  const side: BankSide = index % 2 ? "far" : "near";
  const s = -20 + travel * 40;
  const d = shoreDepth(side, s) + (side === "far" ? -0.13 : 0.28);
  const slope =
    (shoreDepth(side, s + 0.03) - shoreDepth(side, s - 0.03)) / 0.06;
  return {
    s,
    d,
    y: GROUND_Y,
    angle: Math.atan(slope) + (forward ? 0 : Math.PI),
    moving,
  };
}
// Recycle beyond the frame, where the complete hull is invisible. The route
// samples the entire hull length so even the largest boats clear bank bends.
export function boatPose(index: number, time: number) {
  const b = BOATS[index];
  const direction = index % 2 ? -1 : 1;
  const speed = 0.16 + (index % 3) * 0.018;
  const s = ((((b.s + 30 + direction * time * speed) % 60) + 60) % 60) - 30;
  let lower = -Infinity,
    upper = Infinity;
  for (let j = 0; j <= 32; j++) {
    const x = s + (j / 32 - 0.5) * b.length;
    lower = Math.max(lower, shoreDepth("far", x));
    upper = Math.min(upper, shoreDepth("near", x));
  }
  const margin = b.width * 0.66 + 0.15;
  const fraction = index % 2 ? 0.32 : 0.68;
  const d = lower + margin + (upper - lower - 2 * margin) * fraction;
  const phase = time * 0.34 + index * 1.71;
  return {
    s,
    d,
    y: Math.sin(phase) * 0.012,
    angle: direction === 1 ? 0 : Math.PI,
    roll: Math.sin(phase + 0.8) * 0.006,
    pitch: Math.cos(phase * 0.8) * 0.004,
  };
}
export const RIPPLE_COUNT = 120;
export function riverRipple(index: number, time: number) {
  const phase = (index * 0.61803398875 + time * 0.025) % 1;
  const s = -20.7 + ((index * 0.731) % 41) + phase * 0.65;
  const fraction = 0.14 + ((index * 0.417) % 0.72);
  return {
    s,
    fraction,
    length: (0.25 + (index % 5) * 0.13) * Math.sin(Math.PI * phase) ** 2,
  };
}
export type NatureKind = "bare" | "spring" | "willow" | "reed" | "rock";
export const NATURE: (PassagePoint & { kind: NatureKind; size: number })[] = [];
for (const side of ["near", "far"] as const)
  for (let i = 0; i < 44; i++) {
    const s = -20.4 + i * 0.95,
      sign = side === "near" ? 1 : -1;
    const kind: NatureKind =
      i % 6 === 0
        ? "willow"
        : i % 4 === 0
          ? "spring"
          : i % 3 === 0
            ? "bare"
            : i % 5 === 0
              ? "rock"
              : "reed";
    const d =
      shoreDepth(side, s) +
      sign * (kind === "reed" || kind === "rock" ? 0.1 : 1.05);
    const p = {
      s,
      d,
      kind,
      size:
        kind === "reed" || kind === "rock"
          ? 0.65 + (i % 4) * 0.12
          : 1.1 + (i % 4) * 0.18,
    };
    // Keep the bridge approaches and all roofs clear.
    const u =
      (s - BRIDGE.center.s) * Math.cos(BRIDGE.angle) +
      (d - BRIDGE.center.d) * Math.sin(BRIDGE.angle);
    const v =
      -(s - BRIDGE.center.s) * Math.sin(BRIDGE.angle) +
      (d - BRIDGE.center.d) * Math.cos(BRIDGE.angle);
    if (
      Math.abs(u) < BRIDGE.length / 2 + 1.4 &&
      Math.abs(v) < BRIDGE.width / 2 + 0.65
    )
      continue;
    if (!insideRoof(p, kind === "reed" || kind === "rock" ? 0.12 : 0.8))
      NATURE.push(p);
  }

// Additional tall groves behind the roof rows; trunks stay clear of architecture.
for (const side of ["near", "far"] as const)
  for (let i = 0; i < 18; i++) {
    const s = -17 + i * 2;
    const d = (side === "far" ? -1 : 1) * (10.7 + (i % 3) * 0.8);
    const p = { s, d };
    if (!insideRoof(p, 0.8))
      NATURE.push({
        ...p,
        kind: i % 4 === 0 ? "spring" : "bare",
        size: 1.35 + (i % 3) * 0.2,
      });
  }

export const CARTS = [
  { s: -18, d: 1.0, angle: 0.24 },
  { s: -14, d: 2.4, angle: 0.18 },
  { s: -9.5, d: 4.4, angle: -0.45 },
  { s: -4.5, d: -7.7, angle: 0.12 },
  { s: -20, d: -7.2, angle: 0.11 },
  { s: 12.3, d: 5.1, angle: 0.36 },
];
