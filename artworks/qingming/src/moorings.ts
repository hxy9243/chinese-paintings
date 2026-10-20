import { shoreDepth } from "./passageLayout";

// Small clusters beside the far-bank buildings, on either side of the bridge.
export const MOORED_BOATS = [
  { s: -17.2, length: 4.2, width: 0.82, cabin: true },
  { s: -11.8, length: 3.7, width: 0.75, cabin: false },
  { s: 1, length: 4.5, width: 0.9, cabin: true },
  { s: 6, length: 3.2, width: 0.68, cabin: false },
].map((boat) => {
  const angle = Math.atan2(
    shoreDepth("far", boat.s + boat.length / 2) -
      shoreDepth("far", boat.s - boat.length / 2),
    boat.length,
  );
  let d = -Infinity;
  // Include the complete oar/hull envelope and a margin for the gentle rocking.
  for (let i = 0; i <= 32; i++)
    for (const side of [-1, 1]) {
      const u = (i / 32 - 0.5) * boat.length * 1.24,
        v = side * (boat.width * 0.7 + 0.04);
      const s = boat.s + u * Math.cos(angle) - v * Math.sin(angle);
      d = Math.max(
        d,
        shoreDepth("far", s) - u * Math.sin(angle) - v * Math.cos(angle) + 0.12,
      );
    }
  return { ...boat, d, angle };
});
export function mooredBoatPose(index: number, time: number) {
  const boat = MOORED_BOATS[index],
    phase = time * 0.65 + index * 1.71;
  return {
    ...boat,
    y: Math.sin(phase) * 0.008,
    roll: Math.sin(phase + 0.8) * 0.003,
    pitch: Math.cos(phase * 0.8) * 0.002,
  };
}
export function mooringAnchor(index: number, side: number) {
  const b = MOORED_BOATS[index],
    u = side * b.length * 0.31;
  const s = b.s + u * Math.cos(b.angle) + b.width * 0.5 * Math.sin(b.angle);
  return { s, d: shoreDepth("far", s) + 0.035 };
}
