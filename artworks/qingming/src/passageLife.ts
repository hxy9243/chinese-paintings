import * as THREE from "three";
import { wander } from "./peopleMotion";
import { pedestrianPoses } from "./pedestrians";
export { WALKER_COUNT, MAIN_STREET_WALKERS } from "./pedestrians";
import { CART_ROUTES, reserve, roofClear } from "./passageSpace";
import {
  BOATS,
  REFERENCE_TREE,
  BRIDGE,
  BRIDGE_PEOPLE_PER_SIDE,
  GROUND_Y,
  HALLS,
  bridgeHeight,
  bridgePoint,
  shoreDepth,
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
  | "compound"
  | "upper-storey"
  | "construction"
  | "ornate-gate";
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
  "dwelling",
  "openhall",
  "shop",
  "warehouse",
  "shed",
  "dwelling",
  "warehouse",
  "dwelling",
  "compound",
  "courtyard",
];
BUILDING_KINDS[8] = "upper-storey";
BUILDING_KINDS.push("ornate-gate");
// Keep the historic export for callers; these people now use the whole street.
export { MAIN_STREET_WALKERS as BRIDGE_WALKERS } from "./pedestrians";
export const BRIDGE_OBSERVERS = BRIDGE_PEOPLE_PER_SIDE * 2;

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
export function walkPose(index: number, time: number, seed = 0) {
  return pedestrianPoses(time, seed)[index];
}
export const CARTS = CART_ROUTES;
export const CART_KINDS = [
  "horse-cart",
  "covered-cart",
  "pack-horse",
  "donkey-cart",
  "ox-cart",
  "covered-cart",
  "horse-cart",
  "handcart",
] as const;
export function cartPose(index: number, time: number) {
  const clock = time * 0.16 + (index * 44) / CARTS.length + 5,
    x = -22 + (((clock % 44) + 44) % 44);
  const slope = (bridgeHeight(x + 0.55) - bridgeHeight(x - 0.55)) / 1.1;
  let y = GROUND_Y;
  for (let u = -0.66; u <= 0.661; u += 0.066)
    y = Math.max(y, bridgeHeight(x + u) - u * slope);
  return {
    ...bridgePoint(x),
    y: y + 0.005,
    angle: BRIDGE.angle,
    slope,
    moving: true,
    turning: false,
    traveled: clock,
  };
}
// Follow the open river through the top and right crop. Tangent-aligned rigid
// hulls use separate travel lanes; recycling happens beyond the visible banks.
const navigationCurve=new THREE.CatmullRomCurve3([
  [-13,-36],[-13,-16],[-12.9,-9],[-10.8,-4.7],[-5,-2.5],[-1,-2.5],[8,-2.5],[18,-1],[28,-1],[40,-1]
].map(([s,d])=>new THREE.Vector3(s,0,d)),false,"centripetal");
const routeLength=navigationCurve.getLength();
const initialProgress=[.71,.60,.28,.49,.37,.91,.12];
export function boatPose(index:number,time:number){
  const direction=index%2===0?1:-1;
  const u=((initialProgress[index]+direction*time*.18/routeLength)%1+1)%1;
  const point=navigationCurve.getPointAt(u),tangent=navigationCurve.getTangentAt(u);
  const lane=direction*(.95+.30*THREE.MathUtils.clamp((-point.x-1)/5,0,1)+.18*THREE.MathUtils.clamp((point.x-5)/3,0,1)*THREE.MathUtils.clamp((23-point.x)/5,0,1));
  const phase=time*.34+index*1.71;
  return {s:point.x-tangent.z*lane,d:point.z+tangent.x*lane,
    y:Math.sin(phase)*.012,angle:Math.atan2(tangent.z,tangent.x)+(direction===1?0:Math.PI),
    roll:Math.sin(phase+.8)*.006,pitch:Math.cos(phase*.8)*.004};
}
export const RIPPLE_COUNT = 120;
export function riverRipple(index: number, time: number) {
  const phase = (index * 0.61803398875 + time * 0.025) % 1;
  const s = -17 + ((index * 0.731) % 38) + phase * 0.65;
  const fraction = 0.14 + ((index * 0.417) % 0.72);
  return {
    s,
    fraction,
    length: (0.25 + (index % 5) * 0.13) * Math.sin(Math.PI * phase) ** 2,
  };
}
// Reserve the reference landmark's actual trunk/root footprint before stalls.
// Its elevated crown may overhang water, like the painting; the roots may not.
if (!reserve(REFERENCE_TREE, 0.68, "reference-tree"))
  throw new Error("Reference tree root is obstructed");
// Explicit observed trees are reserved before markets. Reserve roots, not the
// elevated crown: crown-sized exclusion discs silently erased riverside trees.
export const FEATURE_TREES: (PassagePoint & {
  id: string;
  size: number;
  form: "spreading" | "pollard" | "sapling";
})[] = [{ ...REFERENCE_TREE, id: "near-quay-old-tree" }];
const observedTrees = [
  {id:"west-bend-pine",s:-21,d:-7,size:1.15,form:"spreading"},
  {id:"bend-roof-pine",s:-13.9,d:3.6,size:.8,form:"spreading"},
  {id:"balcony-rear-pine",s:-5.7,d:4.5,size:.85,form:"spreading"},
  {id:"foreground-pine",s:-6,d:11.2,size:.65,form:"pollard"},
  {id:"right-bank-pine",s:15.8,d:6.5,size:.8,form:"spreading"},
  {id:"far-east-pine",s:21.8,d:-7.3,size:.8,form:"spreading"},
] as const;
for (const t of observedTrees) {
  if (!reserve(t, 0.24, "reference-tree"))
    throw new Error("Observed tree root obstructed: " + t.id);
  FEATURE_TREES.push(t);
}
// Keep a tall willow grove clear before allocating the denser market.
const willowGrove = reserve({ s: 19, d: -11 }, 1.1, "willow")
  ? [{ s: 19, d: -11, kind: "willow" as const, size: 1.15 }]
  : [];
export const MARKET: (PassagePoint & { parasol: boolean; size: number })[] = [];
// Small roadside counters fill the street edges before the broader market.
for (const lateral of [-2.55, 2.55, -3.75, 3.75, -4.85, 4.85]) {
  for (let x = -15.7; x <= 11.7 && MARKET.length < 16; x += 1.2) {
    if (Math.abs(x) < BRIDGE.length / 2 + 0.8) continue;
    const p = bridgePoint(x, lateral);
    if (reserve(p, 0.5, "market"))
      MARKET.push({ ...p, parasol: false, size: 0.75 });
  }
}

for (let i = 0; i < 36; i++) {
  const candidates: PassagePoint[] = [];
  for (let s = -20; s <= 20; s += 0.55)
    for (const side of ["near", "far"] as const)
      for (let offset = 1.8; offset < 6.5; offset += 0.6)
        candidates.push({
          s,
          d: shoreDepth(side, s) + (side === "near" ? 1 : -1) * offset,
        });
  const target =
    i < 14
      ? { s: BRIDGE.near.s + (i % 2 ? -3.3 : 3.3), d: 4.7 + Math.floor(i / 2) * 1.15 }
      : { s: -19 + ((i - 14) % 7) * 6, d: i < 21 ? 5 : -8 };
  candidates.sort(
    (a, b) =>
      Math.hypot(a.s - target.s, a.d - target.d) -
      Math.hypot(b.s - target.s, b.d - target.d),
  );
  const parasol = i % 3 === 0;
  for (const p of candidates)
    if (reserve(p, parasol ? 0.97 : 0.7, "market")) {
      MARKET.push({ ...p, parasol, size: 1 });
      break;
    }
}
// Browsing spaces are reserved together with stalls, before planting the groves.
export const SHOPPER_SPACE = 0.36;
export const SHOPPER_WANDER = 0.18;
export const SHOP_VISITORS: (PassagePoint & { shop: number })[] = [];
MARKET.forEach((shop, index) => {
  let placed = 0;
  for (let j = 0; j < 192 && placed < 6; j++) {
    const angle = ((j % 96) * Math.PI) / 48,
      offset =
        (shop.size < 1 ? 0.5 : shop.parasol ? 0.97 : 0.7) + SHOPPER_SPACE + 0.1 + Math.floor(j/96)*.78;
    const p = {
      s: shop.s + Math.cos(angle) * offset,
      d: shop.d + Math.sin(angle) * offset,
    };
    if (reserve(p, SHOPPER_SPACE, "shopper")) {
      SHOP_VISITORS.push({ ...p, shop: index });
      placed++;
    }
  }
});
export function shopperPose(index: number, time: number, seed = 0) {
  const home = SHOP_VISITORS[index],
    shop = MARKET[home.shop],
    p = wander(index + 300, time, SHOPPER_WANDER, seed);
  const s = home.s + p.s,
    d = home.d + p.d;
  return {
    ...p,
    s,
    d,
    y: GROUND_Y,
    angle: p.moving ? p.angle : Math.atan2(shop.d - d, shop.s - s),
  };
}
export type NatureKind = "bare" | "spring" | "willow" | "reed" | "rock";
export const NATURE: (PassagePoint & { kind: NatureKind; size: number })[] = [
  ...willowGrove,
];
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
      sign * (kind === "reed" ? 0.18 : kind === "rock" ? 1.7 : 2.1);
    const p = {
      s,
      d,
      kind,
      size:
        kind === "reed" || kind === "rock"
          ? 0.5 + (i % 4) * 0.08
          : 1.1 + (i % 4) * 0.18,
    };
    const radius =
      kind === "reed"
        ? 0.12
        : kind === "rock"
          ? 0.2
          : kind === "willow"
            ? p.size * 0.95
            : 0.45 * p.size;
    if (roofClear(p, radius) && reserve(p, radius, kind)) NATURE.push(p);
  }

// Additional tall groves behind the roof rows; trunks stay clear of architecture.
for (const side of ["near", "far"] as const)
  for (let i = 0; i < 28; i++) {
    const s = -17 + i * 2;
    const d = (side === "far" ? -1 : 1) * (10.7 + (i % 3) * 0.8);
    const p = { s, d };
    if (
      roofClear(p, 0.45 * (1.35 + (i % 3) * 0.2)) &&
      reserve(p, 0.45 * (1.35 + (i % 3) * 0.2), "tree")
    )
      NATURE.push({
        ...p,
        kind: i % 4 === 0 ? "spring" : "bare",
        size: 1.35 + (i % 3) * 0.2,
      });
  }

// Fill available grove sites before placing the stationary crowd. Crowns can
// extend above the footpaths; conservative trunk/root discs keep traffic clear.
for (
  let i = 0;
  i < 4000 &&
  NATURE.filter(
    (n) => n.kind === "bare" || n.kind === "spring" || n.kind === "willow",
  ).length < 30;
  i++
) {
  const s = -20 + ((i * 1.73) % 40),
    d = -12.6 + ((i * 2.37) % 25.2),
    size = 1.15 + (i % 3) * 0.15;
  const kind: NatureKind =
    i % 7 === 0 ? "willow" : i % 3 === 0 ? "spring" : "bare";
  const radius = (kind === "willow" ? 0.95 : 0.45) * size;
  if (roofClear({ s, d }, radius) && reserve({ s, d }, radius, kind))
    NATURE.push({ s, d, size, kind });
}
for (let i = 0; i < 100 && !NATURE.some((n) => n.kind === "rock"); i++) {
  const s = -20 + ((i * 0.93) % 40),
    d = shoreDepth("near", s) + 1.6;
  if (reserve({ s, d }, 0.2, "rock"))
    NATURE.push({ s, d, kind: "rock", size: 0.55 });
}
export const WANDER_RADIUS = 0.42;
export const RESIDENT_SPACE = 0.6;
export const STATIC_PEOPLE: PassagePoint[] = [];
for (let i = 0; i < 2400 && STATIC_PEOPLE.length < 50; i++) {
  const s = -20 + ((i * 0.731) % 40),
    side = i % 3 ? "near" : "far";
  const d =
    shoreDepth(side, s) + (side === "near" ? 1 : -1) * (1.65 + (i % 7) * 0.6);
  if (reserve({ s, d }, RESIDENT_SPACE, "person")) STATIC_PEOPLE.push({ s, d });
}

// Also use clear courtyards and inland gaps when waterfront browsing spaces fill.
for (let i = 0; i < 8000 && STATIC_PEOPLE.length < 50; i++) {
  const s = -20 + ((i * 0.731) % 40),
    d = -12.5 + ((i * 1.117) % 25);
  if (reserve({ s, d }, RESIDENT_SPACE, "person")) STATIC_PEOPLE.push({ s, d });
}

export function residentPose(index: number, time: number, seed = 0) {
  const home = STATIC_PEOPLE[index],
    p = wander(index + 100, time, WANDER_RADIUS, seed);
  return { ...p, s: home.s + p.s, d: home.d + p.d, y: GROUND_Y };
}
export function observerPose(index: number, time: number, seed = 0) {
  const home =
    -BRIDGE.length / 2 +
    0.4 +
    (Math.floor(index / 2) * (BRIDGE.length - 0.8)) /
      (BRIDGE_PEOPLE_PER_SIDE - 1);
  const p = wander(index + 200, time, 0.005, seed),
    x = home + p.s;
  return {
    ...p,
    ...bridgePoint(x, index % 2 ? 1.32 : -1.32),
    y: bridgeHeight(x),
    angle: BRIDGE.angle + (index % 2 ? Math.PI / 2 : -Math.PI / 2),
  };
}
