import * as THREE from "three";
import { paintMaterial, createDryInk } from "./paintMaterial";
import type { DetailLevel } from "../../../packages/scene-kit/lod";
import type { TreeForm } from "./referenceAssets";

// The supplied crossroads crop shows pollarded deciduous trees: scarred trunks,
// angular boughs, and long fans of fine shoots. Cached typed arrays eliminate
// redundant spline synthesis across scene initializations.
const bark = paintMaterial(0x827454),
  heart = paintMaterial(0x554b37);
const budColors = [0x666548, 0x8a8156].map((c) => paintMaterial(c));
const twigInk = createDryInk(0.72),
  scarInk = createDryInk(0.85);
type V = THREE.Vector3;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

type CachedTreeArrays = {
  wood: Float32Array;
  woodNormals: Float32Array;
  heartWood: Float32Array;
  heartNormals: Float32Array;
  twigs: Float32Array;
  scars: Float32Array;
  buds: [Float32Array, Float32Array];
  shootCount: number;
};

const treeCache = new Map<string, CachedTreeArrays>();
const unitIco = new THREE.IcosahedronGeometry(1, 0);
const unitIcoPos = unitIco.getAttribute("position").array as Float32Array;

function appendScaledIco(
  out: number[],
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  rotY: number,
) {
  const c = Math.cos(rotY),
    s = Math.sin(rotY);
  for (let i = 0; i < unitIcoPos.length; i += 3) {
    const lx = unitIcoPos[i] * sx,
      ly = unitIcoPos[i + 1] * sy,
      lz = unitIcoPos[i + 2] * sz;
    out.push(cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c);
  }
}

function computeTreeArrays(
  form: TreeForm,
  seed: number,
  detail: DetailLevel,
  landmark: boolean,
  budding: boolean,
): CachedTreeArrays {
  const key = `${form}:${seed.toFixed(4)}:${detail}:${landmark ? 1 : 0}:${budding ? 1 : 0}`;
  const hit = treeCache.get(key);
  if (hit) return hit;

  const old = form === "spreading" || form === "pollard",
    young = form === "sapling";
  const radius = landmark ? 0.28 : old ? 0.19 : 0.065,
    height = landmark ? 2.25 : old ? 1.95 : 1.7;
  const wood: number[] = [],
    heartWood: number[] = [],
    twigs: number[] = [],
    scars: number[] = [],
    buds: number[][] = [[], []];
  const hash = (n: number) => {
    const f = Math.sin(n * 78.233 + seed * 12.37) * 43758.5453;
    return f - Math.floor(f);
  };
  const quad = (a: V, b: V, c: V, d: V) =>
    wood.push(
      ...a.toArray(),
      ...b.toArray(),
      ...c.toArray(),
      ...a.toArray(),
      ...c.toArray(),
      ...d.toArray(),
    );
  const branch = (points: V[], r: number, end = 0.08) => {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const steps = r > 0.06 ? 10 : r > 0.015 ? 6 : 3;
    const sides = r > 0.06 ? 7 : 5;
    if (r >= 0.006) {
      let previous: V[] = [];
      for (let j = 0; j <= steps; j++) {
        const t = j / steps,
          p = curve.getPoint(t),
          tangent = curve.getTangent(t);
        const n = V(0, 0, 1).cross(tangent).normalize(),
          b = tangent.clone().cross(n);
        const rr = r * (end + (1 - end) * Math.pow(1 - t, 0.84));
        const ring = Array.from({ length: sides }, (_, i) => {
          const a = (i * Math.PI * 2) / sides,
            k = 1 + 0.16 * Math.sin(i * 4.2 + t * 19 + seed);
          return p
            .clone()
            .addScaledVector(n, Math.cos(a) * rr * k)
            .addScaledVector(b, Math.sin(a) * rr * k);
        });
        if (j)
          for (let i = 0; i < sides; i++)
            quad(
              previous[i],
              ring[i],
              ring[(i + 1) % sides],
              previous[(i + 1) % sides],
            );
        previous = ring;
      }
    }
    if (r < 0.018)
      for (let j = 0; j < steps; j++)
        twigs.push(
          ...curve.getPoint(j / steps).toArray(),
          ...curve.getPoint((j + 1) / steps).toArray(),
        );
    if (r > 0.04)
      for (let k = 0; k < (detail === 0 ? 3 : 6); k++)
        for (let j = 0; j < 10; j++) {
          for (const t of [j / 10, (j + 1) / 10]) {
            const p = curve.getPoint(t),
              a = k * 2.399 + Math.sin(t * 22 + k) * 0.17,
              rr = r * (end + (1 - end) * Math.pow(1 - t, 0.84)) * 1.18;
            p.x += Math.cos(a) * rr;
            p.z += Math.sin(a) * rr;
            scars.push(...p.toArray());
          }
        }
    return curve;
  };
  const trunk = branch(
    [
      V(0, 0, 0),
      V(-radius * 0.3, height * 0.15, 0.03),
      V(-radius * 0.8, height * 0.3, -0.02),
      V(radius * 0.25, height * 0.45, 0.035),
      V(-radius * 0.25, height * 0.61, -0.03),
      V(0.07, height * 0.81, 0.015),
      V(-0.03, height, 0),
    ],
    radius,
    0.23,
  );
  if (old) {
    for (let j = 0; j < 4; j++) {
      const a = j * 2.399 + seed;
      branch(
        [
          V(0, 0.26, 0),
          V(Math.cos(a) * radius, 0.075, Math.sin(a) * radius),
          V(Math.cos(a) * radius * 1.55, 0.005, Math.sin(a) * radius * 1.55),
        ],
        radius * 0.34,
        0.025,
      );
    }
    // Bake pollard scars and knots directly into vertex buffers instead of 23 child meshes
    for (let j = 0; j < (detail === 0 ? 6 : 16); j++) {
      const t = 0.14 + hash(j) * 0.67,
        c = trunk.getPoint(t),
        a = j * 2.399 + seed,
        r = radius * (0.23 + 0.77 * Math.pow(1 - t, 0.84));
      appendScaledIco(
        j % 3 === 0 ? heartWood : wood,
        c.x + Math.cos(a) * r * 0.88,
        c.y,
        c.z + Math.sin(a) * r * 0.88,
        0.035 + hash(j + 2) * 0.04,
        0.055 + hash(j + 4) * 0.075,
        0.026 + hash(j + 7) * 0.03,
        -a,
      );
    }
  }
  const heads = young ? 4 : old ? 7 : 5;
  let shootCount = 0;
  for (let j = 0; j < heads; j++) {
    const t = 0.27 + (j / (heads - 1)) * 0.57,
      base = trunk.getPoint(t),
      a = j * 2.399 + seed * 0.18;
    const reach = (old ? 1.12 : 0.55) * (1 - 0.38 * t),
      side = j % 2 ? 1 : -1;
    const head = V(
      Math.cos(a) * reach + side * 0.28,
      height * (0.55 + (j / (heads - 1)) * 0.5),
      Math.sin(a) * reach * 0.72,
    );
    const elbow = base.clone().lerp(head, 0.47);
    elbow.y -= old ? 0.12 : 0;
    branch(
      [base, elbow, head.clone().add(V(-side * 0.11, -0.12, 0.06)), head],
      radius * (old ? 0.51 : 0.35) * (1 - t * 0.4),
      0.24,
    );
    if (old) {
      appendScaledIco(wood, head.x, head.y, head.z, 0.072, 0.054, 0.06, 0);
    }
    const count = detail === 2 ? 13 : detail === 1 ? 10 : 7;
    for (let k = 0; k < count; k++) {
      const phase = a + (k / (count - 1) - 0.5) * 2.1;
      const spread = 0.38 + hash(j * 91 + k) * 1.05,
        up = 0.42 + hash(j * 71 + k + 8) * 0.88;
      const tip = head
        .clone()
        .add(V(Math.cos(phase) * spread, up, Math.sin(phase) * spread * 0.8));
      const mid = head
        .clone()
        .lerp(tip, 0.48)
        .add(V(side * 0.06, -0.09, 0.015));
      const shoot = branch(
        [head.clone().add(V(0.018 * (k % 3), 0, 0.014 * (k % 4))), mid, tip],
        young ? 0.008 : 0.012,
        0.018,
      );
      shootCount++;
      const forks = detail === 0 ? 2 : 4;
      for (let q = 0; q < forks; q++) {
        const u = 0.3 + q * 0.15,
          b = shoot.getPoint(u),
          sign = q % 2 ? 1 : -1;
        const direction = phase + sign * (0.4 + hash(k + q) * 0.45),
          length = 0.19 + hash(j * 21 + k * 5 + q) * 0.29;
        const end = b
          .clone()
          .add(
            V(
              Math.cos(direction) * length,
              0.15 + length * 0.55,
              Math.sin(direction) * length * 0.7,
            ),
          );
        const fork = branch(
          [b, b.clone().lerp(end, 0.5).add(V(0, -0.025, 0)), end],
          0.0042,
          0.015,
        );
        if (detail > 0)
          for (let n = 0; n < 3; n++) {
            const b2 = fork.getPoint(0.42 + n * 0.2),
              end2 = b2
                .clone()
                .add(
                  V(
                    Math.cos(direction + n * 0.7) * 0.1,
                    0.095,
                    Math.sin(direction + n * 0.7) * 0.07,
                  ),
                );
            branch([b2, end2], 0.002, 0.01);
          }
        if (budding && (k + q + j) % 4 === 0) {
          for (let leaf = 0; leaf < 2; leaf++) {
            const c = end.clone().add(V(leaf * 0.015, -leaf * 0.025, 0)),
              long = V(
                Math.cos(direction) * 0.035,
                0.045,
                Math.sin(direction) * 0.035,
              ),
              across = V(
                -Math.sin(direction) * 0.016,
                0,
                Math.cos(direction) * 0.016,
              );
            buds[(j + k) % 2].push(
              ...c.toArray(),
              ...c.clone().addScaledVector(long, 0.5).add(across).toArray(),
              ...c.clone().add(long).toArray(),
              ...c.toArray(),
              ...c.clone().add(long).toArray(),
              ...c.clone().addScaledVector(long, 0.5).sub(across).toArray(),
            );
          }
        }
      }
    }
  }

  const makeNormals = (positions: Float32Array) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.computeVertexNormals();
    const n = new Float32Array(
      (g.getAttribute("normal").array as Float32Array).slice(),
    );
    g.dispose();
    return n;
  };
  const woodArr = new Float32Array(wood);
  const heartArr = new Float32Array(heartWood);
  const result: CachedTreeArrays = {
    wood: woodArr,
    woodNormals: makeNormals(woodArr),
    heartWood: heartArr,
    heartNormals: heartArr.length ? makeNormals(heartArr) : new Float32Array(0),
    twigs: new Float32Array(twigs),
    scars: new Float32Array(scars),
    buds: [new Float32Array(buds[0]), new Float32Array(buds[1])],
    shootCount,
  };
  treeCache.set(key, result);
  return result;
}

export function buildScrollTree(
  form: TreeForm,
  seed: number,
  detail: DetailLevel = 2,
  landmark = false,
  budding = false,
) {
  const root = new THREE.Group();
  root.name = landmark
    ? "great-pollarded-riverbank-tree"
    : "reference-deciduous-tree";
  const cached = computeTreeArrays(form, seed, detail, landmark, budding);

  const body = new THREE.BufferGeometry();
  body.setAttribute(
    "position",
    new THREE.BufferAttribute(cached.wood.slice(), 3),
  );
  body.setAttribute(
    "normal",
    new THREE.BufferAttribute(cached.woodNormals.slice(), 3),
  );
  const mesh = new THREE.Mesh(body, bark);
  mesh.name = "gnarled-deciduous-branches";
  root.add(mesh);

  if (cached.heartWood.length) {
    const hGeo = new THREE.BufferGeometry();
    hGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(cached.heartWood.slice(), 3),
    );
    hGeo.setAttribute(
      "normal",
      new THREE.BufferAttribute(cached.heartNormals.slice(), 3),
    );
    root.add(new THREE.Mesh(hGeo, heart));
  }

  for (const [arr, material, name] of [
    [cached.twigs, twigInk, "fine-pollard-shoots"],
    [cached.scars, scarInk, "broken-bark-furrows"],
  ] as const) {
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute("position", new THREE.BufferAttribute(arr.slice(), 3));
    const lines = new THREE.LineSegments(lGeo, material);
    lines.name = name;
    root.add(lines);
  }

  cached.buds.forEach((arr, i) => {
    if (arr.length) {
      const bGeo = new THREE.BufferGeometry();
      bGeo.setAttribute("position", new THREE.BufferAttribute(arr.slice(), 3));
      bGeo.computeVertexNormals();
      const m = new THREE.Mesh(bGeo, budColors[i]);
      m.name = "sparse-broad-leaf-buds";
      root.add(m);
    }
  });
  root.userData = {
    treeForm: form,
    botanicalForm: "pollarded-deciduous",
    shootCount: cached.shootCount,
    budding,
  };
  return root;
}
