import { bridgePoint } from "../../src/passageLayout";
const nodes = Array.from({ length: 801 }, (_, i) => ({
  q: -40 + i * 0.1,
  ...bridgePoint(-40 + i * 0.1),
}));
export function streetCoordinates(p: { s: number; d: number }) {
  let distance = Infinity,
    u = 0,
    v = 0;
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1],
      b = nodes[i],
      ds = b.s - a.s,
      dd = b.d - a.d,
      l2 = ds * ds + dd * dd;
    const t = Math.max(
      0,
      Math.min(1, ((p.s - a.s) * ds + (p.d - a.d) * dd) / l2),
    );
    const s = a.s + ds * t,
      d = a.d + dd * t,
      dist = Math.hypot(p.s - s, p.d - d);
    if (dist < distance) {
      distance = dist;
      u = a.q + (b.q - a.q) * t;
      v = ((p.d - d) * ds - (p.s - s) * dd) / Math.sqrt(l2);
    }
  }
  return { u, v, distance };
}
