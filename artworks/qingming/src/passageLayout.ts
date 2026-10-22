// Coordinates in the reference crop's horizontal/depth basis. All terrain,
// architecture and pedestrian routes share this basis before world rotation.
export type BankSide = "far" | "near";
export type PassagePoint = { s: number; d: number };
export const GROUND_Y = 0.42; // about 0.93 m / three feet above the mean waterline
export const PERSON_SCALE = 1.25; // nominal adult height 0.85: bridge width ≈ 3.8 adult heights
export const PERSON_WIDTH_SCALE = 1.05; // retain the existing walking clearance
export const BRIDGE_RAIL_HEIGHT = 0.42;
export const MIN_EAVE_HEIGHT = 1.12;
// Traced composition: the west reach turns through the top crop, while the
// east reach continues beyond the right crop. These are independent banks.
export const SHORELINES: Record<BankSide, PassagePoint[]> = {
  far: [[-30,-60],[-9,-60],[-8,-16],[-7,-10],[-5.8,-7],[-2,-6.6],
    [3,-6.4],[8,-6.2],[12,-5.8],[17,-5.4],[22,-4.9],[30,-4.4]].map(([s,d])=>({s,d})),
  near: [[-30,-60],[-20,-60],[-18.6,-14],[-18.3,-8],[-17.7,-4],
    [-16.5,-.4],[-14,1.8],[-10,2.7],[-5,2.8],[-1,2.7],[3,1.2],
    [5,-.4],[6,1],[7.4,3.2],[11,3.6],[15,4.3],[18,5.8],[22,6.5],[30,7]].map(([s,d])=>({s,d})),
};
// Monotone cubic tangents keep the traced bends smooth without overshooting
// the dry-land anchors. The water shader uses these same coefficients.
export const SHORE_TANGENTS=Object.fromEntries((['near','far'] as BankSide[]).map(side=>{
  const points=SHORELINES[side],secants=points.slice(1).map((p,i)=>(p.d-points[i].d)/(p.s-points[i].s));
  return [side,points.map((_,i)=>i===0?secants[0]:i===points.length-1?secants.at(-1)!:
    secants[i-1]*secants[i]<=0?0:2*secants[i-1]*secants[i]/(secants[i-1]+secants[i]))];
})) as Record<BankSide,number[]>;
export function shoreDepth(side: BankSide, s: number): number {
  const shore = SHORELINES[side];
  s = Math.max(-30, Math.min(30, s));
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
// Crop boundaries are a rectangular continuation of the landscape, not an island.
export function bankOutline(side: BankSide): number[][] {
  const edge=SHORELINES[side].map(({s,d})=>[s,d]);
  const back=side==="far"?-60:24;
  return [...edge,[30,back],[-30,back]];
}
export function passageOutline(): number[][] {
  return [[-30,-30],[30,-30],[30,24],[-30,24]];
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
// Rectangular footprints are placed as rigid units. Angles follow the local
// bank street or a perpendicular lane; painted roof silhouettes are not polygons.
const nearHall=(s:number,d:number,width:number,depth:number,height=1.2,angle=0):HallLayout=>
  ({side:"near",s,d,width,depth,height,angle});
const farHall=(s:number,d:number,width:number,depth:number,height=1.2,angle=0):HallLayout=>
  ({side:"far",s,d,width,depth,height,angle});
export const HALLS: HallLayout[] = [
  farHall(-4.4,-13.2,3.4,2.4), farHall(-.3,-13.2,3.5,2.4),
  farHall(3.7,-13.2,3.1,2.5), farHall(14.9,-12,2.7,2.7,1.3,.08),
  farHall(18.7,-11.3,3.0,2.7,1.2,.08), farHall(-3.5,-9.5,3.7,1.7),
  farHall(.9,-9.3,3.9,1.7),
  nearHall(-20.7,-3,2.7,3.2,1.2,1.15),
  nearHall(-8.8,5.8,4.1,2.7,1.35),
  nearHall(-3.2,10.6,4.3,2.8,1.25,Math.PI/2),
  nearHall(-13.8,10.8,4.5,2.7), nearHall(3.2,4.1,1.5,1.1),
  farHall(5,-9.1,2.8,1.8), farHall(14.35,-8.2,3.15,1.7,1.12,.08),
  farHall(18.2,-8.25,3.5,1.7,1.12,.08), farHall(21.7,-10.1,1.4,2),
  nearHall(12.6,7.2,4.2,2.6,1.2,.12), nearHall(18.2,10.1,4.6,2.8,1.2,.15),
  farHall(7,-13.8,.7,1.6,1.12,0),
  nearHall(-18.7,10.1,3.7,2.6,1.2,.05), nearHall(-9,11,3.8,2.7),
  nearHall(-17.5,3.5,3.3,2.3,1.2,.5), nearHall(-13.2,5.5,3.1,2.3,1.2,.05),
  nearHall(-21.1,4.9,2.6,2.5,1.2,1.15), nearHall(12.2,12.1,3.8,2.4,1.2,.12),
  nearHall(22,13,1.5,1.8,1.12,.15),
  nearHall(-2.8,5.8,2.2,1.7,2.8), // ornate street gate, not a worksite
];
HALLS[9].gable=true;
HALLS.forEach(h=>{h.height=Math.max(h.height,MIN_EAVE_HEIGHT);});
export const REFERENCE_TREE={s:21.8,d:8.2,size:1.45,form:"spreading" as const};
// Both full-width landings sit inland. Local x runs from near bank to far bank.
const near = { s: 7.8, d: 4.15 },
  far = { s: 10.1, d: -7.1 };
export const BRIDGE = {
  near,
  far,
  width: 3.2,
  rise: 2.35,
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
export function bridgeHeight(x: number): number {
  return (
    GROUND_Y + BRIDGE.rise * Math.max(0, 1 - ((2 * x) / BRIDGE.length) ** 2)
  );
}
export const BOATS = [
  { s:16,d:-.3,length:7.2,width:1.2,cabin:true,angle:0 },
  { s:9,d:-2,length:5.4,width:1.1,cabin:false,angle:0 },
  { s:-13,d:-10,length:5.1,width:1,cabin:true,angle:Math.PI/2 },
  { s:1,d:-1.5,length:4.9,width:1,cabin:false,angle:0 },
  { s:-12,d:-4,length:3.5,width:.75,cabin:false,angle:Math.PI/3 },
  { s:25,d:0,length:3.8,width:.8,cabin:true,angle:0 },
  { s:-13,d:-22,length:4.2,width:.8,cabin:false,angle:Math.PI/2 },
];
