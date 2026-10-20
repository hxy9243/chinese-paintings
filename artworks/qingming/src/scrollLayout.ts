import * as THREE from "three";
export const SCROLL_HALF_LENGTH = 22;
export const SCROLL_HALF_DEPTH = 14;
export const REFERENCE_AZIMUTH = THREE.MathUtils.degToRad(-50);
export const SCROLL_STOPS = [
  { id: "bridge", s: -6, depth: -3, en: "Bridge approach", zh: "虹桥市集" },
  { id: "bank", s: 0, depth: -7, en: "Far-bank shops", zh: "对岸屋舍" },
  { id: "bend", s: 12, depth: 1, en: "River bend", zh: "河湾舟楫" },
] as const;
export function scrollPoint(s: number, depth = 0) {
  return new THREE.Vector3(
    Math.cos(REFERENCE_AZIMUTH) * s + Math.sin(REFERENCE_AZIMUTH) * depth,
    0,
    -Math.sin(REFERENCE_AZIMUTH) * s + Math.cos(REFERENCE_AZIMUTH) * depth,
  );
}
