import * as THREE from "three";
import { buildCloseFace } from "./faceModels";
import { FIGURE_TYPES } from "./figureTypes";
import { paintMaterial, createDryInk } from "./paintMaterial";
import type { DetailLevel } from "../../../packages/scene-kit/lod";

// Proportions read from the market passage: an adult is about 6.5 heads tall.
// Geometry and garment seams are authored separately; smooth skin is not edged
// as a triangular wire cage. Each LOD retains the same articulation origins.
export const FIGURE_HEIGHT = 0.68;
const skin = paintMaterial(0xbfa17e),
  skinLight = paintMaterial(0xcab28c),
  hair = paintMaterial(0x49443a),
  cloth = paintMaterial(0xc6b992),
  blue = paintMaterial(0x485554),
  russet = paintMaterial(0x716053),
  sage = paintMaterial(0x65705c),
  shoe = paintMaterial(0x5b5548),
  bamboo = paintMaterial(0xa08a5c),
  basketMat = paintMaterial(0xb09b70);
const seam = createDryInk(0.6);
const skinTones = [0xbfa17e, 0xc8aa86, 0xb79773, 0xc5a580].map((c) =>
  paintMaterial(c),
);
type P = [number, number, number];
function solid(
  p: THREE.Object3D,
  g: THREE.BufferGeometry,
  m: THREE.Material,
  at: P = [0, 0, 0],
) {
  const o = new THREE.Mesh(g, m);
  o.position.set(...at);
  p.add(o);
  return o;
}
function oval(p: THREE.Object3D, at: P, size: P, m: THREE.Material, n: number) {
  const o = solid(
    p,
    new THREE.SphereGeometry(1, n, Math.max(3, Math.floor(n * 0.7))),
    m,
    at,
  );
  o.scale.set(...size);
  return o;
}
function stroke(
  p: THREE.Object3D,
  points: P[],
  radius: number,
  m: THREE.Material,
  n = 8,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((a) => new THREE.Vector3(...a)),
  );
  return solid(p, new THREE.TubeGeometry(curve, n, radius, 4, false), m);
}
function line(p: THREE.Object3D, points: P[]) {
  p.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        points.map((a) => new THREE.Vector3(...a)),
      ),
      seam,
    ),
  );
}
function block(p: THREE.Object3D, size: P, at: P, m: THREE.Material) {
  return solid(p, new THREE.BoxGeometry(...size), m, at);
}
// Elliptic cloth sections with irregular vertical folds and a curved centreline.
function garment(
  p: THREE.Object3D,
  rings: number[][],
  n: number,
  m: THREE.Material,
  fold = 0.05,
) {
  const vertices: number[] = [],
    indices: number[] = [];
  rings.forEach(([y, rx, rz, forward = 0], j) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2,
        r =
          1 +
          fold * Math.sin(a * 7 + j * 0.24) +
          fold * 0.4 * Math.cos(a * 11 - j * 0.3);
      vertices.push(Math.cos(a) * rx * r, y, Math.sin(a) * rz * r + forward);
    }
  });
  for (let j = 0; j < rings.length - 1; j++)
    for (let i = 0; i < n; i++) {
      const a = j * n + i,
        b = j * n + ((i + 1) % n),
        c = a + n,
        d = b + n;
      indices.push(a, c, b, b, c, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return solid(p, geo, m);
}
export function buildFigure(
  parent: THREE.Object3D,
  variant: number,
  walking: boolean,
  detail: DetailLevel,
  batch: (g: THREE.Group) => void,
) {
  const profile = FIGURE_TYPES[variant % FIGURE_TYPES.length],
    n = detail === 2 ? 32 : detail === 1 ? 10 : 5;
  const g = new THREE.Group();
  g.userData.figureType = profile.name;
  g.scale.set(profile.width, profile.height, profile.width);
  parent.add(g);
  const skin = skinTones[variant % skinTones.length];
  const robe = [blue, cloth, russet, sage][variant % 4];
  const woman = profile.name === "woman";
  const roundCollar =
    profile.name === "scholar" || profile.name === "attendant";
  const long = ["scholar", "woman", "elder", "attendant"].includes(
      profile.name,
    ),
    porter = profile.name === "porter",
    elder = profile.name === "elder";
  const forward = porter ? 0.026 : elder ? 0.04 : 0;
  const allRings = [
    [long ? 0.092 : 0.24, long ? 0.091 : 0.075, 0.049, 0],
    [0.265, 0.077, 0.052, 0],
    [0.32, 0.059, 0.045, 0.004],
    [0.365, 0.061, 0.046, 0.004],
    [0.425, 0.077, 0.051, forward * 0.5],
    [0.475, 0.081, 0.048, forward],
    [0.508, 0.047, 0.037, forward],
    [0.525, 0.025, 0.025, forward],
  ];
  garment(
    g,
    detail === 0
      ? [allRings[0], allRings[3], allRings[5], allRings[7]]
      : allRings,
    n,
    woman ? cloth : robe,
    detail === 2 ? 0.045 : 0.018,
  );
  if (long && detail > 0) {
    for (let i = 0; i < (detail === 2 ? 9 : 4); i++) {
      const a = (i / (detail === 2 ? 9 : 4)) * Math.PI * 2;
      line(g, [
        [Math.cos(a) * 0.058, 0.33, Math.sin(a) * 0.046],
        [Math.cos(a) * 0.065, 0.23, Math.sin(a) * 0.05],
        [Math.cos(a) * 0.087, 0.1, Math.sin(a) * 0.054],
      ]);
    }
  }
  if (detail > 0) {
    // Right-closing work jackets, round-neck robes and open-front women's coats.
    if (!woman && !roundCollar) {
      stroke(
        g,
        [
          [-0.026, 0.518, 0.026],
          [-0.04, 0.485, 0.049],
          [0.025, 0.411, 0.055],
        ],
        0.008,
        cloth,
      );
      stroke(
        g,
        [
          [0.027, 0.516, 0.025],
          [0.039, 0.485, 0.048],
          [0.017, 0.457, 0.058],
        ],
        0.006,
        cloth,
      );
    }
    if (roundCollar) {
      stroke(
        g,
        Array.from({ length: 17 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return [
            Math.cos(a) * 0.027,
            0.515,
            forward + Math.sin(a) * 0.027,
          ] as P;
        }),
        0.0045,
        cloth,
        16,
      );
    }
    garment(
      g,
      [
        [0.337, 0.062, 0.047, 0.004],
        [0.354, 0.062, 0.047, 0.004],
      ],
      n,
      shoe,
      0,
    );
    block(g, [0.018, 0.021, 0.009], [0.018, 0.346, 0.055], bamboo);
    stroke(
      g,
      [
        [0.034, 0.346, 0.055],
        [0.043, 0.31, 0.058],
        [0.032, 0.286, 0.06],
      ],
      0.004,
      cloth,
    );
    if (detail === 2) {
      if (!woman && !roundCollar) {
        line(g, [
          [-0.019, 0.518, forward + 0.035],
          [-0.038, 0.484, forward + 0.055],
          [0.025, 0.416, forward * 0.5 + 0.061],
        ]);
        line(g, [
          [0.023, 0.517, forward + 0.034],
          [0.037, 0.485, forward + 0.053],
          [0.017, 0.457, forward * 0.7 + 0.062],
        ]);
      }
      line(g, [
        [-0.055, 0.47, forward + 0.047],
        [-0.035, 0.43, forward * 0.5 + 0.06],
        [-0.024, 0.368, 0.058],
      ]);
      // Pen strokes follow compressed folds, seams and the hem, not the mesh grid.
      for (let j = 0; j < 7; j++) {
        const x = (j - 3) * 0.019,
          hem = long ? 0.105 : 0.245;
        line(g, [
          [x * 0.82, 0.331, 0.053],
          [x, 0.29, 0.057],
          [x * 1.13, hem, 0.057 - Math.abs(x) * 0.1],
        ]);
      }
      for (const side of [-1, 1]) {
        line(g, [
          [side * 0.06, 0.419, forward * 0.5 + 0.043],
          [side * 0.047, 0.397, 0.058],
          [side * 0.052, 0.374, 0.05],
        ]);
        line(g, [
          [side * 0.067, 0.306, 0.039],
          [side * 0.07, 0.282, 0.045],
          [side * 0.076, long ? 0.14 : 0.247, 0.039],
        ]);
      }
      line(g, [
        [-0.074, long ? 0.105 : 0.246, 0.034],
        [0, long ? 0.098 : 0.24, 0.061],
        [0.074, long ? 0.105 : 0.246, 0.034],
      ]);
      line(g, [
        [0.064, 0.454, 0.034],
        [0.045, 0.412, 0.05],
        [0.05, 0.371, 0.043],
      ]);
    }
  }
  if (woman && detail > 0) {
    const rings = [
      [0.17, 0.104, 0.066],
      [0.32, 0.077, 0.062],
      [0.43, 0.094, 0.068],
      [0.49, 0.093, 0.064],
      [0.519, 0.041, 0.042],
    ];
    const vertices: number[] = [],
      indices: number[] = [];
    const segments = detail === 2 ? 30 : 12;
    rings.forEach(([y, rx, rz], j) => {
      for (let i = 0; i <= segments; i++) {
        const a = Math.PI / 2 + 0.42 + (i / segments) * (Math.PI * 2 - 0.84);
        const fold = 1 + 0.025 * Math.sin(a * 9 + j * 0.2);
        vertices.push(
          Math.cos(a) * rx * fold,
          y,
          Math.sin(a) * rz * fold + 0.004,
        );
      }
    });
    for (let j = 0; j < rings.length - 1; j++)
      for (let i = 0; i < segments; i++) {
        const a = j * (segments + 1) + i,
          b = a + segments + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const coat = new THREE.BufferGeometry();
    coat.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    coat.setIndex(indices);
    coat.computeVertexNormals();
    solid(g, coat, robe).name = "open-front-beizi";
    for (const side of [-1, 1]) {
      const lapel = rings.map(
        ([y, rx, rz]) =>
          [side * Math.sin(0.42) * rx, y, Math.cos(0.42) * rz + 0.006] as P,
      );
      stroke(g, lapel, 0.0035, cloth, detail === 2 ? 14 : 6);
      line(
        g,
        lapel.map(([x, y, z]) => [x + side * 0.004, y, z + 0.001] as P),
      );
    }
    if (detail === 2)
      for (let i = 0; i < 9; i++) {
        const x = (i - 4) * 0.009;
        line(g, [
          [x, 0.315, 0.057],
          [x * 1.1, 0.21, 0.058],
          [x * 1.6, 0.098, 0.059 - Math.abs(x) * 0.1],
        ]);
      }
  }
  solid(
    g,
    new THREE.CylinderGeometry(
      detail === 2 ? 0.014 : 0.019,
      detail === 2 ? 0.016 : 0.022,
      0.042,
      n,
    ),
    skin,
    [0, 0.533, forward],
  );
  batch(g);
  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, 0.588, forward);
  g.add(head);
  if (detail === 2) {
    buildCloseFace(head, variant, { skin, skinLight, hair, cloth });
  } else {
    oval(head, [0, 0.004, -0.003], [0.036, 0.047, 0.032], skin, n);
    if (detail > 0) {
      oval(head, [0, -0.025, 0.006], [0.024, 0.02, 0.023], skin, n);
      for (const side of [-1, 1])
        oval(
          head,
          [side * 0.036, -0.002, -0.001],
          [0.006, 0.012, 0.005],
          skin,
          n,
        );
      oval(head, [0, 0.029, -0.012], [0.0365, 0.027, 0.03], hair, n);
      oval(head, [0, -0.006, 0.031], [0.005, 0.011, 0.008], skinLight, n);
    }
  }
  if (profile.hat === "straw") {
    solid(
      head,
      new THREE.ConeGeometry(0.092, 0.035, detail === 2 ? 24 : n + 2),
      basketMat,
      [0, 0.057, 0],
    );
    if (detail > 0) {
      stroke(
        head,
        [
          [-0.033, 0.03, 0.002],
          [0, -0.045, 0.039],
          [0.033, 0.03, 0.002],
        ],
        0.0018,
        shoe,
      );
      for (let i = 0; i < (detail === 2 ? 20 : 8); i++) {
        const a = (i / (detail === 2 ? 20 : 8)) * Math.PI * 2;
        line(head, [
          [0, 0.075, 0],
          [Math.cos(a) * 0.088, 0.04, Math.sin(a) * 0.088],
        ]);
      }
    }
  } else if (profile.hat === "tall" || profile.hat === "soft") {
    garment(
      head,
      [
        [0.03, 0.036, 0.031],
        [0.052, 0.04, 0.032],
        [0.091, 0.033, 0.025],
      ],
      n,
      hair,
      0,
    );
    if (detail > 0 && profile.hat === "tall")
      stroke(
        head,
        [
          [-0.105, 0.046, -0.006],
          [-0.04, 0.052, -0.006],
          [0.04, 0.052, -0.006],
          [0.105, 0.046, -0.006],
        ],
        0.005,
        hair,
      );
  } else if (profile.hat === "bun") {
    oval(head, [0, 0.058, -0.008], [0.018, 0.023, 0.019], hair, n);
    if (detail > 0)
      stroke(
        head,
        [
          [-0.035, 0.056, -0.01],
          [0.035, 0.059, -0.01],
        ],
        0.0025,
        bamboo,
      );
  } else if (profile.hat === "wrap") {
    garment(
      head,
      [
        [0.02, 0.037, 0.032],
        [0.035, 0.04, 0.034],
        [0.05, 0.03, 0.028],
      ],
      n,
      cloth,
      0.025,
    );
    if (detail > 0)
      stroke(
        head,
        [
          [0.024, 0.028, -0.026],
          [0.038, 0.0, -0.026],
          [0.027, -0.024, -0.028],
        ],
        0.006,
        cloth,
      );
  } else {
    garment(
      head,
      [
        [0.024, 0.037, 0.032],
        [0.044, 0.038, 0.033],
        [0.059, 0.024, 0.023],
      ],
      n,
      hair,
      0.01,
    );
    if (detail === 2)
      line(head, [
        [-0.036, 0.034, 0.008],
        [0, 0.034, 0.034],
        [0.036, 0.034, 0.008],
      ]);
  }
  batch(head);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.name = side < 0 ? "left-arm" : "right-arm";
    arm.position.set(side * 0.072, 0.478, forward);
    g.add(arm);
    const holding = ["ledger", "scroll", "cup"].includes(profile.load),
      bend = holding ? 0.09 : porter ? 0.035 : 0.015;
    const grip = porter && side > 0;
    const elbow: P = grip
        ? [0.043, -0.06, 0.013]
        : [side * 0.027, -0.086, 0.014],
      wrist: P = grip
        ? [0.106, -0.005, -0.034]
        : [
            side * (holding ? 0.018 : 0.04),
            holding ? -0.09 : -0.159,
            0.035 + bend,
          ];
    stroke(
      arm,
      [[0, 0, 0], [side * 0.018, -0.042, 0.005], elbow],
      detail === 0 ? 0.023 : 0.028,
      robe,
      detail === 2 ? 6 : 3,
    );
    if (detail > 0) {
      oval(arm, elbow, [0.029, 0.033, 0.029], robe, n);
      if (detail === 2)
        line(arm, [
          [side * 0.017, -0.034, 0.031],
          [elbow[0] + 0.008, elbow[1] - 0.012, elbow[2] + 0.026],
        ]);
    }
    arm.rotation.z = porter
      ? side > 0
        ? 0
        : 0.16
      : side * (profile.name === "boatman" ? -0.16 : 0.035);
    batch(arm);
    const forearm = new THREE.Group();
    forearm.name = side < 0 ? "left-forearm" : "right-forearm";
    forearm.position.set(...elbow);
    arm.add(forearm);
    // Lower sleeve and hand keep their authored positions, now hinged at the elbow.
    const lower = new THREE.Group();
    lower.position.set(-elbow[0], -elbow[1], -elbow[2]);
    forearm.add(lower);
    stroke(
      lower,
      [
        elbow,
        [
          (elbow[0] + wrist[0]) * 0.5,
          (elbow[1] + wrist[1]) * 0.5,
          (elbow[2] + wrist[2]) * 0.5,
        ],
        wrist,
      ],
      detail === 0 ? 0.022 : 0.027,
      robe,
      detail === 2 ? 7 : 3,
    );
    if (detail > 0) {
      const end: P = grip
        ? [wrist[0], wrist[1] + 0.013, wrist[2]]
        : [wrist[0], wrist[1] - 0.022, wrist[2] + 0.008];
      stroke(lower, [wrist, end], 0.01, skin, 3);
      oval(lower, end, [0.011, 0.017, 0.007], skin, n);
      if (detail === 2) {
        for (let j = 0; j < 4; j++)
          stroke(
            lower,
            [
              [end[0] + (j - 1.5) * 0.004, end[1] - 0.005, end[2]],
              [end[0] + (j - 1.5) * 0.004, end[1] - 0.018, end[2] + 0.004],
            ],
            0.0018,
            skin,
            3,
          );
        stroke(
          lower,
          [
            [end[0] + side * 0.008, end[1] + 0.006, end[2]],
            [end[0] + side * 0.016, end[1] - 0.003, end[2] + 0.005],
          ],
          0.0025,
          skin,
          3,
        );
        line(lower, [
          [elbow[0] + 0.008, elbow[1] - 0.012, elbow[2] + 0.026],
          [wrist[0] + 0.015, wrist[1] + 0.02, wrist[2] + 0.023],
        ]);
        line(lower, [
          [wrist[0] - 0.024, wrist[1] + 0.009, wrist[2]],
          [wrist[0], wrist[1] + 0.015, wrist[2] + 0.027],
          [wrist[0] + 0.024, wrist[1] + 0.009, wrist[2]],
        ]);
      }
    }
    batch(forearm);
    if (detail > 0 && side > 0 && profile.load === "cup") {
      const cup = new THREE.Group();
      cup.name = "held-cup";
      cup.position.set(
        wrist[0] - elbow[0],
        wrist[1] - 0.022 - elbow[1] + 0.013,
        wrist[2] + 0.008 - elbow[2] + 0.016,
      );
      forearm.add(cup);
      solid(
        cup,
        new THREE.LatheGeometry(
          [
            [0.011, 0],
            [0.031, 0.023],
            [0.033, 0.032],
            [0.029, 0.032],
            [0.01, 0.009],
          ].map((v) => new THREE.Vector2(...v)),
          n,
        ),
        cloth,
      );
      line(
        cup,
        Array.from(
          { length: 17 },
          (_, i) =>
            [
              Math.cos((i / 16) * Math.PI * 2) * 0.032,
              0.032,
              Math.sin((i / 16) * Math.PI * 2) * 0.032,
            ] as P,
        ),
      );
      batch(cup);
    }
    const leg = new THREE.Group();
    leg.name = side < 0 ? "left-leg" : "right-leg";
    leg.position.set(side * 0.039, 0.265, 0);
    g.add(leg);
    if (detail === 0)
      stroke(
        leg,
        [
          [0, 0, 0],
          [0, -0.239, 0.012],
        ],
        0.019,
        shoe,
        2,
      );
    else {
      stroke(
        leg,
        [
          [0, 0, 0],
          [side * 0.005, -0.103, 0.008],
          [side * 0.003, -0.207, 0.003],
        ],
        0.024,
        long ? robe : cloth,
        detail === 2 ? 10 : 4,
      );
      garment(
        leg,
        [
          [-0.178, 0.023, 0.025, 0.002],
          [-0.204, 0.019, 0.023, 0.003],
          [-0.229, 0.017, 0.02, 0.006],
        ],
        n,
        shoe,
        0.04,
      );
      oval(leg, [0, -0.241, 0.025], [0.022, 0.018, 0.043], shoe, n);
      if (detail === 2) {
        line(leg, [
          [-0.019, -0.249, 0.005],
          [0, -0.252, 0.063],
          [0.018, -0.249, 0.015],
        ]);
        line(leg, [
          [0.016, -0.106, 0.02],
          [0.013, -0.145, 0.025],
          [0.014, -0.177, 0.019],
        ]);
      }
    }
    batch(leg);
  }
  if (detail > 0) {
    const gear = new THREE.Group();
    g.add(gear);
    const basket = (x: number, y: number, z: number, r = 0.05, h = 0.085) => {
      garment(
        gear,
        [
          [y - h / 2, r * 0.76, r * 0.76, z],
          [y + h / 2, r, r, z],
        ],
        n,
        basketMat,
        0.015,
      ).position.x = x;
      for (let j = 0; j < (detail === 2 ? 6 : 2); j++) {
        const ring = solid(
          gear,
          new THREE.TorusGeometry(
            r * (0.8 + j * 0.035),
            0.002,
            3,
            detail === 2 ? 20 : 8,
          ),
          shoe,
          [x, y - h / 2 + (j * h) / (detail === 2 ? 5 : 1), z],
        );
        ring.rotation.x = Math.PI / 2;
      }
      if (detail === 2)
        for (let j = 0; j < 14; j++) {
          const a = (j / 14) * Math.PI * 2;
          line(gear, [
            [x + Math.cos(a) * r * 0.76, y - h / 2, z + Math.sin(a) * r * 0.76],
            [x + Math.cos(a) * r, y + h / 2, z + Math.sin(a) * r],
          ]);
        }
    };
    if (profile.load === "baskets") {
      stroke(
        gear,
        [
          [-0.25, 0.463, -0.008],
          [0, 0.5, -0.006],
          [0.25, 0.46, -0.008],
        ],
        0.007,
        bamboo,
      );
      for (const side of [-1, 1]) {
        for (const dz of [-0.026, 0.026])
          stroke(
            gear,
            [
              [side * 0.235, 0.46, 0],
              [side * 0.235, 0.21, dz],
            ],
            0.0025,
            shoe,
            3,
          );
        basket(side * 0.235, 0.18, 0, 0.063, 0.095);
      }
    } else if (profile.load === "basket") {
      basket(0.134, 0.254, 0.038, 0.05);
      stroke(
        gear,
        [
          [0.09, 0.29, 0.038],
          [0.134, 0.351, 0.038],
          [0.178, 0.29, 0.038],
        ],
        0.003,
        bamboo,
      );
    } else if (profile.load === "bundle") {
      oval(gear, [0, 0.367, -0.09], [0.078, 0.097, 0.05], cloth, n);
      stroke(
        gear,
        [
          [-0.05, 0.461, -0.08],
          [-0.056, 0.46, 0.036],
          [0.043, 0.317, 0.052],
        ],
        0.005,
        shoe,
      );
      if (detail === 2)
        for (const x of [-0.035, 0, 0.035])
          stroke(
            gear,
            [
              [x, 0.45, -0.095],
              [x, 0.37, -0.14],
              [x, 0.283, -0.095],
            ],
            0.0025,
            shoe,
          );
    } else if (profile.load === "staff")
      stroke(
        gear,
        [
          [0.14, 0.005, 0.07],
          [0.14, 0.43, 0.07],
          [0.128, 0.47, 0.07],
        ],
        0.005,
        bamboo,
      );
    else if (profile.load === "ledger" || profile.load === "scroll") {
      block(gear, [0.092, 0.012, 0.061], [0, 0.36, 0.14], cloth);
      if (profile.load === "scroll")
        for (const x of [-0.052, 0.052])
          solid(
            gear,
            new THREE.CylinderGeometry(0.012, 0.012, 0.071, n),
            cloth,
            [x, 0.36, 0.14],
          ).rotation.x = Math.PI / 2;
      else if (detail === 2)
        for (let j = 0; j < 4; j++)
          line(gear, [
            [-0.035, 0.367, 0.12 + j * 0.012],
            [0.025, 0.367, 0.12 + j * 0.012],
          ]);
    } else if (profile.load === "tools") {
      block(gear, [0.098, 0.057, 0.056], [0.115, 0.305, 0.01], bamboo);
      stroke(
        gear,
        [
          [0.13, 0.32, 0.01],
          [0.13, 0.41, 0.01],
        ],
        0.004,
        shoe,
      );
      block(gear, [0.044, 0.013, 0.018], [0.13, 0.405, 0.01], shoe);
    }
    batch(gear);
  }
  // Hip pivot lets the upper body bend without tilting or sliding planted feet.
  const upperParts = [...g.children].filter(
    (p) => p.name !== "left-leg" && p.name !== "right-leg",
  );
  const torso = new THREE.Group();
  torso.name = "torso";
  torso.position.y = 0.265;
  g.add(torso);
  for (const part of upperParts) {
    torso.add(part);
    part.position.y -= 0.265;
  }
  g.userData.walking = walking;
  return g;
}
