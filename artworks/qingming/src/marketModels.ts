import * as THREE from "three";
import { paintMaterial, createDryInk } from "./paintMaterial";
import { BRIDGE_SHOPS } from "./passageLayout";
const timber = paintMaterial(0x9f895f),
  inkWood = paintMaterial(0x625943),
  linen = paintMaterial(0xcfbf98),
  ceramic = paintMaterial(0xb8ad8c),
  food = paintMaterial(0x918866),
  cloth = paintMaterial(0x8d8e80),
  fishGlaze = paintMaterial(0x77958a),
  produce = paintMaterial(0x789353);
// Varied dyed cloths and glazes, shared across batches instead of one red canopy.
const fabrics = [
  0x9d8164, 0xb2a07a, 0x87917c, 0x8c938a, 0xb4a37f, 0x927e6d,
].map((c) => paintMaterial(c));
const ink = createDryInk(0.55);
type P = [number, number, number];
function put(
  p: THREE.Object3D,
  geo: THREE.BufferGeometry,
  m: THREE.Material,
  at: P = [0, 0, 0],
) {
  const a = new THREE.Mesh(geo, m);
  a.position.set(...at);
  p.add(a);
  return a;
}
function box(p: THREE.Object3D, size: P, at: P, m = timber) {
  return put(p, new THREE.BoxGeometry(...size), m, at);
}
function rod(p: THREE.Object3D, a: P, b: P, r = 0.012, m = timber) {
  const from = new THREE.Vector3(...a),
    to = new THREE.Vector3(...b),
    v = to.clone().sub(from);
  const o = put(
    p,
    new THREE.CylinderGeometry(r * 0.8, r, v.length(), 6),
    m,
    from.clone().add(to).multiplyScalar(0.5).toArray() as P,
  );
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return o;
}
function mark(p: THREE.Object3D, points: P[]) {
  p.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(...p)),
      ),
      ink,
    ),
  );
}
export const MARKET_TYPES = [
  "tea-and-bowls",
  "woven-baskets",
  "food-and-skewers",
  "cloth-and-scrolls",
  "grain-and-jars",
  "fishmonger",
] as const;
export function wovenBasket(
  p: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r = 0.12,
  h = 0.19,
) {
  put(p, new THREE.CylinderGeometry(r, r * 0.73, h, 12, 1, true), linen, [
    x,
    y,
    z,
  ]);
  for (let i = 0; i < 7; i++) {
    const ring = put(
      p,
      new THREE.TorusGeometry(r * (0.73 + (0.27 * i) / 6), 0.0035, 3, 20),
      inkWood,
      [x, y - h / 2 + (i * h) / 6, z],
    );
    ring.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    mark(p, [
      [x + Math.cos(a) * r * 0.73, y - h / 2, z + Math.sin(a) * r * 0.73],
      [x + Math.cos(a) * r, y + h / 2, z + Math.sin(a) * r],
    ]);
  }
  const points = Array.from(
    { length: 13 },
    (_, i) =>
      [
        x + Math.cos((i / 12) * Math.PI) * r,
        y + h / 2 + Math.sin((i / 12) * Math.PI) * r,
        z,
      ] as P,
  );
  mark(p, points);
}
function bowl(p: THREE.Object3D, x: number, y: number, z: number, r = 0.075) {
  const points = [
    [0.01, 0],
    [r * 0.48, 0.008],
    [r * 0.92, 0.036],
    [r, 0.047],
    [r * 0.9, 0.047],
    [r * 0.82, 0.035],
    [r * 0.45, 0.016],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  put(p, new THREE.LatheGeometry(points, 12), ceramic, [x, y, z]);
  const rim = put(
    p,
    new THREE.TorusGeometry(r * 0.96, 0.0028, 3, 16),
    inkWood,
    [x, y + 0.047, z],
  );
  rim.rotation.x = Math.PI / 2;
}
function jar(p: THREE.Object3D, x: number, y: number, z: number, r = 0.085) {
  put(
    p,
    new THREE.LatheGeometry(
      [
        [r * 0.55, 0],
        [r, 0.07],
        [r * 0.95, 0.14],
        [r * 0.4, 0.2],
        [r * 0.42, 0.23],
      ].map((a) => new THREE.Vector2(...a)),
      12,
    ),
    ceramic,
    [x, y, z],
  );
  put(p, new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.015, 12), inkWood, [
    x,
    y + 0.23,
    z,
  ]);
}
// The aged crop shows flax/paper and oiled brown umbrellas. Muted mineral
// reds and greens are restrained color interpretations, not recovered dyes.
export const PARASOL_COLORS = [
  0xc7b68d, 0xb49a71, 0x967b5e, 0x9d7964, 0x89927e, 0xd2c29d, 0x8b9691,
  0xb1a07b,
] as const;
const parasolPigments = PARASOL_COLORS.map((c) => paintMaterial(c));
export function parasolStyle(index: number, compact = false) {
  return {
    color: PARASOL_COLORS[index % PARASOL_COLORS.length],
    form: ["round", "oval", "scalloped", "patched"][index % 4],
    radius: compact ? 0.96 : 1.22 + (index % 3) * 0.09,
    rimHeight: 1.43 + (index % 3) * 0.025,
    rise: 0.14 + (index % 2) * 0.045,
  };
}
export function marketParasol(
  parent: THREE.Object3D,
  index: number,
  compact = false,
) {
  const spec = parasolStyle(index, compact),
    g = new THREE.Group();
  g.name = "paper-parasol";
  g.userData = { ...spec };
  parent.add(g);
  g.rotation.y = index * 0.73;
  const ribs = 20 + (index % 3) * 4,
    lean = 0.035 * Math.sin(index * 1.7);
  const point = (a: number, t: number): P => {
    const r = spec.radius * t * (1 + 0.025 * Math.sin(a * 3 + index));
    const scallop =
      spec.form === "scalloped" ? 0.035 * Math.cos((a * ribs) / 2) * t ** 8 : 0;
    return [
      lean + r * Math.cos(a),
      spec.rimHeight + spec.rise * (1 - t ** 1.55) + scallop,
      r * Math.sin(a) * (spec.form === "oval" ? 0.76 : 1),
    ];
  };
  rod(g, [0, 0, 0], [lean, spec.rimHeight + spec.rise, 0], 0.018, inkWood);
  for (let j = 0; j < ribs; j++) {
    const vertices: number[] = [],
      ids: number[] = [];
    for (let k = 0; k <= 4; k++)
      for (const a of [
        (j / ribs) * Math.PI * 2,
        ((j + 1) / ribs) * Math.PI * 2,
      ])
        vertices.push(...point(a, k / 4));
    for (let k = 0; k < 4; k++) {
      const n = k * 2;
      ids.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(ids);
    geo.computeVertexNormals();
    const pigment =
      spec.form === "patched" && j === 3
        ? parasolPigments[(index + 2) % 8]
        : parasolPigments[index % 8];
    put(g, geo, pigment);
    const a = (j / ribs) * Math.PI * 2;
    mark(
      g,
      Array.from({ length: 5 }, (_, k) => {
        const p = point(a, k / 4);
        p[1] += 0.004;
        return p;
      }),
    );
    // Slender bamboo ribs sit just under the cloth, with a continuous bound hem.
    const rib=Array.from({length:5},(_,k)=>{const p=point(a,k/4);p[1]-=.009;return p;});
    for(let k=1;k<rib.length;k++)rod(g,rib[k-1],rib[k],.0045,timber);
    const hem=Array.from({length:4},(_,k)=>point((j+k/3)/ribs*Math.PI*2,1));
    mark(g,hem);
    if (j % 4 === 0)
      rod(g, [lean, spec.rimHeight - 0.24, 0], point(a, 0.78), 0.006, timber);
  }
  const finial = put(g, new THREE.SphereGeometry(0.036, 6, 4), inkWood, [
    lean,
    spec.rimHeight + spec.rise + 0.025,
    0,
  ]);
  finial.scale.y = 0.7;
  return g;
}
export function marketStall(
  parent: THREE.Object3D,
  index: number,
  covered: boolean,
) {
  const root = new THREE.Group();
  root.name = MARKET_TYPES[index % 6];
  root.userData.display =
    index % 6 === 1 || index % 6 === 4 ? "low-trestle" : "counter";
  let g = new THREE.Group();
  root.add(g);
  const fabric = fabrics[(index * 5 + Math.floor(index / 6)) % fabrics.length];
  parent.add(root);
  box(g, [1.3, 0.07, 0.66], [0, 0.61, 0]).name = "display-counter";
  for (const x of [-0.55, 0.55])
    for (const z of [-0.25, 0.25]) box(g, [0.045, 0.58, 0.045], [x, 0.29, z]);
  rod(g, [-0.55, 0.2, -0.25], [0.55, 0.2, -0.25]);
  rod(g, [-0.55, 0.2, 0.25], [0.55, 0.2, 0.25]);
  for (let i = 0; i < 7; i++)
    mark(g, [
      [-0.62, 0.648, -0.28 + i * 0.09],
      [0.62, 0.648, -0.28 + i * 0.09],
    ]);
  const kind = index % 6;
  if (kind === 0) {
    for (const x of [-0.42, -0.2, 0.02])
      for (let j = 0; j < 3; j++) bowl(g, x, 0.65 + j * 0.025, 0.08, 0.076);
    jar(g, 0.33, 0.65, -0.03, 0.075);
    for (const x of [-0.3, 0, 0.3]) bowl(g, x, 0.65, -0.18, 0.055);
    box(g, [0.52, 0.36, 0.32], [0.2, 0.18, -0.47]);
    wovenBasket(g, -0.45, 0.16, -0.45, 0.14, 0.27);
  } else if (kind === 1) {
    for (const x of [-0.42, -0.12, 0.25])
      wovenBasket(g, x, 0.75, 0.02, 0.1, 0.17);
    for (const x of [-0.43, 0.02, 0.43])
      wovenBasket(g, x, 0.14, -0.48, 0.17, 0.27);
    wovenBasket(g, 0.46, 0.98, 0.02, 0.13, 0.24);
  } else if (kind === 2) {
    box(g, [0.56, 0.025, 0.44], [-0.24, 0.67, 0]);
    for (let i = 0; i < 16; i++) {
      const x = -0.46 + (i % 4) * 0.13,
        z = -0.14 + Math.floor(i / 4) * 0.09;
      const o = put(g, new THREE.SphereGeometry(0.047, 8, 5), linen, [
        x,
        0.71,
        z,
      ]);
      o.scale.y = 0.65;
    }
    jar(g, 0.36, 0.65, -0.08, 0.1);
    bowl(g, 0.34, 0.65, 0.19, 0.09);
    rod(g, [-0.5, 1.16, -0.29], [0.5, 1.16, -0.29], 0.012);
    for (let i = 0; i < 6; i++) {
      const x = -0.42 + i * 0.16;
      rod(g, [x, 1.16, -0.29], [x, 0.93, -0.29], 0.003, inkWood);
      for (let j = 0; j < 3; j++)
        put(g, new THREE.SphereGeometry(0.035, 6, 4), food, [
          x,
          0.92 - j * 0.055,
          -0.29,
        ]);
    }
  } else if (kind === 3) {
    for (let i = 0; i < 5; i++) {
      box(
        g,
        [0.4, 0.028, 0.25],
        [-0.36 + i * 0.19, 0.67 + i * 0.014, 0],
        fabrics[(index + i) % fabrics.length],
      );
      mark(g, [
        [-0.5 + i * 0.19, 0.69 + i * 0.014, -0.11],
        [-0.5 + i * 0.19, 0.69 + i * 0.014, 0.11],
      ]);
    }
    for (let i = 0; i < 5; i++)
      put(g, new THREE.CylinderGeometry(0.034, 0.034, 0.26, 8), linen, [
        0.43,
        0.68 + i * 0.06,
        -0.08,
      ]).rotation.z = Math.PI / 2;
    box(g, [0.4, 0.4, 0.3], [-0.2, 0.2, -0.5]);
  } else if (kind === 4) {
    for (const x of [-0.4, -0.05, 0.32]) jar(g, x, 0.65, -0.05, 0.09);
    for (const x of [-0.45, 0, 0.45]) {
      wovenBasket(g, x, 0.16, -0.48, 0.15, 0.28);
      for (let i = 0; i < 16; i++)
        put(g, new THREE.SphereGeometry(0.025, 4, 3), food, [
          x + Math.sin(i * 2.4) * 0.11,
          0.3 + (i % 3) * 0.009,
          -0.48 + Math.cos(i * 2.4) * 0.11,
        ]);
    }
  } else {
    box(g, [1.12, 0.025, 0.47], [0, 0.66, 0], linen);
    for (let i = 0; i < 8; i++) {
      const x = -0.45 + (i % 4) * 0.29,
        z = -0.13 + Math.floor(i / 4) * 0.23;
      const fish = put(g, new THREE.SphereGeometry(1, 8, 5), fishGlaze, [
        x,
        0.7,
        z,
      ]);
      fish.scale.set(0.106, 0.024, 0.037);
      const tail = put(g, new THREE.ConeGeometry(0.04, 0.07, 3), fishGlaze, [
        x - 0.12,
        0.7,
        z,
      ]);
      tail.rotation.z = Math.PI / 2;
      put(g, new THREE.SphereGeometry(0.004, 4, 3), inkWood, [
        x + 0.07,
        0.72,
        z + 0.02,
      ]);
    }
    wovenBasket(g, -0.4, 0.13, -0.46, 0.15, 0.24);
    wovenBasket(g, 0.4, 0.13, -0.46, 0.15, 0.24);
  }
  if (kind === 1 || kind === 4) {
    g.scale.y = 0.58;
    // Low woven displays and stacked baskets appear throughout the approach.
    box(root, [1.38, 0.018, 0.85], [0, 0.012, -0.08], linen);
  }
  if (kind === 4)
    for (let i = 0; i < 7; i++) {
      const leaf = put(g, new THREE.SphereGeometry(0.06, 5, 3), produce, [
        0.44 + Math.sin(i * 2.4) * 0.09,
        0.35,
        -0.48 + Math.cos(i * 2.4) * 0.08,
      ]);
      leaf.scale.set(0.55, 1.4, 0.6);
    }
  if (kind === 3)
    for (const x of [-0.44, 0.36]) {
      rod(root, [x, 0, -0.31], [x, 1.45, -0.31], 0.012);
      box(
        root,
        [0.26, 0.56, 0.018],
        [x, 1.1, -0.31],
        fabrics[(index + 2) % fabrics.length],
      );
      for (let j = 0; j < 4; j++)
        mark(root, [
          [x - 0.08 + j * 0.045, 0.89, -0.297],
          [x - 0.08 + j * 0.045, 0.96, -0.297],
        ]);
    }
  g = root;
  if (covered) {
    for (const x of [-0.65, 0.65])
      for (const z of [-0.35, 0.35])
        rod(g, [x, 0, z], [x, 1.48 + (z < 0 ? 0.08 : 0), z], 0.014);
    // Sagging fabric roof with a raised ridge, stitched seams and uneven fringe.
    const vertices: number[] = [],
      ids: number[] = [];
    for (let i = 0; i <= 12; i++)
      for (let j = 0; j <= 8; j++) {
        const x = -0.9 + (i / 12) * 1.8,
          z = -0.5 + j / 8;
        vertices.push(
          x,
          1.48 +
            (index % 2 ? 0.12 * z : 0.15 * (1 - Math.abs(z) * 2)) -
            0.055 * Math.sin((i / 12) * Math.PI) +
            0.012 * Math.sin(i * 1.7 + j),
          z,
        );
      }
    for (let i = 0; i < 12; i++)
      for (let j = 0; j < 8; j++) {
        const a = i * 9 + j;
        ids.push(a, a + 1, a + 9, a + 1, a + 10, a + 9);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(ids);
    geo.computeVertexNormals();
    put(g, geo, fabric);
    for (let i = 0; i < 5; i++)
      mark(g, [
        [-0.76 + i * 0.38, 1.47, -0.49],
        [-0.76 + i * 0.38, 1.61, 0],
        [-0.76 + i * 0.38, 1.46, 0.49],
      ]);
    for (let i = 0; i < 16; i++)
      rod(
        g,
        [-0.76 + i * 0.1, 1.47, 0.49],
        [-0.76 + i * 0.1, 1.36 + (i % 3) * 0.016, 0.49],
        0.009,
        fabric,
      );
    for (const x of [-0.63, 0.63])
      mark(g, [
        [x, 1.5, 0.35],
        [x * 1.17, 0.02, 0.56],
      ]);
  }
  // Hanging shop board, short stool and low baskets break the uniform table row.
  const sign = box(g, [0.15, 0.29, 0.025], [0.6, 1.04, -0.3], linen);
  sign.rotation.z = ((index % 3) - 1) * 0.12;
  for (let i = 0; i < 3; i++)
    mark(g, [
      [0.565, 1.12 - i * 0.067, -0.281],
      [0.635, 1.12 - i * 0.067, -0.281],
      [0.61, 1.09 - i * 0.067, -0.281],
    ]);
  box(g, [0.3, 0.035, 0.18], [-0.43, 0.23, -0.63]);
  for (const x of [-0.54, -0.32])
    rod(g, [x, 0, -0.63], [x, 0.23, -0.63], 0.014);
  return root;
}
export function bridgeMarket(
  parent: THREE.Object3D,
  height: (x: number) => number,
  width: number,
  length: number,
) {
  // Edge counters shown on the crest: keep the central cart and foot lanes open.
  const counters = [];
  for (const [i, layout] of BRIDGE_SHOPS.entries()) {
    const { x, lateral } = layout,
      side = Math.sign(lateral),
      kind = layout.kind;
    const g = new THREE.Group();
    g.position.set(x, height(x), side * (width / 2 + 0.04));
    // Counters at waist height and shelters above the revised adult figures.
    g.scale.y = 1.6;
    g.rotation.z = Math.atan2(height(x + 0.4) - height(x - 0.4), 0.8);
    parent.add(g);
    box(g, [layout.width, 0.035, layout.depth], [0, 0.24, 0]);
    for (const u of [-0.28, 0.28]) rod(g, [u, 0, 0], [u, 0.24, 0], 0.012);
    if (kind === 0) {
      for (let j = 0; j < 5; j++)
        for (let k = 0; k < 2; k++)
          bowl(g, -0.3 + j * 0.15, 0.26 + k * 0.025, 0, 0.056);
      jar(g, 0.27, 0.275, -0.03, 0.043);
    } else if (kind === 1) {
      for (const x of [-0.28, 0, 0.28]) wovenBasket(g, x, 0.33, 0, 0.085, 0.14);
      wovenBasket(g, -0.3, 0.08, side * 0.12, 0.09, 0.14);
    } else if (kind === 2) {
      box(g, [0.65, 0.02, 0.18], [0, 0.275, 0], linen);
      for (let j = 0; j < 12; j++) {
        const bun = put(g, new THREE.SphereGeometry(0.032, 6, 4), linen, [
          -0.27 + (j % 6) * 0.105,
          0.3,
          Math.floor(j / 6) * 0.075 - 0.04,
        ]);
        bun.scale.y = 0.6;
      }
    }
    // A few cloth shelters make distinct stalls without hiding the whole crowd.
    if (layout.canopy) {
      for (const x of [-0.4, 0.4])
        rod(g, [x, 0, side * 0.1], [x, 0.67, side * 0.1], 0.01);
      const roof = box(
        g,
        [0.96, 0.025, 0.42],
        [0, 0.68, side * 0.07],
        fabrics[i % fabrics.length],
      );
      roof.rotation.x = side * 0.12;
      for (let j = 0; j < 10; j++)
        rod(
          g,
          [-0.43 + j * 0.095, 0.67, side * 0.26],
          [-0.43 + j * 0.095, 0.59, side * 0.26],
          0.006,
          fabrics[i % fabrics.length],
        );
      box(g, [0.11, 0.23, 0.018], [0.4, 0.45, side * 0.12], linen);
    }
    if (i % 3 === 1) {
      const umbrella=marketParasol(g,i+2,true);
      umbrella.position.set(.05,0,side*.12);
      umbrella.scale.set(.49+(i%2)*.08,.51,.42+(i%3)*.04);
      umbrella.rotation.z=side*.045;
    }
    if(i%5===2){
      rod(g,[.3,0,side*.08],[.32,1.03,side*.08],.012);
      box(g,[.14,.31,.015],[.32,.84,side*.08],linen);
      for(let j=0;j<4;j++)mark(g,[[.28,.93-j*.055,side*.08+.01],[.35,.92-j*.055,side*.08+.01]]);
    }
    if (kind === 2) wovenBasket(g, 0, 0.095, side * 0.13, 0.09, 0.16);
    if (kind === 3)
      for (let j = 0; j < 3; j++)
        box(
          g,
          [0.24, 0.016, 0.18],
          [-0.17 + j * 0.16, 0.28 + j * 0.015, 0],
          j % 2 ? cloth : linen,
        );
    counters.push({
      x,
      lateral: side * (width / 2 + 0.04),
      width: layout.width,
      depth: layout.depth,
    });
  }
  // Interlocked crossing timbers, projecting ends, joint pegs and rope lashings.
  for (let i = 0; i < 14; i++) {
    const x = -length / 2 + (i * length) / 14,
      next = x + length / 14;
    for (const side of [-1, 1]) {
      const z = side * (width / 2 + 0.04);
      rod(
        parent,
        [x, height(x) - 0.44, z],
        [next, height(next) - 0.12, z],
        0.035,
      );
      rod(
        parent,
        [x, height(x) - 0.12, z],
        [next, height(next) - 0.44, z],
        0.03,
        inkWood,
      );
      box(parent, [0.12, 0.12, 0.19], [x, height(x) - 0.16, z]);
      for (let j = 0; j < 3; j++) {
        const ring = put(
          parent,
          new THREE.TorusGeometry(0.071, 0.004, 3, 12),
          linen,
          [x - 0.027 + j * 0.026, height(x) - 0.15, z],
        );
        ring.rotation.y = Math.PI / 2;
      }
      put(parent, new THREE.SphereGeometry(0.018, 5, 3), inkWood, [
        x,
        height(x) - 0.12,
        z + side * 0.11,
      ]);
    }
  }
  return counters;
}
