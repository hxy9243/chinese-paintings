import * as THREE from "three";
import { paintMaterial, createDryInk } from "./paintMaterial";
import type { DetailLevel } from "../../../packages/scene-kit/lod";

// Observed forms: public/reference/rainbow-bridge.jpg. These remain editable
// approximations: the crop does not reveal the concealed sides of buildings/boats.
const timber = paintMaterial(0x917344),
  edge = paintMaterial(0x5e513a),
  board = paintMaterial(0xb29b6b),
  paper = paintMaterial(0xc8b486),
  tile = paintMaterial(0x786746),
  tileLight = paintMaterial(0x8b7854),
  recess = paintMaterial(0x655b45),
  reed = paintMaterial(0xb4a178),
  leaf = paintMaterial(0x858167);
const ink = createDryInk(0.7);
type P = [number, number, number];
const v = (p: P) => new THREE.Vector3(...p);
function solid(
  g: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  p: P = [0, 0, 0],
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p);
  g.add(m);
  return m;
}
function block(
  g: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  p: P,
  mat = timber,
) {
  return solid(g, new THREE.BoxGeometry(w, h, d), mat, p);
}
function rod(g: THREE.Object3D, a: P, b: P, r = 0.012, mat = timber) {
  const A = v(a),
    B = v(b),
    delta = B.clone().sub(A);
  const m = solid(
    g,
    new THREE.CylinderGeometry(r * 0.86, r, delta.length(), 6),
    mat,
    A.clone().add(B).multiplyScalar(0.5).toArray() as P,
  );
  m.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  return m;
}
function line(g: THREE.Object3D, points: P[]) {
  g.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points.map(v)),
      ink,
    ),
  );
}
function surface(g: THREE.Object3D, positions: number[], mat: THREE.Material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return solid(g, geo, mat);
}
function quad(out: number[], a: P, b: P, c: P, d: P) {
  out.push(...a, ...b, ...c, ...a, ...c, ...d);
}

export type TreeForm = "upright" | "spreading" | "pollard" | "sapling";
export function buildReferenceTree(
  form: TreeForm,
  seed: number,
  detail: DetailLevel = 2,
  landmark = false,
  leafy = false,
) {
  const g = new THREE.Group();
  g.name = landmark ? "great-riverbank-tree" : "reference-tree";
  const vertices: number[] = [],
    marks: number[] = [];
  const old = form === "spreading",
    pollard = form === "pollard",
    h = old ? (landmark ? 1.75 : 1.65) : pollard ? 1.35 : 1.9;
  const radius = old ? (landmark ? 0.19 : 0.105) : pollard ? 0.075 : 0.045;
  const curves: { curve: THREE.CatmullRomCurve3; radius: number }[] = [];
  const limb = (points: P[], r: number, end = 0.03) => {
    const curve = new THREE.CatmullRomCurve3(points.map(v)),
      rings = r > 0.05 ? (detail === 2 ? 12 : 6) : detail === 2 ? 5 : 3,
      sides = detail === 2 ? 7 : 4;
    const basis = new THREE.Vector3(0, 0, 1),
      Y = new THREE.Vector3(0, 1, 0);
    const ring = (t: number) => {
      const p = curve.getPoint(t),
        tangent = curve.getTangent(t),
        n = (Math.abs(tangent.z) > 0.95 ? Y : basis)
          .clone()
          .cross(tangent)
          .normalize(),
        b = tangent.clone().cross(n).normalize();
      return Array.from(
        { length: sides },
        (_, j) =>
          p
            .clone()
            .addScaledVector(
              n,
              Math.cos((j / sides) * Math.PI * 2) *
                r *
                (end + (1 - end) * Math.pow(1 - t, 1.35)),
            )
            .addScaledVector(
              b,
              Math.sin((j / sides) * Math.PI * 2) *
                r *
                (end + (1 - end) * Math.pow(1 - t, 1.35)),
            )
            .toArray() as P,
      );
    };
    let previous = ring(0);
    for (let k = 1; k <= rings; k++) {
      const next = ring(k / rings);
      for (let j = 0; j < sides; j++)
        quad(
          vertices,
          previous[j],
          next[j],
          next[(j + 1) % sides],
          previous[(j + 1) % sides],
        );
      previous = next;
    }
    if (detail > 0 && r > 0.025)
      for (let j = 0; j < (detail === 2 ? 4 : 2); j++)
        for (let k = 0; k < 8; k++) {
          for (const t of [k / 8, (k + 1) / 8]) {
            const p = curve.getPoint(t),
              rr = r * (end + (1 - end) * Math.pow(1 - t, 1.35)) * 1.02,
              a = j * 1.57 + Math.sin(t * 14 + seed) * 0.12;
            p.x += Math.cos(a) * rr;
            p.z += Math.sin(a) * rr;
            marks.push(...p.toArray());
          }
        }
    // Subpixel twig meshes disappear in the overview. Persistent ink strokes
    // keep the fine branching readable, as in the drawn crown of the reference.
    if (detail > 0 && r <= 0.012)
      for (let j = 0; j < 5; j++)
        for (const t of [j / 5, (j + 1) / 5])
          marks.push(...curve.getPoint(t).toArray());
    curves.push({ curve, radius: r });
    return curve;
  };
  // Low forks and a bent leader; major boughs have distinct directions and ages.
  const trunk = limb(
    landmark
      ? [
          [0, 0, 0],
          [-0.1, h * 0.13, 0.025],
          [-0.19, h * 0.29, -0.025],
          [0.01, h * 0.42, 0.015],
          [-0.055, h * 0.55, -0.04],
          [0.11, h * 0.69, 0.02],
          [-0.04, h * 0.85, 0.015],
          [0.05, h, 0],
        ]
      : [
          [0, 0, 0],
          [-radius * 0.4, h * 0.18, 0.015],
          [0.09, h * 0.42, -0.015],
          [-0.06, h * 0.67, 0.04],
          [0.02, h, 0.02],
        ],
    radius,
    0.16,
  );
  if (landmark && detail > 0)
    for (const t of [0.2, 0.38, 0.55, 0.71]) {
      const center = trunk.getPoint(t),
        rr = radius * (0.16 + 0.84 * Math.pow(1 - t, 1.35));
      for (let j = 0; j < 18; j++)
        for (const q of [j / 18, (j + 1) / 18]) {
          const a = q * Math.PI * 2,
            theta = -0.5 + Math.cos(a) * 0.22;
          marks.push(
            center.x + Math.cos(theta) * rr * 1.025,
            center.y + Math.sin(a) * 0.055,
            center.z + Math.sin(theta) * rr * 1.025,
          );
        }
    }
  if (old || pollard)
    for (let j = 0; j < 5; j++) {
      const a = j * 1.256 + seed;
      limb(
        [
          [0.025, h * 0.24, 0],
          [Math.cos(a) * radius * 0.8, 0.13, Math.sin(a) * radius * 0.8],
          [Math.cos(a) * radius * 2.4, 0.006, Math.sin(a) * radius * 2.4],
        ],
        radius * 0.48,
        0.025,
      );
    }
  const skeleton = old
    ? [
        [0.28, -1.55, 0.74, 0.14],
        [0.43, 0.98, 1.12, 0.35],
        [0.58, -0.76, 1.28, -0.61],
        [0.69, 0.37, 1.34, -0.5],
        [0.8, -0.3, 1.42, 0.38],
        [0.38, 0.51, 0.88, -0.78],
        [0.6, 1.12, 1.15, -0.3],
      ]
    : pollard
      ? [
          [0.67, -0.52, 1.18, 0.14],
          [0.79, 0.45, 1.17, 0.25],
          [0.85, -0.24, 1.34, -0.3],
          [0.73, 0.3, 1.25, -0.31],
        ]
      : [
          [0.32, -0.45, 0.89, 0.14],
          [0.48, 0.32, 1.14, -0.25],
          [0.65, -0.25, 1.2, -0.3],
          [0.78, 0.38, 1.26, 0.25],
        ];
  skeleton.forEach(([t, dx, dy, dz], j) => {
    const base = trunk.getPoint(t),
      scale = old ? (landmark ? 1.15 : 0.82) : 1;
    const tip: P = [dx * scale, h * dy, dz * scale];
    const major = limb(
      [
        base.toArray() as P,
        [base.x + dx * 0.24 * scale, base.y + 0.09, base.z + dz * 0.35],
        [dx * 0.72 * scale, h * (dy - 0.23), dz * 0.8 * scale],
        tip,
      ],
      radius * (old ? (landmark ? 0.36 : 0.44) : 0.32) * (1 - t * 0.35),
      0.09,
    );
    if (old && detail > 0)
      for (let k = 0; k < (detail === 2 ? 5 : 3); k++) {
        const u = 0.34 + k * 0.12,
          B = major.getPoint(u),
          a = seed + j * 1.7 + k * 2.3;
        const reach = 0.34 + (k % 2) * 0.15;
        const end: P = [
          B.x + Math.cos(a) * reach,
          B.y + 0.24 + (k % 3) * 0.07,
          B.z + Math.sin(a) * reach * 0.85,
        ];
        const fork = limb(
          [
            B.toArray() as P,
            [
              B.x + (end[0] - B.x) * 0.5,
              B.y + 0.08,
              B.z + (end[2] - B.z) * 0.35,
            ],
            end,
          ],
          0.032 * (1 - u * 0.4),
          0.055,
        );
        for (let q = 0; q < (detail === 2 ? 6 : 2); q++) {
          const b = fork.getPoint(0.28 + q * 0.12),
            angle = a + q * 1.9;
          const tip: P = [
            b.x + Math.cos(angle) * 0.17,
            b.y + 0.14 + (q % 2) * 0.09,
            b.z + Math.sin(angle) * 0.15,
          ];
          const twig = limb(
            [
              b.toArray() as P,
              [(b.x + tip[0]) * 0.5, b.y + 0.07, (b.z + tip[2]) * 0.5],
              tip,
            ],
            0.008,
            0.025,
          );
          if (detail === 2)
            for (let r = 0; r < 2; r++) {
              const c = twig.getPoint(0.5 + r * 0.23);
              limb(
                [
                  c.toArray() as P,
                  [
                    c.x + Math.sin(angle + r) * 0.09,
                    c.y + 0.11,
                    c.z + Math.cos(angle + r) * 0.085,
                  ],
                ],
                0.0035,
                0.02,
              );
            }
        }
      }
    const count = detail === 2 ? 9 : detail === 1 ? 5 : 2;
    for (let k = 0; k < count; k++) {
      const u = 0.3 + (k / count) * 0.67,
        B = major.getPoint(u),
        sign = k % 2 ? 1 : -1;
      const reach = (old ? 0.27 : 0.16) * (1 - u * 0.45),
        a = j * 1.8 + k * 2.1 + seed;
      const end: P = [
        B.x + Math.cos(a) * reach + sign * 0.06,
        B.y + 0.19 + (k % 3) * 0.07,
        B.z + Math.sin(a) * reach,
      ];
      const secondary = limb(
        [
          B.toArray() as P,
          [B.x + (end[0] - B.x) * 0.65, B.y + 0.08, B.z + (end[2] - B.z) * 0.3],
          end,
        ],
        0.012 * (1 - u * 0.4),
        0.025,
      );
      if (detail > 0)
        for (let q = 0; q < (detail === 2 ? 4 : 2); q++) {
          const b = secondary.getPoint(0.35 + q * 0.17),
            e: P = [
              b.x + Math.sin(a + q * 2) * 0.1,
              b.y + 0.12 + q * 0.02,
              b.z + Math.cos(a + q * 2) * 0.085,
            ];
          limb(
            [
              b.toArray() as P,
              [(b.x + e[0]) * 0.5, b.y + 0.08, (b.z + e[2]) * 0.5],
              e,
            ],
            0.0038,
            0.02,
          );
        }
      if (leafy && k % 2 === 0)
        for (let q = 0; q < (detail === 0 ? 2 : 7); q++) {
          // Sparse spring foliage consists of small leaves, leaving branches visible.
          const m = solid(g, new THREE.IcosahedronGeometry(0.065, 0), leaf, [
            end[0] + Math.sin(q * 2.4) * 0.12,
            end[1] + Math.cos(q * 1.8) * 0.11,
            end[2] + Math.cos(q * 2.4) * 0.1,
          ]);
          m.scale.set(1, 0.45, 0.7);
        }
    }
  });
  surface(g, vertices, timber);
  if (marks.length)
    g.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute(
          "position",
          new THREE.Float32BufferAttribute(marks, 3),
        ),
        ink,
      ),
    );
  g.userData.treeForm = form;
  g.userData.branchBounds = curves.map((c) => c.curve.getPoint(1).toArray());
  return g;
}

export type BoatStyle = "cabin" | "canopy" | "freight" | "skiff";
export function buildReferenceBoat(
  length: number,
  width: number,
  style: BoatStyle,
  detail: DetailLevel = 2,
) {
  const g = new THREE.Group();
  g.name = "reference-boat";
  g.userData.boatStyle = style;
  // Cross sections give a hollow, flared hull with sheer at both ends. Local z is
  // the keel. Geometry stays inside the navigation envelope used by the routes.
  const n = detail === 0 ? 10 : 24,
    skin: number[] = [],
    deck: number[] = [],
    rails: [P[], P[]] = [[], []];
  const section = (t: number) => {
    const u = Math.abs(t),
      breadth = width * (0.09 + 0.43 * Math.pow(Math.max(0, 1 - u * u), 0.48));
    const sheer = 0.29 + 0.21 * Math.pow(u, 4),
      bottom = -0.11 + 0.36 * Math.pow(u, 5),
      z = t * length * 0.56;
    return { breadth, sheer, bottom, z };
  };
  for (let j = 0; j < n; j++) {
    const a = section(-1 + (2 * j) / n),
      b = section(-1 + (2 * (j + 1)) / n);
    for (const side of [-1, 1]) {
      const A: P = [side * a.breadth, a.sheer, a.z],
        B: P = [side * b.breadth, b.sheer, b.z],
        C: P = [side * b.breadth * 0.64, b.bottom, b.z],
        D: P = [side * a.breadth * 0.64, a.bottom, a.z];
      quad(skin, A, B, C, D);
      quad(
        skin,
        [side * a.breadth * 0.94, a.sheer - 0.018, a.z],
        [side * a.breadth * 0.58, a.bottom + 0.05, a.z],
        [side * b.breadth * 0.58, b.bottom + 0.05, b.z],
        [side * b.breadth * 0.94, b.sheer - 0.018, b.z],
      );
      if (j === 0) rails[side === -1 ? 0 : 1].push(A);
      rails[side === -1 ? 0 : 1].push(B);
      if (detail > 0)
        for (let course = 1; course <= 4; course++) {
          const f = course / 5;
          line(g, [
            [
              side * a.breadth * (1 - f * 0.36),
              a.sheer + (a.bottom - a.sheer) * f,
              a.z,
            ],
            [
              side * b.breadth * (1 - f * 0.36),
              b.sheer + (b.bottom - b.sheer) * f,
              b.z,
            ],
          ]);
        }
    }
    quad(
      deck,
      [-a.breadth * 0.88, 0.335, a.z],
      [a.breadth * 0.88, 0.335, a.z],
      [b.breadth * 0.88, 0.335, b.z],
      [-b.breadth * 0.88, 0.335, b.z],
    );
  }
  surface(g, skin, timber).name = "hollow-planked-hull";
  surface(g, deck, board).name = "deck";
  for (const rail of rails)
    for (let j = 1; j < rail.length; j++)
      rod(g, rail[j - 1], rail[j], 0.024, edge);
  for (const end of [-1, 1]) {
    const s = section(end);
    rod(g, [-s.breadth, s.sheer, s.z], [s.breadth, s.sheer, s.z], 0.022, edge);
    block(g, width * 0.44, 0.045, length * 0.13, [
      0,
      0.3125,
      end * length * 0.39,
    ]);
  }
  if (detail > 0) {
    for (let j = 0; j <= Math.ceil(length / 0.17); j++) {
      const s = section(-0.91 + (j / Math.ceil(length / 0.17)) * 1.82);
      line(g, [
        [-s.breadth * 0.87, 0.339, s.z],
        [s.breadth * 0.87, 0.339, s.z],
      ]);
      if (j % 3 === 0)
        for (const side of [-1, 1])
          rod(
            g,
            [side * s.breadth * 0.89, 0.34, s.z],
            [side * s.breadth * 0.97, s.sheer, s.z],
            0.014,
            edge,
          );
    }
    for (const rail of rails)
      for (let j = 3; j < rail.length - 2; j += 3) {
        const a = rail[j];
        rod(g, a, [a[0], a[1] + 0.13, a[2]], 0.012);
      }
    for (const side of [-1, 1]) {
      const points = rails[side === -1 ? 0 : 1]
        .slice(3, -2)
        .map((p) => [p[0], p[1] + 0.13, p[2]] as P);
      for (let j = 1; j < points.length; j++)
        rod(g, points[j - 1], points[j], 0.012);
    }
  }
  if (style === "cabin" || style === "freight") {
    const cabin = new THREE.Group();
    cabin.name = "timber-cabin";
    g.add(cabin);
    const half = length * (style === "freight" ? 0.2 : 0.245),
      cw = width * 0.4,
      base = 0.36,
      eave = 0.87,
      ridge = 1.01;
    for (const side of [-1, 1]) {
      block(cabin, 0.035, 0.18, half * 2, [side * cw, base + 0.09, 0], paper);
      for (let z = -half; z < half + 0.01; z += half / 4) {
        rod(cabin, [side * cw, base, z], [side * cw, eave, z], 0.019, edge);
        if (detail > 0) {
          block(
            cabin,
            0.027,
            0.29,
            half * 0.13,
            [side * cw, base + 0.31, z + half * 0.12],
            reed,
          );
          for (let k = 0; k < 4; k++)
            rod(
              cabin,
              [side * (cw + 0.016), base + 0.19 + k * 0.064, z],
              [
                side * (cw + 0.016),
                base + 0.19 + k * 0.064,
                Math.min(half, z + half * 0.18),
              ],
              0.004,
              edge,
            );
        }
      }
      rod(
        cabin,
        [side * cw, base + 0.18, -half],
        [side * cw, base + 0.18, half],
        0.013,
        edge,
      );
      rod(
        cabin,
        [side * cw, eave, -half],
        [side * cw, eave, half],
        0.018,
        edge,
      );
    }
    // Recessed openings, not dark rectangles pasted on a solid house box.
    for (const end of [-1, 1]) {
      block(cabin, cw * 2, 0.16, 0.035, [0, base + 0.08, end * half], paper);
      rod(cabin, [-cw, eave, end * half], [0, ridge, end * half], 0.019, edge);
      rod(cabin, [0, ridge, end * half], [cw, eave, end * half], 0.019, edge);
    }
    const roof: number[] = [];
    for (const side of [-1, 1])
      for (let j = 0; j < 6; j++) {
        const a = j / 6,
          b = (j + 1) / 6,
          Y = (u: number) =>
            ridge - (ridge - eave) * u - 0.035 * Math.sin(u * Math.PI);
        quad(
          roof,
          [side * (cw + 0.07) * a, Y(a), -half - 0.09],
          [side * (cw + 0.07) * b, Y(b), -half - 0.09],
          [side * (cw + 0.07) * b, Y(b), half + 0.09],
          [side * (cw + 0.07) * a, Y(a), half + 0.09],
        );
      }
    surface(cabin, roof, tile);
    if (detail > 0)
      for (let z = -half - 0.08; z <= half + 0.09; z += 0.105)
        for (const side of [-1, 1])
          line(cabin, [
            [0, ridge + 0.008, z],
            [side * cw * 0.6, 0.93, z],
            [side * (cw + 0.07), eave + 0.008, z],
          ]);
    rod(
      cabin,
      [0, ridge + 0.018, -half - 0.1],
      [0, ridge + 0.018, half + 0.1],
      0.025,
      edge,
    );
  } else if (style !== "skiff") {
    const half = length * 0.26,
      radius = width * 0.44,
      canopy: number[] = [];
    for (let j = 0; j < 12; j++) {
      const a = (j / 12) * Math.PI,
        b = ((j + 1) / 12) * Math.PI;
      quad(
        canopy,
        [Math.cos(a) * radius, 0.4 + Math.sin(a) * 0.38, -half],
        [Math.cos(b) * radius, 0.4 + Math.sin(b) * 0.38, -half],
        [Math.cos(b) * radius, 0.4 + Math.sin(b) * 0.38, half],
        [Math.cos(a) * radius, 0.4 + Math.sin(a) * 0.38, half],
      );
    }
    surface(g, canopy, reed).name = "woven-canopy";
    for (let z = -half; z <= half + 0.001; z += half / 4) {
      const points: P[] = Array.from({ length: 17 }, (_, j) => [
        Math.cos((j / 16) * Math.PI) * radius,
        0.4 + Math.sin((j / 16) * Math.PI) * 0.385,
        z,
      ]);
      for (let j = 1; j < points.length; j++)
        rod(g, points[j - 1], points[j], 0.011, edge);
    }
    if (detail > 0)
      for (let j = 1; j < 12; j++) {
        const a = (j / 12) * Math.PI;
        line(g, [
          [Math.cos(a) * radius, 0.4 + Math.sin(a) * 0.385, -half],
          [Math.cos(a) * radius, 0.4 + Math.sin(a) * 0.385, half],
        ]);
      }
  }
  // The main junk in the crop is lowering its mast to pass the bridge. Keep the
  // rig below 1.10, including rigging, rather than adding an upright tall mast.
  if (style === "freight" || style === "cabin") {
    const foot: P = [width * 0.59, 0.35, -length * 0.28],
      tip: P = [width * 0.61, 1.08, length * 0.3];
    rod(g, foot, tip, 0.023, edge);
    block(g, width * 0.22, 0.22, 0.09, [width * 0.5, 0.44, -length * 0.28]);
    for (const side of [1])
      line(g, [
        [side * width * 0.49, 0.34, -length * 0.32],
        tip,
        [side * width * 0.49, 0.34, length * 0.37],
      ]);
    if (detail > 0)
      for (let k = 0; k < 3; k++)
        rod(
          g,
          [width * 0.48, 0.48 + k * 0.023, -length * 0.3],
          [width * 0.55, 0.58 + k * 0.023, length * 0.19],
          0.009,
        );
  }
  const rudder = block(
    g,
    width * 0.19,
    0.24,
    0.045,
    [0, 0.12, -length * 0.58],
    edge,
  );
  rudder.rotation.y = 0.2;
  rod(g, [0, 0.14, -length * 0.58], [0, 0.55, -length * 0.49], 0.018, edge);
  rod(
    g,
    [0, 0.55, -length * 0.49],
    [width * 0.25, 0.53, -length * 0.38],
    0.013,
    edge,
  );
  if (detail > 0) {
    for (const side of [-1, 1]) {
      // Long oars stowed along the hull stay within the tested river clearance.
      rod(
        g,
        [side * width * 0.43, 0.39, -length * 0.43],
        [side * width * 0.58, 0.42, length * 0.35],
        0.01,
        edge,
      );
      const blade = block(
        g,
        width * 0.09,
        0.018,
        length * 0.13,
        [side * width * 0.57, 0.42, length * 0.33],
        board,
      );
      blade.rotation.y = -side * 0.04;
      const coil = new THREE.TorusGeometry(width * 0.095, 0.008, 4, 24);
      const m = solid(g, coil, reed, [
        side * width * 0.23,
        0.366,
        -length * 0.35,
      ]);
      m.rotation.x = Math.PI / 2;
      for (let k = 0; k < 3; k++) {
        const m = solid(
          g,
          new THREE.TorusGeometry(width * (0.04 + k * 0.018), 0.006, 4, 18),
          reed,
          [side * width * 0.23, 0.37, -length * 0.35],
        );
        m.rotation.x = Math.PI / 2;
      }
      const tub = solid(
        g,
        new THREE.CylinderGeometry(
          width * 0.1,
          width * 0.08,
          0.11,
          10,
          1,
          true,
        ),
        board,
        [side * width * 0.22, 0.395, length * 0.32],
      );
      tub.name = "deck-tub";
    }
    if (style === "freight" || style === "skiff")
      for (let k = 0; k < 3; k++) {
        const z = (k - 1) * length * 0.11;
        block(g, width * 0.42, 0.15, length * 0.085, [0, 0.415, z], reed);
        for (const side of [-1, 1])
          rod(
            g,
            [side * width * 0.18, 0.34, z - length * 0.045],
            [side * width * 0.18, 0.5, z + length * 0.045],
            0.006,
            edge,
          );
      }
  }
  return g;
}

// Extra geometry for the existing hall footprint. Roof shell and orientation
// remain in bridgeStudy; cap tiles and joinery are only enabled for close views.
export function addReferenceArchitecture(
  g: THREE.Group,
  w: number,
  depth: number,
  h: number,
  gabled: boolean,
) {
  const e = w / 2 + 0.2,
    f = depth / 2 + 0.23,
    r = gabled ? e : w * 0.29,
    top = h + Math.min(0.64, depth * (gabled ? 0.28 : 0.23)),
    y = h + 0.1;
  const Y = (t: number) => top + (y - top) * t - Math.sin(t * Math.PI) * 0.065;
  const tiles: [number[], number[]] = [[], []],
    spacing = 0.13,
    rows = Math.max(4, Math.ceil(f / 0.19)),
    columns = Math.ceil((e * 2) / spacing);
  for (const side of [-1, 1])
    for (let row = 0; row < rows; row++) {
      const t0 = (row + 0.08) / rows,
        t1 = Math.min(1, (row + 1.18) / rows);
      const widthAt = (t: number) => r + (e - r) * t;
      for (let col = 0; col < columns; col++) {
        const x = -e + ((col + 0.5) * 2 * e) / columns;
        if (Math.abs(x) > Math.min(widthAt(t0), widthAt(t1)) - 0.04) continue;
        const out = tiles[(row + col) % 5 === 0 ? 1 : 0],
          radius = 0.026;
        for (let j = 0; j < 5; j++) {
          const a = (j / 5) * Math.PI,
            b = ((j + 1) / 5) * Math.PI;
          quad(
            out,
            [
              x + Math.cos(a) * radius,
              Y(t0) + 0.013 + Math.sin(a) * radius,
              side * f * t0,
            ],
            [
              x + Math.cos(b) * radius,
              Y(t0) + 0.013 + Math.sin(b) * radius,
              side * f * t0,
            ],
            [
              x + Math.cos(b) * radius,
              Y(t1) + 0.013 + Math.sin(b) * radius,
              side * f * t1,
            ],
            [
              x + Math.cos(a) * radius,
              Y(t1) + 0.013 + Math.sin(a) * radius,
              side * f * t1,
            ],
          );
        }
      }
    }
  surface(g, tiles[0], tile).name = "overlapping-cap-tiles";
  surface(g, tiles[1], tileLight);
  for (let x = -r; x < r; x += 0.13) {
    const cap = solid(
      g,
      new THREE.CylinderGeometry(
        0.045,
        0.045,
        Math.min(0.14, r - x),
        8,
        1,
        true,
        0,
        Math.PI,
      ),
      tileLight,
      [x + 0.065, top + 0.002, 0],
    );
    cap.rotation.z = Math.PI / 2;
  }
  // Timber gable truss, with king post and paired struts under the verge.
  if (gabled)
    for (const side of [-1, 1]) {
      const x = side * (w / 2 + 0.018);
      rod(g, [x, h, -depth * 0.47], [x, h, depth * 0.47], 0.028, edge);
      rod(g, [x, h, 0], [x, top - 0.045, 0], 0.022, edge);
      rod(g, [x, h, -depth * 0.31], [x, top - 0.07, 0], 0.016, edge);
      rod(g, [x, top - 0.07, 0], [x, h, depth * 0.31], 0.016, edge);
      for (let z = -depth * 0.4; z < depth * 0.41; z += 0.22) {
        const t = Math.abs(z) / f,
          yy = Y(t);
        rod(g, [x, h, z], [x, yy - 0.04, z], 0.01, timber);
      }
      // A gable-facing doorway and shutters, as on the foreground hall.
      block(
        g,
        0.025,
        h * 0.72,
        depth * 0.23,
        [x - side * 0.15, h * 0.36, 0],
        recess,
      );
      for (const z of [-depth * 0.12, depth * 0.12])
        rod(g, [x * 1.005, 0.04, z], [x * 1.005, h * 0.74, z], 0.018, edge);
      for (const z of [-depth * 0.31, depth * 0.31]) {
        block(g, 0.025, h * 0.28, depth * 0.19, [x, h * 0.58, z], recess);
        for (let j = -2; j <= 2; j++)
          rod(
            g,
            [x * 1.008, h * 0.45, z + j * depth * 0.032],
            [x * 1.008, h * 0.71, z + j * depth * 0.032],
            0.007,
            board,
          );
      }
    }
  // Alternate opened shutters and fine rectangular lattice. Frame thickness is
  // independent of opening size; there is actual depth between screens/posts.
  const bays = Math.max(2, Math.ceil(w / 0.7));
  for (const side of [-1, 1])
    for (let j = 0; j < bays; j++) {
      const x = -w / 2 + ((j + 0.5) * w) / bays,
        z = side * (depth / 2 + 0.045),
        bw = (w / bays) * 0.68;
      for (let k = 0; k < 5; k++)
        rod(
          g,
          [x - bw / 2, h * 0.43 + k * h * 0.055, z],
          [x + bw / 2, h * 0.43 + k * h * 0.055, z],
          0.005,
          board,
        );
      for (let k = 0; k < 5; k++)
        rod(
          g,
          [x - bw / 2 + (k * bw) / 4, h * 0.43, z],
          [x - bw / 2 + (k * bw) / 4, h * 0.65, z],
          0.005,
          board,
        );
      if (j % 3 === 0) {
        const shutter = block(
          g,
          bw * 0.46,
          h * 0.34,
          0.025,
          [x - bw * 0.58, h * 0.56, z + side * 0.06],
          timber,
        );
        shutter.rotation.y = side * 0.55;
      }
      for (const sign of [-1, 1])
        rod(
          g,
          [x + sign * bw * 0.6, h * 0.78, side * depth * 0.48],
          [x + sign * (bw * 0.6 - 0.1), h * 0.96, side * (depth * 0.5 + 0.11)],
          0.018,
          edge,
        );
    }
}
