import { applyWestStreetLayout } from "./westStreetLayout";
import { TRACED_BUILDINGS, tracedGround } from "./paintingLayout";
// Coordinates in the reference crop's horizontal/depth basis. All terrain,
// architecture and pedestrian routes share this basis before world rotation.
export type BankSide = "far" | "near";
export type PassagePoint = { s: number; d: number };
export const GROUND_Y = 0.42; // about 0.93 m / three feet above the mean waterline
export const PERSON_SCALE = 1.25; // nominal adult height 0.85: bridge width ≈ 3.8 adult heights
export const PERSON_WIDTH_SCALE = 1.05; // retain the existing walking clearance
export const BRIDGE_RAIL_HEIGHT = 0.42;
export const MIN_EAVE_HEIGHT = 1.12;
export const TERRAIN_BOUNDS = {sMin:-61,sMax:41,dMin:-30,dMax:30} as const;
// Where the bridge crosses; the bank irregularity fades out under its abutments.
export const BRIDGE_SITE = { s: 9.1 };
// Traced composition: the west reach sweeps away through the top crop in a
// broad rounded bend, while the east reach continues beyond the right crop.
export const SHORELINES: Record<BankSide, PassagePoint[]> = {
  // East of the bend the painting keeps the far shops and their moored
  // freighters in frame, so this reach is narrower than the bridge crossing.
  far: [[-56,-60],[-27,-60],[-24.6,-30],[-22.2,-25],[-19.9,-20.5],[-17.9,-16.5],[-16.1,-12.8],
    [-14.5,-9.9],[-12.7,-7.7],[-10.5,-6.4],[-8,-5.9],
    [-3.7,-5.6],[3.8,-5.9],[7,-5.9],[12.5,-5.6],[17,-5.9],[21,-7.4],
    [23.5,-8.6],[29,-8.6],[36,-7.8]].map(([s,d])=>({s,d})),
  near: [[-56,-60],[-37,-60],[-34.6,-30],[-31.6,-24.5],[-29.5,-18.5],[-28.3,-12.5],[-27.5,-7.2],
    [-26.9,-4.0],[-26.2,-1.2],[-24.08,1.45],[-21.4,2.55],[-19.11,2.96],[-11.15,3.18],[-4.94,2.32],[0,3.4],[3.8,4.5],
    [6,4.3],[8.6,4.75],[11,5.4],[13.5,6.4],[16.7,7.06],[22.24,8.75],[27.78,10.44],[36.03,11.89]].map(([s,d])=>({s,d})),
};
// Natural banks are not drawn with a ruler: two incommensurate triangle waves
// add a broken zigzag to the traced curve. The water shader mirrors this.
export const SHORE_JITTER = { major: 0.17, majorRate: 0.83, minor: 0.085, minorRate: 2.11,
  swell: 0.37, phase: { near: 0, far: 1.7 }, calm: 3 } as const;
// The pattern runs along the bank's own length, so steep reaches of the bend
// zigzag as much as the gentle ones; the depth offset grows with the slope.
export function shoreJitter(side: BankSide, s: number) {
  const j = SHORE_JITTER, k = j.phase[side], l = shoreArc(side, s);
  const tri = (x: number) => 2 * Math.abs(x - 2 * Math.floor(x / 2) - 1) - 1;
  const calm = Math.min(1, Math.abs(s - BRIDGE_SITE.s) / j.calm);
  const stretch = Math.min(4, Math.hypot(1, baseShoreSlope(side, s)));
  return (j.major * tri(l * j.majorRate + k) + j.minor * tri(l * j.minorRate + 1.9 * k))
    * (0.55 + 0.45 * Math.sin(l * j.swell + k)) * calm * stretch;
}
// Monotone cubic tangents keep the traced bends smooth without overshooting
// the dry-land anchors. The water shader uses these same coefficients.
export const SHORE_TANGENTS=Object.fromEntries((['near','far'] as BankSide[]).map(side=>{
  const points=SHORELINES[side],secants=points.slice(1).map((p,i)=>(p.d-points[i].d)/(p.s-points[i].s));
  return [side,points.map((_,i)=>i===0?secants[0]:i===points.length-1?secants.at(-1)!:
    secants[i-1]*secants[i]<=0?0:2*secants[i-1]*secants[i]/(secants[i-1]+secants[i]))];
})) as Record<BankSide,number[]>;
/** The smooth traced curve, without the natural zigzag. */
export function baseShoreDepth(side: BankSide, s: number): number {
  const shore = SHORELINES[side];
  s = Math.max(TERRAIN_BOUNDS.sMin, Math.min(TERRAIN_BOUNDS.sMax, s));
  for (let i = 1; i < shore.length; i++) {
    const a = shore[i - 1],
      b = shore[i];
    if (s <= b.s) {
      const dx=b.s-a.s,t=(s-a.s)/dx,t2=t*t,t3=t2*t;
      return a.d+(-2*t3+3*t2)*(b.d-a.d)+(t3-2*t2+t)*dx*SHORE_TANGENTS[side][i-1]+(t3-t2)*dx*SHORE_TANGENTS[side][i];
    }
  }
  return shore.at(-1)!.d;
}
export function baseShoreSlope(side: BankSide, s: number) {
  return (baseShoreDepth(side, s + 0.01) - baseShoreDepth(side, s - 0.01)) / 0.02;
}
// Cumulative length along each traced bank, clipped to the terrain's depth.
const ARC_STEP = 0.05;
const ARC_TABLES = Object.fromEntries((["near", "far"] as BankSide[]).map((side) => {
  const table = [0];
  const clip = (s: number) => Math.max(TERRAIN_BOUNDS.dMin, Math.min(TERRAIN_BOUNDS.dMax, baseShoreDepth(side, s)));
  for (let s = TERRAIN_BOUNDS.sMin + ARC_STEP; s <= TERRAIN_BOUNDS.sMax + 1e-6; s += ARC_STEP)
    table.push(table.at(-1)! + Math.hypot(ARC_STEP, clip(s) - clip(s - ARC_STEP)));
  return [side, table];
})) as Record<BankSide, number[]>;
export function shoreArc(side: BankSide, s: number) {
  const table = ARC_TABLES[side],
    x = Math.max(0, Math.min(table.length - 1.000001, (s - TERRAIN_BOUNDS.sMin) / ARC_STEP)),
    i = Math.floor(x);
  return table[i] + (table[i + 1] - table[i]) * (x - i);
}
/** Inverse of shoreArc: the scroll position at a length along the bank. */
export function shoreAtArc(side: BankSide, l: number) {
  const table = ARC_TABLES[side];
  let lo = 0, hi = table.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (table[mid] < l) lo = mid; else hi = mid; }
  const f = table[hi] === table[lo] ? 0 : (l - table[lo]) / (table[hi] - table[lo]);
  return TERRAIN_BOUNDS.sMin + (lo + Math.max(0, Math.min(1, f))) * ARC_STEP;
}
export function shoreLength(side: BankSide) { return ARC_TABLES[side].at(-1)!; }
export function shoreDepth(side: BankSide, s: number): number {
  return baseShoreDepth(side, s) + shoreJitter(side, s);
}
// Crop boundaries are a rectangular continuation of the landscape, not an island.
export function bankOutline(side: BankSide): number[][] {
  const {sMin,sMax,dMin,dMax}=TERRAIN_BOUNDS;
  const edge=[{s:sMin,d:shoreDepth(side,sMin)},...SHORELINES[side],{s:sMax,d:shoreDepth(side,sMax)}]
    .map(({s,d})=>[s,Math.max(dMin,Math.min(dMax,d))]);
  const back=side==="far"?dMin:dMax;
  return [...edge,[sMax,back],[sMin,back]];
}
export function passageOutline(): number[][] {
  const {sMin,sMax,dMin,dMax}=TERRAIN_BOUNDS;
  return [[sMin,dMin],[sMax,dMin],[sMax,dMax],[sMin,dMax]];
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
  attachedTo?: number;
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
// Rectangular footprints are placed as rigid units. Angles follow the local
// bank street or a perpendicular lane; painted roof silhouettes are not polygons.
const nearHall=(s:number,d:number,width:number,depth:number,height=1.2,angle=0):HallLayout=>
  ({side:"near",s,d,width,depth,height,angle});
const farHall=(s:number,d:number,width:number,depth:number,height=1.2,angle=0):HallLayout=>
  ({side:"far",s,d,width,depth,height,angle});
export const HALLS: HallLayout[] = [
  farHall(-9.6,-9.9,3.8,3.5,1.5), farHall(-4.4,-9.9,5.4,3.5,1.5),
  farHall(1.3,-9.8,5.0,3.3,1.4), farHall(26,-12.4,5.4,3.5,1.5),
  farHall(32.3,-12.1,5.5,3.4,1.4), farHall(-9.6,-8.1,3.6,.9,1.2),
  farHall(-4.4,-8.1,5.1,.9,1.2),
  nearHall(-30.55,-2.5,3.7,5.5,1.5,1.15),
  // The painting's balcony restaurant backs onto the river, its gateway at the
  // right end; the open plaza then runs to the bridge foot.
  nearHall(-13.4,6.95,6.9,3.2,2.0),
  nearHall(12.8,8.55,3.0,2.2,1.3,.35), // tiled store at the water, right of the bridge foot
  nearHall(-29.5,14.3,8.0,5.8,1.6), nearHall(.6,5.6,2.3,1.6,1.35), // canopy stall by the water, not a house
  farHall(5.9,-8.8,2.6,2.4,1.3,.18), farHall(26,-10.5,5.0,.9,1.2),
  farHall(32.3,-10.2,5.2,.9,1.2), farHall(37.5,-10.8,3.1,3.4,1.35),
  nearHall(10.95,15.0,8,4.7,1.5,.59) /* gable end to the approach street */, nearHall(21.0,14.3,6.8,3.9,1.4,.15),
  farHall(15.3,-8.85,2.8,2.3,1.3,.18),
  nearHall(-43.3,14.1,8.0,6.3,1.5), nearHall(-22.3,21.9,7.3,4.9,1.45), // position from TRACED_BUILDINGS
  nearHall(-28.73,4.41,6.0,4.2,1.6) /* bend teahouse, a strip of bank behind it */, nearHall(-22.5,6.15,2.2,1.6,1.3,.05),
  nearHall(-31.5,-9.8,4.3,5.3,1.45,.98), nearHall(30.4,18.9,7.5,4.8,1.45,.15),
  nearHall(35.2,25.6,3.2,2.6,1.3,.15),
  nearHall(-5.4,6.5,3.4,3.0,1.6,-.4), // restaurant gateway with the festooned lattice, facing the plaza and bridge
  nearHall(-42.06,1.44,7.0,5.0,1.6),
  nearHall(-38.2,21.3,5.4,4.4,1.45),
  nearHall(-51.5,.6,6.8,4.8,1.5), nearHall(-55.0,14.0,6.0,5.8,1.5),
  nearHall(-33.85,-16.7,5.0,4.2,1.45,.98), nearHall(-30.8,21.5,5.5,4.4,1.4),
  nearHall(-50.7,-10.8,6.8,4.8,1.4), nearHall(-43.0,-16.5,8.3,4.6,1.4),
];
applyWestStreetLayout(HALLS);
for(const t of TRACED_BUILDINGS)Object.assign(HALLS[t.hall],tracedGround(t,GROUND_Y,HALLS[t.hall].height));
for(const [gallery,parent] of [[5,0],[6,1],[13,3],[14,4]])HALLS[gallery].attachedTo=parent;
HALLS.forEach(h=>{h.height=Math.max(h.height,MIN_EAVE_HEIGHT);});
export const REFERENCE_TREE={s:26.11,d:11.2,size:1.8,form:"spreading" as const};
// The painting draws the deck foreshortened along the scroll so the arch's
// side reads; taken literally that puts the far foot mid-river. In plan the
// bridge crosses nearly square to the river, landing on both dry banks.
const BRIDGE_PLAN_ANGLE=-86*Math.PI/180,BRIDGE_SPAN=14;
const near={s:8.6,d:6.0},far={s:near.s+BRIDGE_SPAN*Math.cos(BRIDGE_PLAN_ANGLE),d:near.d+BRIDGE_SPAN*Math.sin(BRIDGE_PLAN_ANGLE)};
export const BRIDGE={near,far,width:3.4,rise:2.1,
  length:Math.hypot(far.s-near.s,far.d-near.d),
  angle:Math.atan2(far.d-near.d,far.s-near.s),
  center:{s:(near.s+far.s)/2,d:(near.d+far.d)/2}};
// Signed position in the bridge frame. cross=0 is the centre of its deck;
// a vessel heading across the arch follows the cross axis, not the deck axis.
export function bridgeCoordinates(p:PassagePoint){
  const ds=p.s-BRIDGE.center.s,dd=p.d-BRIDGE.center.d;
  return {along:ds*Math.cos(BRIDGE.angle)+dd*Math.sin(BRIDGE.angle),
    cross:-ds*Math.sin(BRIDGE.angle)+dd*Math.cos(BRIDGE.angle)};
}
const APPROACH_TRANSITION=2;
export function streetAngle(x:number){
  const excess=Math.max(0,Math.abs(x)-BRIDGE.length/2);
  const desired=x<0?-Math.PI*.312:-Math.PI*.475;
  return BRIDGE.angle+(desired-BRIDGE.angle)*Math.min(1,excess/APPROACH_TRANSITION);
}
export function bridgePoint(x:number,lateral=0):PassagePoint{
  const sign=x<0?-1:1,half=BRIDGE.length/2;
  let s=BRIDGE.center.s+Math.max(-half,Math.min(half,x))*Math.cos(BRIDGE.angle);
  let d=BRIDGE.center.d+Math.max(-half,Math.min(half,x))*Math.sin(BRIDGE.angle);
  const excess=Math.max(0,Math.abs(x)-half),curve=Math.min(excess,APPROACH_TRANSITION);
  if(excess>0){
    const desired=x<0?-Math.PI*.312:-Math.PI*.475;
    const rate=(desired-BRIDGE.angle)/APPROACH_TRANSITION;
    s+=sign*(Math.sin(BRIDGE.angle+rate*curve)-Math.sin(BRIDGE.angle))/rate;
    d+=sign*(Math.cos(BRIDGE.angle)-Math.cos(BRIDGE.angle+rate*curve))/rate;
    if(excess>curve){s+=sign*(excess-curve)*Math.cos(desired);d+=sign*(excess-curve)*Math.sin(desired);}
  }
  const angle=streetAngle(x);
  return {s:s-lateral*Math.sin(angle),d:d+lateral*Math.cos(angle)};
}
// Looser browsing groups leave gaps between counters and river watchers.
export const BRIDGE_PEOPLE_PER_SIDE = 20;
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
// Half parabolic arch, half cosine: the crown keeps the arch's lift while the
// springings ease out, so no part of the stepped deck exceeds about 21°.
export function bridgeHeight(x: number): number {
  const u = Math.min(1, Math.abs((2 * x) / BRIDGE.length));
  return GROUND_Y + BRIDGE.rise * (0.5 * (1 - u * u) + 0.25 * (1 + Math.cos(Math.PI * u)));
}
export const BOATS = [
  {...BRIDGE.center,length:10.6,width:1.85,cabin:false,angle:BRIDGE.angle+Math.PI/2},
  {s:-17.86,d:-4.57,length:4.1,width:1.5,cabin:true,angle:.557},
  {s:-15.25,d:-7.71,length:2.31,width:1,cabin:false,angle:.717},
  {s:-3.5,d:-1,length:5.32,width:1.1,cabin:false,angle:-.38},
  {s:29.16,d:6.34,length:2.33,width:.8,cabin:false,angle:-.316},
];
