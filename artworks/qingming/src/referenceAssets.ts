import * as THREE from "three";
import { paintMaterial, createDryInk } from "./paintMaterial";
import type { DetailLevel } from "../../../packages/scene-kit/lod";

// Observed forms: public/reference/chicago-rainbow-bridge.png. These remain editable
// approximations: the crop does not reveal the concealed sides of buildings/boats.
const timber = paintMaterial(0x917344),
  edge = paintMaterial(0x5e513a),
  board = paintMaterial(0xb29b6b),
  paper = paintMaterial(0xc8b486),
  tile = paintMaterial(0x786746),
  tileLight = paintMaterial(0x8b7854),
  recess = paintMaterial(0x655b45),
  reed = paintMaterial(0xb4a178);
// Muted ink-green needles, as in the old pines around the foreground house.
const pineGlazes = [0x4b5140, 0x60634a, 0x737257].map(c => paintMaterial(c));
const pineInk = createDryInk(.48);
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
  foliage: "full" | "open" | "bare" = "full",
) {
  const g = new THREE.Group();
  g.name = landmark ? "great-riverbank-tree" : "reference-tree";
  const vertices: number[] = [],
    marks: number[] = [];
  const old = form === "spreading",
    pollard = form === "pollard",
    h = old ? (landmark ? 1.75 : 1.65) : pollard ? 1.35 : 1.9;
  const radius = old ? (landmark ? 0.25 : 0.135) : pollard ? 0.11 : 0.05;
  const needles: number[][] = [[], [], []], needleInk: number[] = [];
  // Short shoots carry several paired, round-section needles. The tapered
  // three-sided geometry stays needle-thin from every viewing direction.
  let sprayIndex = 0;
  const pineSpray = (at: P, phase: number, extent = 1) => {
    // Leave most branch tips bare on the bend; retain a few uneven needle tufts.
    // Branch construction is independent of foliage, with no transparent crowns.
    if (foliage === "bare" || (foliage === "open" && sprayIndex++ % 4 !== 0)) return;
    const shoots = detail === 2 ? 11 : detail === 1 ? 7 : 5;
    for (let f = 0; f < shoots; f++) {
      const az = phase + f * 2.39996,
        spread = (.035 + .055 * (f % 3) / 2) * extent,
        base = v(at).add(new THREE.Vector3(Math.cos(az)*spread, .018*(f%3), Math.sin(az)*spread));
      for (let n = 0; n < 3; n++) {
        const a = az + (n-1)*.16, length = (.105 + .012*((f+n)%6))*extent,
          direction = new THREE.Vector3(Math.cos(a), .3 + .13*(f%4), Math.sin(a)).normalize(),
          tip = base.clone().addScaledVector(direction,length),
          normal = new THREE.Vector3(-Math.sin(a),0,Math.cos(a)),
          cross = direction.clone().cross(normal), radius = detail === 0 ? .002 : .0015,
          out = needles[(f+n)%3];
        for(let side=0;side<3;side++) {
          const ring = (j:number) => base.clone().addScaledVector(normal,Math.cos(j*Math.PI*2/3)*radius)
            .addScaledVector(cross,Math.sin(j*Math.PI*2/3)*radius).toArray();
          out.push(...ring(side),...ring(side+1),...tip.toArray());
        }
        needleInk.push(...base.toArray(),...tip.toArray());
      }
    }
  };
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
  if (old && detail > 0) {
    // Broken bark plates and scar hollows follow the trunk instead of a smooth cone.
    for(let j=0;j<(detail===2?44:15);j++) {
      const t=.06+(j%13)*.052, center=trunk.getPoint(t), a=j*2.399+seed;
      const rr=radius*(.16+.84*Math.pow(1-t,1.35));
      const scar=solid(g,new THREE.IcosahedronGeometry(1,0),j%3===0?edge:board,
        [center.x+Math.cos(a)*rr,center.y,center.z+Math.sin(a)*rr]);
      scar.scale.set(.018+(j%3)*.008,.04+(j%4)*.012,.014);
      scar.rotation.y=-a;
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
          pineSpray(tip, angle, .85);
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
          pineSpray(e, a + q * 2, .85);
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
      pineSpray(end, a);
    }
  });
  needles.forEach((positions, i) => {
    if (positions.length) surface(g, positions, pineGlazes[i]).name = "pine-needle-fascicles";
  });
  if (needleInk.length) {
    const strokes = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute(
      "position", new THREE.Float32BufferAttribute(needleInk, 3)), pineInk);
    strokes.name = "fine-pine-needle-strokes"; g.add(strokes);
  }
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
  if (foliage !== "full") g.userData.foliage = foliage;
  g.userData.branchBounds = curves.map((c) => c.curve.getPoint(1).toArray());
  return g;
}

export {buildReferenceBoat, type BoatStyle, type BoatVariant} from "./referenceVessels";

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
        h * 0.88,
        depth * 0.23,
        [x - side * 0.15, h * 0.44, 0],
        recess,
      );
      for (const z of [-depth * 0.12, depth * 0.12])
        rod(g, [x * 1.005, 0.04, z], [x * 1.005, h * 0.90, z], 0.018, edge);
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
