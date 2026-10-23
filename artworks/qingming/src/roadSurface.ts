import * as THREE from "three";
import {
  BRIDGE,
  SHORELINES,
  shoreDepth,
  bridgePoint,
  type BankSide,
} from "./passageLayout";

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
export const ROAD_TERMINI = [
  bridgePoint(-40),
  bridgePoint(40),
  ...(["near", "far"] as BankSide[]).flatMap((side) =>
    [SHORELINES[side][0], SHORELINES[side].at(-1)!].map((p) => ({
      s: p.s,
      d: p.d + (side === "near" ? 1 : -1) * 0.85,
    })),
  ),
];
export const ROAD_SEGMENTS = [
  ...STREET_ROAD_SEGMENTS,
  ...(["near", "far"] as BankSide[]).flatMap((side) => {
    const shore = SHORELINES[side],
      sign = side === "near" ? 1 : -1;
    return shore.slice(1).map((p, i) => ({
      a: { s: shore[i].s, d: shoreDepth(side, shore[i].s) + sign * 0.85 },
      b: { s: p.s, d: p.d + sign * 0.85 },
      width: 0.64,
    }));
  }),
];
export const roadUniforms = {
  roadSegments: {
    value: ROAD_SEGMENTS.map(
      (r) => new THREE.Vector4(r.a.s, r.a.d, r.b.s, r.b.d),
    ),
  },
  roadWidths: { value: ROAD_SEGMENTS.map((r) => r.width) },
};
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
  float ragged=(noise(vec3(p*7.,1.))-.5)*.18+(noise(vec3(p*31.,2.))-.5)*.035;
  return 1.-smoothstep(-.18,.16,signedDistance+ragged);
 }
`;
