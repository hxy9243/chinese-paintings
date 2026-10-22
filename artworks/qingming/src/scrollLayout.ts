import * as THREE from "three";
export const SCROLL_HALF_LENGTH = 47;
export const SCROLL_HALF_DEPTH = 14;
export const REFERENCE_AZIMUTH = THREE.MathUtils.degToRad(-50);
export const SCROLL_STOPS = [
  { id: "crossroads", s: -33, depth: 2, en: "Western crossroads", zh: "西街十字路口" },
  { id: "bridge", s: 9, depth: -2, en: "Bridge approach", zh: "虹桥市集" },
  { id: "bank", s: 0, depth: -8, en: "Far-bank shops", zh: "对岸屋舍" },
  { id: "bend", s: -13, depth: -5, en: "River bend", zh: "河湾舟楫" },
] as const;
export function scrollPoint(s: number, depth = 0) {
  return new THREE.Vector3(
    Math.cos(REFERENCE_AZIMUTH) * s + Math.sin(REFERENCE_AZIMUTH) * depth,
    0,
    -Math.sin(REFERENCE_AZIMUTH) * s + Math.cos(REFERENCE_AZIMUTH) * depth,
  );
}
