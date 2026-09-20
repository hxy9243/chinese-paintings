import * as THREE from "three";
export const SCROLL_HALF_LENGTH = 62;
export const SCROLL_HALF_DEPTH = 8;
export const REFERENCE_AZIMUTH = THREE.MathUtils.degToRad(-50);
export const SCROLL_STOPS = [
  { id: "city", s: -49, en: "City streets", zh: "城内街巷" },
  { id: "gate", s: -27, en: "City gate", zh: "城门市集" },
  { id: "bridge", s: 0, en: "Rainbow Bridge", zh: "虹桥" },
  { id: "wharves", s: 24, en: "River wharves", zh: "汴河码头" },
  { id: "country", s: 49, en: "Country road", zh: "郊野行旅" },
] as const;
export function scrollPoint(s: number, depth = 0) {
  return new THREE.Vector3(
    Math.cos(REFERENCE_AZIMUTH) * s + Math.sin(REFERENCE_AZIMUTH) * depth,
    0,
    -Math.sin(REFERENCE_AZIMUTH) * s + Math.cos(REFERENCE_AZIMUTH) * depth,
  );
}
