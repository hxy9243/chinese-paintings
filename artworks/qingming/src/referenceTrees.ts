import * as THREE from "three";
import { paintMaterial, createDryInk } from "./paintMaterial";
import type { DetailLevel } from "../../../packages/scene-kit/lod";
import type { TreeForm } from "./referenceAssets";

// Follow the supplied painting's knotted trunks and fine, upward sweeping fans.
// Individual pointed marks and branching sprays stay three dimensional; no
// billboard or opaque foliage ball substitutes for the drawn crown.
const bark = paintMaterial(0x6b6048), knotBark = paintMaterial(0x625740);
const leaves = [0x626047, 0x77704c].map(c => paintMaterial(c));
const twigInk = createDryInk(.88), scarInk = createDryInk(.75);
type V = THREE.Vector3;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildScrollTree(form: TreeForm, seed: number, detail: DetailLevel = 2, landmark = false, budding = false) {
  const root = new THREE.Group();
  root.name = landmark ? "great-pollarded-riverbank-tree" : "reference-deciduous-tree";
  const old = form === "spreading" || form === "pollard", young = form === "sapling";
  const radius = landmark ? .28 : old ? .19 : .065;
  const height = landmark ? 2.25 : old ? 1.95 : 1.7;
  const wood: number[] = [], twigs: number[] = [], scars: number[] = [], foliage: number[][] = [[], []];
  const hash = (n: number) => { const f = Math.sin(n * 78.233 + seed * 12.37) * 43758.5453; return f - Math.floor(f); };
  const triangle = (out: number[], a: V, b: V, c: V) => out.push(...a.toArray(), ...b.toArray(), ...c.toArray());
  const line = (out: number[], a: V, b: V) => out.push(...a.toArray(), ...b.toArray());
  const frame = (tangent: V) => {
    const reference = Math.abs(tangent.z) > .95 ? V(0, 1, 0) : V(0, 0, 1);
    const n = reference.cross(tangent).normalize();
    return [n, tangent.clone().cross(n).normalize()];
  };
  function branch(points: V[], r: number, end = .08) {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const steps = r > .06 ? (detail === 0 ? 9 : 15) : r > .015 ? 7 : 5;
    const sides = r > .06 ? (detail === 0 ? 7 : 10) : 5;
    if (r >= .007) {
      let previous: V[] = [];
      for (let j = 0; j <= steps; j++) {
        const t = j / steps, p = curve.getPoint(t), [n, b] = frame(curve.getTangent(t));
        const rr = r * (end + (1 - end) * Math.pow(1 - t, .82));
        const ring = Array.from({ length: sides }, (_, i) => {
          const a = i * Math.PI * 2 / sides;
          // Longitudinal irregularity produces old bark, without giant plates.
          const k = 1 + .13 * Math.sin(i * 2.7 + seed) + .065 * Math.sin(t * 17 + i * 1.9);
          return p.clone().addScaledVector(n, Math.cos(a) * rr * k).addScaledVector(b, Math.sin(a) * rr * k);
        });
        if (j) for (let i = 0; i < sides; i++) {
          const next = (i + 1) % sides;
          triangle(wood, previous[i], ring[i], ring[next]);
          triangle(wood, previous[i], ring[next], previous[next]);
        }
        previous = ring;
      }
    }
    if (r < .022) for (let j = 0; j < steps; j++) line(twigs, curve.getPoint(j / steps), curve.getPoint((j + 1) / steps));
    if (r > .035) {
      const furrows = detail === 0 ? 5 : detail === 1 ? 8 : 12;
      for (let k = 0; k < furrows; k++) for (let j = 0; j < 18; j++) {
        if ((j + k * 3) % 7 === 0) continue;
        const endpoints = [j / 18, (j + .8) / 18].map(t => {
          const p = curve.getPoint(t), [n, b] = frame(curve.getTangent(t));
          const a = k * 2.399 + Math.sin(t * 21 + k) * .12;
          const rr = r * (end + (1 - end) * Math.pow(1 - t, .82)) * 1.095;
          return p.addScaledVector(n, Math.cos(a) * rr).addScaledVector(b, Math.sin(a) * rr);
        });
        line(scars, endpoints[0], endpoints[1]);
      }
    }
    return curve;
  }
  const lean = (hash(3) - .5) * .28;
  const trunk = branch([
    V(0, 0, 0), V(-radius * .2, height * .14, .025),
    V(-radius * .7, height * .31, -.025), V(radius * .18 + lean * .3, height * .47, .04),
    V(-radius * .21 + lean * .6, height * .64, -.03), V(lean + .09, height * .83, .02),
    V(lean - .06, height, -.015),
  ], radius, old ? .26 : .09);
  if (old) {
    for (let j = 0; j < 5; j++) {
      const a = j * 2.399 + seed;
      branch([V(0, .25, 0), V(Math.cos(a) * radius * .7, .10, Math.sin(a) * radius * .7),
        V(Math.cos(a) * radius * 1.45, .008, Math.sin(a) * radius * 1.45)], radius * .30, .025);
    }
    // Small burls sit within the trunk silhouette, with short curved scar rings.
    for (let j = 0; j < (detail === 0 ? 6 : 15); j++) {
      const t = .12 + hash(j + 19) * .72, c = trunk.getPoint(t), tangent = trunk.getTangent(t), [n, b] = frame(tangent);
      const a = j * 2.399 + seed, r = radius * (.26 + .74 * Math.pow(1 - t, .82));
      const normal = n.clone().multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a));
      const knot = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), j % 4 === 0 ? knotBark : bark);
      knot.position.copy(c).addScaledVector(normal, r * .89);
      knot.scale.set(.024 + hash(j + 2) * .024, .047 + hash(j + 4) * .04, .018 + hash(j + 7) * .018);
      knot.quaternion.setFromUnitVectors(V(0, 0, 1), normal); knot.name = "small-aged-trunk-burl"; root.add(knot);
      if (detail > 0) for (let q = 0; q < 10; q++) {
        const ringPoint = (angle: number) => knot.position.clone().addScaledVector(n, Math.cos(angle) * .035).addScaledVector(tangent, Math.sin(angle) * .072).addScaledVector(normal, .012);
        line(scars, ringPoint(q * .52), ringPoint((q + 1) * .52));
      }
    }
  }
  const heads = young ? 4 : old ? 7 : 5;
  let shootCount = 0, leafCount = 0;
  for (let j = 0; j < heads; j++) {
    const t = .27 + j / (heads - 1) * .56, base = trunk.getPoint(t), a = j * 2.399 + seed * .18;
    const reach = (old ? 1.10 : .54) * (1 - .34 * t), side = j % 2 ? 1 : -1;
    const head = V(Math.cos(a) * reach + side * .17 + lean * .5, height * (.49 + j / (heads - 1) * .53), Math.sin(a) * reach * .73);
    const elbow = base.clone().lerp(head, .46); elbow.y -= old ? .12 : .015;
    branch([base, elbow, head.clone().add(V(-side * .09, -.11, .035)), head], radius * (old ? .53 : .34) * (1 - t * .38), .23);
    if (old) {
      // The pollarded head swells gently instead of ending in a spike.
      const knob = new THREE.Mesh(new THREE.IcosahedronGeometry(.052, 1), bark);
      knob.position.copy(head); knob.scale.set(1.25, .9, .9); knob.name = "pollard-head"; root.add(knob);
    }
    // The painting draws many hairline shoots from each old branch head.
    // Interleave these continuous curved rays with the stronger leafy twigs;
    // this fills each upward fan without producing a fern or antler silhouette.
    for (let ray = 0; ray < 15; ray++) {
      const u = ray / 14, direction = a + (u - .5) * 2.05;
      const fullness = Math.sin(Math.PI * u), spread = .40 + fullness * .63 + hash(j * 173 + ray) * .23;
      const rise = .43 + fullness * .68 + hash(j * 97 + ray) * .27;
      const tip = head.clone().add(V(Math.cos(direction) * spread, rise, Math.sin(direction) * spread * .85));
      const rayCurve = branch([head.clone(), head.clone().lerp(tip, .45).add(V(0, -.085, .012)), tip], .0016, .01);
      for (let n = 0; n < (detail === 0 ? 1 : 3); n++) {
        const p = rayCurve.getPoint(.60 + n * .11), tangent = rayCurve.getTangent(.60 + n * .11);
        const [across] = frame(tangent), sign = (ray + n) % 2 ? 1 : -1;
        line(twigs, p, p.clone().addScaledVector(tangent, .055).addScaledVector(across, sign * .025));
      }
    }
    // Keep these structural fans at every LOD (29 in a mature tree).
    const primaryCount = 4 + (j === heads - 1 ? 1 : 0);
    for (let k = 0; k < primaryCount; k++) {
      const phase = a + (k / (primaryCount - 1) - .5) * 1.9;
      const spread = .45 + hash(j * 91 + k + 11) * .85, up = .60 + hash(j * 71 + k + 8) * .62;
      const tip = head.clone().add(V(Math.cos(phase) * spread, up, Math.sin(phase) * spread * .85));
      const shoot = branch([head.clone(), head.clone().lerp(tip, .44).add(V(side * .045, -.12, .02)), tip], young ? .009 : .014, .012);
      shootCount++;
      const forks = detail === 0 ? 7 : detail === 1 ? 9 : 11;
      for (let q = 0; q < forks; q++) {
        const u = .18 + q / (forks - 1) * .75, b = shoot.getPoint(u), sign = q % 2 ? 1 : -1;
        const direction = phase + sign * (.32 + hash(j * 19 + k * 7 + q) * .61);
        const length = (.21 + hash(j * 21 + k * 5 + q) * .28) * (1 - .38 * u);
        const end = b.clone().add(V(Math.cos(direction) * length, .13 + length * .72, Math.sin(direction) * length * .78));
        const fork = branch([b, b.clone().lerp(end, .48).add(V(0, -.032, 0)), end], .0035, .01);
        const leafSites = detail === 0 ? 2 : detail === 1 ? 3 : 4;
        for (let n = 0; n < leafSites; n++) {
          const f = .36 + n / leafSites * .58, c = fork.getPoint(f);
          const tangent = fork.getTangent(f), [across, depth] = frame(tangent);
          // Slender split strokes read like the reference's pointed sprays.
          // Their planes rotate around the twig, preserving volume on orbit.
          for (const side of [-1, 1]) {
            const angle = hash(j * 117 + k * 41 + q * 7 + n) * Math.PI;
            const outward = across.clone().multiplyScalar(Math.cos(angle)).addScaledVector(depth, Math.sin(angle));
            const long = tangent.clone().multiplyScalar(.032 + hash(q * 3 + n + seed) * .035).addScaledVector(outward, side * (.032 + hash(q + n * 5) * .028));
            const endLeaf = c.clone().add(long), middle = c.clone().addScaledVector(long, .48);
            const width = .0035 + (budding ? .002 : 0), lateral = tangent.clone().cross(long).normalize().multiplyScalar(width);
            triangle(foliage[(j + k + q) % 2], c, middle.clone().add(lateral), endLeaf);
            triangle(foliage[(j + k + q) % 2], c, endLeaf, middle.clone().sub(lateral));
            line(twigs, c, endLeaf); leafCount++;
          }
          if (detail > 0 && n % 2 === 0) {
            const endTwig = c.clone().addScaledVector(tangent, .09).addScaledVector(across, (n % 3 ? 1 : -1) * .055);
            branch([c, c.clone().lerp(endTwig, .5), endTwig], .0018, .01);
          }
        }
      }
    }
  }
  function geometry(positions: number[]) {
    return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  }
  if (wood.length >= 9) {
    const body = geometry(wood); body.computeVertexNormals(); const mesh = new THREE.Mesh(body, bark);
    mesh.name = "gnarled-deciduous-branches"; root.add(mesh);
  }
  for (const [positions, material, name] of [[twigs, twigInk, "fine-pollard-shoots"], [scars, scarInk, "broken-bark-furrows"]] as const) {
    if (positions.length < 6) continue;
    const lines = new THREE.LineSegments(geometry(positions), material); lines.name = name; root.add(lines);
  }
  foliage.forEach((positions, i) => {
    if (positions.length < 9) return;
    const g = geometry(positions); g.computeVertexNormals(); const m = new THREE.Mesh(g, leaves[i]);
    m.name = "pointed-fan-leaf-strokes"; root.add(m);
  });
  root.userData = { treeForm: form, botanicalForm: "reference-fan-shoots", shootCount, leafCount, budding };
  return root;
}
