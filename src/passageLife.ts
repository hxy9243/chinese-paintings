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
  "dwelling" | "warehouse" | "shop" | "courtyard" | "gallery";
export const BUILDING_KINDS: BuildingKind[] = [
  "warehouse",
  "dwelling",
  "warehouse",
  "courtyard",
  "dwelling",
  "gallery",
  "courtyard",
  "courtyard",
  "gallery",
  "dwelling",
  "courtyard",
  "shop",
  "shop",
  "warehouse",
  "shop",
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
export function boatPose(index: number, time: number) {
  const b = BOATS[index],
    phase = time * 0.34 + index * 1.71;
  const drift = index === 0 ? 0.45 : index === 1 ? 0.08 : 0.13;
  return {
    s: b.s + Math.sin(phase * 0.45) * drift,
    d: b.d + Math.sin(phase * 0.37) * 0.025,
    y: Math.sin(phase) * 0.016,
    angle: b.angle + Math.sin(phase * 0.6) * 0.006,
    roll: Math.sin(phase + 0.8) * 0.009,
    pitch: Math.cos(phase * 0.8) * 0.006,
  };
}
export const RIPPLE_COUNT = 120;
export function riverRipple(index: number, time: number) {
  const phase = (index * 0.61803398875 + time * 0.055) % 1;
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
  for (let i = 0; i < 36; i++) {
    const s = -20.8 + i * 1.18,
      sign = side === "near" ? 1 : -1;
    const kind: NatureKind =
      i % 9 === 0
        ? "willow"
        : i % 7 === 0
          ? "spring"
          : i % 5 === 0
            ? "bare"
            : i % 3 === 0
              ? "rock"
              : "reed";
    const d =
      shoreDepth(side, s) +
      sign * (kind === "reed" || kind === "rock" ? 0.1 : 1.05);
    const p = { s, d, kind, size: 0.65 + (i % 4) * 0.12 };
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
