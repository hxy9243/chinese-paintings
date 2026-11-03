import * as THREE from "three";
import {
  BRIDGE,
  TERRAIN_BOUNDS,
  bridgePoint,
  type BankSide,
  type PassagePoint,
} from "./passageLayout";
import { bankCenter } from "./passageSpace";

// The main street is bounded by opposing shop rows, opens at the cart crossing,
// then continues between foreground roof groups to the lower crop boundary.
export const CROSSROADS_ROUTES = [
  // East of the bend the shop street passes in front of the riverside restaurant and its gateway.
  [[-60,6.5],[-37.0,6.5],[-34.0,7.25],[-32.8,7.75],[-24.6,7.75],[-20,7.75],[-17.6,10.0],[-12,10.5],[-6,11.1],[-3.4,13.6],[2.4,15.4],[3.6,14.4]],
  [[-37.7,-30],[-37.7,-12],[-37.5,-6],[-36.7,4.7],[-37.4,9],[-37.8,18],[-38,30]],
];

const half = BRIDGE.length / 2;
const routeKnots = [
  -40,
  ...Array.from({ length: 9 }, (_, i) => -half - 2 + i * 0.25),
  half,
  ...Array.from({ length: 8 }, (_, i) => half + (i + 1) * 0.25),
  40,
];
export const STREET_ROAD_SEGMENTS = routeKnots
  .slice(1)
  .map((q, i) => ({
    a: bridgePoint(routeKnots[i]),
    b: bridgePoint(q),
    width: routeKnots[i] >= half + 2 ? 1.1 : 1.85,
  }));

// Bank lanes share the walkers' set-back centre line, simplified to a few
// chords. Runs end where the lane leaves the painted terrain.
export const BANK_LANE_HALF_WIDTH = 0.42;
function simplify(points: PassagePoint[], tolerance: number): PassagePoint[] {
  if (points.length < 3) return points;
  const a = points[0],
    b = points.at(-1)!,
    ds = b.s - a.s,
    dd = b.d - a.d,
    length = Math.hypot(ds, dd) || 1;
  let worst = 0,
    index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const e = Math.abs((points[i].s - a.s) * dd - (points[i].d - a.d) * ds) / length;
    if (e > worst) (worst = e), (index = i);
  }
  if (worst <= tolerance) return [a, b];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}
export const BANK_LANE_RUNS: PassagePoint[][] = (
  ["near", "far"] as BankSide[]
).flatMap((side) => {
  const runs: PassagePoint[][] = [];
  let run: PassagePoint[] = [];
  const { sMin, sMax, dMin, dMax } = TERRAIN_BOUNDS;
  for (let s = sMin; s <= sMax + 1e-6; s += 0.05) {
    const p = { s, d: bankCenter(side, s) };
    if (p.d > dMin - 0.5 && p.d < dMax + 0.5) run.push(p);
    else if (run.length) runs.push(run), (run = []);
  }
  if (run.length) runs.push(run);
  return runs.filter((r) => r.length > 1).map((r) => simplify(r, 0.05));
});
export const ROAD_TERMINI = [
  bridgePoint(-40),
  bridgePoint(40),
  ...BANK_LANE_RUNS.flatMap((run) => [run[0], run.at(-1)!]),
  ...CROSSROADS_ROUTES.flatMap((route) =>
    [route[0], route.at(-1)!].map(([s, d]) => ({ s, d })),
  ),
];
export const ROAD_SEGMENTS = [
  ...STREET_ROAD_SEGMENTS,
  ...BANK_LANE_RUNS.flatMap((run) =>
    run.slice(1).map((b, i) => ({ a: run[i], b, width: BANK_LANE_HALF_WIDTH })),
  ),
  ...CROSSROADS_ROUTES.flatMap((route, r) =>
    route.slice(1).map(([s, d], i) => ({
      a: { s: route[i][0], d: route[i][1] },
      b: { s, d },
      width: r === 0 ? 0.95 : 1.15,
    })),
  ),
];
export const roadUniforms = {
  roadSegments: {
    value: ROAD_SEGMENTS.map(
      (r) => new THREE.Vector4(r.a.s, r.a.d, r.b.s, r.b.d),
    ),
  },
  roadWidths: { value: ROAD_SEGMENTS.map((r) => r.width) },
};
// Trodden earth in the painting is barely set apart from the ground: a soft,
// slightly paler wash whose edge wanders and feathers out over about a unit,
// with patchy wear along its length rather than a uniform band.
export const roadShader = `
 uniform vec4 roadSegments[${ROAD_SEGMENTS.length}];
 uniform float roadWidths[${ROAD_SEGMENTS.length}];
 float wornRoad(vec2 p){
  float signedDistance=100.;
  for(int i=0;i<${ROAD_SEGMENTS.length};i++){
   vec2 a=roadSegments[i].xy,b=roadSegments[i].zw,delta=b-a;
   float t=clamp(dot(p-a,delta)/dot(delta,delta),0.,1.);
   signedDistance=min(signedDistance,length(p-a-delta*t)-roadWidths[i]);
  }
  if(signedDistance>1.4)return 0.;
  float drift=(noise(vec3(p*.45,1.))-.5)*.75+(noise(vec3(p*1.9,2.))-.5)*.32+(noise(vec3(p*7.,3.))-.5)*.09;
  float body=1.-smoothstep(-.55,.75,signedDistance+drift);
  float wear=.55+.45*smoothstep(.2,.8,noise(vec3(p*.8,7.)));
  float scuff=.85+.15*noise(vec3(p*4.3,11.));
  return body*wear*scuff;
 }
`;
