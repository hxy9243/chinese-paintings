// Layout traced from the painting. The three Chicago crops are stitched into
// one panorama by image correlation, then registered to the scene through the
// comparison camera: an orthographic view at the default 55° polar angle and
// zero yaw. A panorama pixel and a height above the ground define one plan
// point, so traced roofs land where the painting draws them from that view.
//
// The painting does not keep one projection. Its facades are taller and its
// ground more compressed than any single camera, so buildings are anchored by
// the centre of their painted roof mass rather than by hidden ground lines.
// Shorelines, the bridge and boats keep their physical corrections.

export const PANORAMA = {
  src: "reference/chicago-panorama.jpg",
  width: 3490,
  height: 609,
  // Placement of each supplied crop in panorama pixels (scale, then offset).
  crops: {
    crossroads: { src: "reference/chicago-crossroads.png", scale: 0.85, x: 0, y: 12 },
    bend: { src: "reference/chicago-river-bend.png", scale: 1, x: 472, y: 0 },
    bridge: { src: "reference/chicago-rainbow-bridge.png", scale: 1.13, x: 1176, y: 4 },
  },
} as const;

// Comparison camera. Mock3D's orbit target sits 1.1 above the world origin.
export const PANORAMA_CAMERA = {
  target: { s: -6.33, d: 4.87 },
  targetY: 1.1,
  polar: (55 * Math.PI) / 180,
  pixelsPerUnit: 44,
} as const;

const up = Math.sin(PANORAMA_CAMERA.polar),
  across = Math.cos(PANORAMA_CAMERA.polar);

/** Panorama pixel of a world point at plan (s, d) and absolute height y. */
export function planToPanorama(s: number, d: number, y: number) {
  const { target, targetY, pixelsPerUnit: k } = PANORAMA_CAMERA;
  return {
    x: PANORAMA.width / 2 + (s - target.s) * k,
    y: PANORAMA.height / 2 - (-(d - target.d) * across + (y - targetY) * up) * k,
  };
}

/** Plan point whose world point at absolute height y projects to (x, y). */
export function panoramaToPlan(x: number, py: number, y: number) {
  const { target, targetY, pixelsPerUnit: k } = PANORAMA_CAMERA;
  const screenUp = (PANORAMA.height / 2 - py) / k;
  return {
    s: target.s + (x - PANORAMA.width / 2) / k,
    d: target.d - (screenUp - (y - targetY) * up) / across,
  };
}

/** Crop pixel to panorama pixel. */
export function cropToPanorama(crop: keyof typeof PANORAMA.crops, x: number, y: number) {
  const c = PANORAMA.crops[crop];
  return { x: c.x + x * c.scale, y: c.y + y * c.scale };
}

// Height of a roof's visual centre above the eave, shared by the tracing and
// the regression check. Hip and gable roofs in the scene rise about 0.6–0.9.
export const ROOF_MASS_RISE = 0.35;

export interface TracedBuilding {
  hall: number;
  id: string;
  /** Centre of the painted roof mass, panorama pixels. */
  roof: [number, number];
}

// Roof centres read from the stitched panorama. Ids name what the painting
// shows; hall indices refer to HALLS in passageLayout.
export const TRACED_BUILDINGS: TracedBuilding[] = [
  { hall: 8, id: "two-storey-balcony-house", roof: [1365, 392] },
  { hall: 26, id: "inn-festooned-gatehouse", roof: [1740, 470] },
  // The inn's hall stands in front of its gatehouse, lower in the picture.
  { hall: 9, id: "inn-main-hall", roof: [1585, 560] },
  { hall: 20, id: "bend-foreground-joined-roofs", roof: [1110, 580] },
];

/** Ground centre that puts a hall's roof mass on its traced roof pixel. */
export function tracedGround(t: TracedBuilding, groundY: number, eave: number) {
  return panoramaToPlan(t.roof[0], t.roof[1], groundY + eave + ROOF_MASS_RISE);
}
