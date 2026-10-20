import * as THREE from "three";
import { SHORELINES } from "./passageLayout";
import { scrollPoint } from "./scrollLayout";

// The same analytic surface supports GPU water and CPU wake ribbons. Its
// crests stay below the low quays; no frame history is needed when seeking.
export const WATER_LEVEL = -0.045;
export function waterHeight(s: number, d: number, time: number) {
  return (
    WATER_LEVEL +
    Math.sin(s * 1.8 + d * 3.1 - time * 1.1) * 0.009 +
    Math.sin(s * 4.7 - d * 6.3 - time * 1.7) * 0.004 +
    Math.sin(s * 0.55 + d * 1.4 - time * 0.55) * 0.008
  );
}
export const riverShader = `
  vec2 riverPoint(vec3 p){return vec2(p.x*.64278761+p.z*.76604444,-p.x*.76604444+p.z*.64278761);}
  float waterHeight(vec2 p,float t){return -.045+sin(p.x*1.8+p.y*3.1-t*1.1)*.009
    +sin(p.x*4.7-p.y*6.3-t*1.7)*.004+sin(p.x*.55+p.y*1.4-t*.55)*.008;}
  ${(["far", "near"] as const)
    .map(
      (side) =>
        `float ${side}Shore(float s){float d=${SHORELINES[side][0].d.toFixed(4)};${SHORELINES[
          side
        ]
          .slice(1)
          .map(({ s, d }, i) => {
            const previous = SHORELINES[side][i];
            return `d=mix(d,${d.toFixed(4)},clamp((s-(${previous.s.toFixed(4)}))/${(s - previous.s).toFixed(4)},0.,1.));`;
          })
          .join("")}return d;}`,
    )
    .join("\n")}
  float shoreDistance(vec2 p){return max(farShore(p.x)-p.y,p.y-nearShore(p.x));}
`;

/** Tessellation makes the highlights follow a real, shallow 3D surface. */
export function riverGeometry() {
  const g = new THREE.PlaneGeometry(50, 34, 250, 170);
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const q = scrollPoint(p.getX(i), p.getZ(i));
    p.setXYZ(i, q.x, WATER_LEVEL, q.z);
  }
  g.computeVertexNormals();
  return g;
}
