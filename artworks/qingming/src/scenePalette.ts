import * as THREE from "three";
export type ScenePalette = "silk" | "indigo-amber";
export const paletteAmount = { value: 0 };
export const paletteInk = {
  value: new THREE.Color().setRGB(0.095, 0.077, 0.05),
};
export const palettePaper = { value: new THREE.Vector3(0.78, 0.68, 0.46) };
export const PALETTES = {
  silk: { paper: 0xeee5cb, road: 0x927a52 },
  "indigo-amber": { paper: 0xf5eee3, road: 0x9b855f },
};
let current: ScenePalette = "silk";
export function getScenePalette() {
  return current;
}
export function setScenePalette(value: ScenePalette) {
  current = value;
  paletteAmount.value = value === "indigo-amber" ? 1 : 0;
  if (value === "silk") {
    paletteInk.value.setRGB(0.095, 0.077, 0.05);
    palettePaper.value.set(0.78, 0.68, 0.46);
  } else {
    paletteInk.value.set(0x203349);
    const c = new THREE.Color(0xf5eee3);
    palettePaper.value.set(c.r, c.g, c.b);
  }
}
// The named concept study's pigments, assigned to existing material families.
// No screen-wide tint: roofs, water, timber, plaster and clothing stay distinct.
const indigo: Record<number, number> = {
  0x786746: 0x515c7b,
  0x8b7854: 0x647391,
  0xcfbd8e: 0x5d999d,
  0xb09a6d: 0xc0b997,
  0x9f814f: 0xcea15b,
  0x917344: 0xb88d51,
  0xb29b6b: 0xd2aa69,
  0x514a3b: 0x455064,
  0x5e513a: 0x576174,
  0x655b45: 0x464e60,
  0xc8b486: 0xf0d6af,
  0xc7b991: 0xf2e6ce,
  0x858167: 0x9aa287,
  0xa49e7e: 0xa4b5aa,
  0xb4a178: 0xdcc69e,
  0x9f895f: 0xc39457,
  0x625943: 0x4b5160,
  0xc8bb94: 0xcb7561,
  0xb8ad8c: 0xd7e4df,
  0x918866: 0xa79161,
  0x8d8e80: 0xcb7561,
  0xbfa17e: 0xd2ab86,
  0xcab28c: 0xe0bd97,
  0x49443a: 0x303443,
  0xc6b992: 0xf1dfbc,
  0x485554: 0x486e93,
  0x716053: 0xcb7561,
  0x65705c: 0x788f7e,
  0x5b5548: 0x424854,
  0xa08a5c: 0xbe995d,
  0xb09b70: 0xc4a26a,
};
export function indigoPigment(color: number) {
  return indigo[color] ?? color;
}
