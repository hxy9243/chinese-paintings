import * as THREE from "three";
import { REFERENCE_AZIMUTH, scrollPoint } from "./scrollLayout";
import {
  paintMaterial,
  paintingAmount,
  createDryInk,
  brushEdges,
} from "./paintMaterial";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// A shallow, camera-constrained diorama. Hidden façades are intentionally plain.
// The original passage runs from the near lower-left approach to the far upper-right.
export const VIEW_ANGLE = REFERENCE_AZIMUTH;
export const TILT_LIMIT = 12;
export const ELEVATION = Math.PI / 3.1;
const ink = createDryInk();
const riverInk = createDryInk(0.38);
const mat = paintMaterial;
const wood = mat(0x9f814f),
  dark = mat(0x514a3b),
  plaster = mat(0xc8b486),
  roof = mat(0x786746);
const linen = mat(0xc7b991),
  green = mat(0x858167),
  pale = mat(0xa49e7e);
function mesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  outline = true,
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  parent.add(m);
  if (outline) m.add(new THREE.LineSegments(brushEdges(geo), ink));
  return m;
}
function box(
  p: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  m = wood,
) {
  return mesh(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);
}
function beam(
  p: THREE.Object3D,
  a: number[],
  b: number[],
  r = 0.035,
  m = wood,
) {
  const from = new THREE.Vector3(...a),
    to = new THREE.Vector3(...b),
    delta = to.clone().sub(from);
  const obj = mesh(
    p,
    new THREE.CylinderGeometry(r * 0.8, r, delta.length(), 5),
    m,
    ...from.clone().add(to).multiplyScalar(0.5).toArray(),
  );
  obj.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  return obj;
}
function tree(parent: THREE.Object3D, x: number, z: number, leafy: boolean) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.set(x, 0.14, z);
  beam(g, [0, 0, 0], [0.12, 1.3, 0], 0.1);
  beam(g, [0.12, 1.3, 0], [-0.18, 2.4, 0.03], 0.057);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4,
      y = 1 + i * 0.19,
      end = [Math.cos(a) * (0.55 + i * 0.035), y + 0.55, Math.sin(a) * 0.53];
    beam(g, [0.06, y, 0], end, 0.04);
    beam(g, end, [end[0] * 1.4, end[1] + 0.32, end[2] * 1.3], 0.018);
    for (let twig = 0; twig < 7; twig++) {
      const tip = [
        end[0] * 1.35 + Math.sin(twig * 2.4) * 0.27,
        end[1] + 0.18 + twig * 0.075,
        end[2] * 1.35 + Math.cos(twig * 2.4) * 0.27,
      ];
      beam(g, end, tip, 0.008, dark);
    }
    if (leafy) {
      const cloud = new THREE.Shape();
      const radius = 0.44 + (i % 3) * 0.1;
      for (let j = 0; j <= 64; j++) {
        const angle = (j / 64) * Math.PI * 2;
        const r =
          radius * (1 + 0.13 * Math.sin(j * 1.8) + 0.07 * Math.sin(j * 3.1));
        const px = Math.cos(angle) * r,
          py = Math.sin(angle) * r * 0.8;
        if (j === 0) cloud.moveTo(px, py);
        else cloud.lineTo(px, py);
      }
      const canopy = mesh(
        g,
        new THREE.ShapeGeometry(cloud),
        i % 2 ? green : pale,
        ...(end as [number, number, number]),
        false,
      );
      canopy.rotation.y = VIEW_ANGLE;
      // Individually drawn leaf dabs break the geometric silhouette.
      for (let j = 0; j < 28; j++) {
        const a = j * 2.399,
          r = Math.sqrt(j / 28) * radius;
        const leaf = new THREE.Shape();
        leaf.moveTo(-0.035, 0);
        leaf.quadraticCurveTo(0, 0.065, 0.045, 0);
        leaf.quadraticCurveTo(0, -0.035, -0.035, 0);
        const dab = mesh(
          g,
          new THREE.ShapeGeometry(leaf),
          j % 3 ? green : dark,
          end[0] + Math.cos(a) * r,
          end[1] + Math.sin(a) * r * 0.75,
          end[2] + 0.035 + j * 0.001,
          false,
        );
        dab.rotation.y = VIEW_ANGLE;
        dab.rotation.z = a;
      }
    }
  }
}
function boat(parent: THREE.Object3D, x: number, z: number, cargo: boolean) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.set(x, 0.09, z);
  g.rotation.y = -0.15;
  const shape = new THREE.Shape();
  shape.moveTo(-0.48, -1.3);
  shape.quadraticCurveTo(-0.72, 0, -0.43, 1.22);
  shape.lineTo(0, 1.55);
  shape.lineTo(0.43, 1.22);
  shape.quadraticCurveTo(0.72, 0, 0.48, -1.3);
  shape.lineTo(0, -1.55);
  shape.closePath();
  const hull = mesh(
    g,
    new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }),
    wood,
  );
  hull.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 9; i++)
    box(g, 0.92, 0.025, 0.035, 0, 0.27, -1 + i * 0.25, dark);
  if (cargo) {
    const canopy = mesh(
      g,
      new THREE.CylinderGeometry(0.49, 0.49, 1.45, 12, 1, true, 0, Math.PI),
      linen,
      0,
      0.28,
      0,
    );
    canopy.rotation.x = Math.PI / 2;
    for (let i = 0; i < 7; i++) {
      const pts = [];
      for (let j = 0; j <= 18; j++)
        pts.push(
          new THREE.Vector3(
            Math.cos((j * Math.PI) / 18) * 0.5,
            0.28 + Math.sin((j * Math.PI) / 18) * 0.5,
            -0.7 + i * 0.23,
          ),
        );
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ink));
    }
  }
  beam(g, [0.3, 0.32, -0.7], [1.05, 0.1, -1.8], 0.022, dark);
}
function stall(parent: THREE.Object3D, x: number, z: number, covered: boolean) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.set(x, 0.14, z);
  box(g, 1.3, 0.1, 0.7, 0, 0.62, 0);
  for (const a of [-0.53, 0.53])
    for (const b of [-0.24, 0.24]) box(g, 0.05, 0.63, 0.05, a, 0.3, b);
  for (let i = 0; i < 5; i++)
    mesh(
      g,
      new THREE.SphereGeometry(0.095, 6, 4),
      i % 2 ? green : linen,
      -0.43 + i * 0.21,
      0.75,
      0.04,
    );
  if (covered) {
    for (const a of [-0.62, 0.62])
      for (const b of [-0.3, 0.3]) box(g, 0.035, 1.45, 0.035, a, 0.72, b);
    const canopy = box(g, 1.5, 0.06, 1, 0, 1.47, 0, linen);
    canopy.rotation.z = 0.05;
    box(g, 1.5, 0.18, 0.04, 0, 1.36, 0.47, linen);
  }
}
// Batch the static model: details should not require hundreds of draw calls.
function batchStatic(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const batches = new Map<
    THREE.Material,
    { geometries: THREE.BufferGeometry[]; lines: boolean }
  >();
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh || obj instanceof THREE.Line)) return;
    const material = obj.material as THREE.Material;
    let geometry = obj.geometry.clone();
    if (obj instanceof THREE.Line && !(obj instanceof THREE.LineSegments)) {
      const source = geometry.getAttribute("position"),
        positions: number[] = [];
      for (let i = 0; i < source.count - 1; i++)
        for (const index of [i, i + 1])
          positions.push(
            source.getX(index),
            source.getY(index),
            source.getZ(index),
          );
      geometry.dispose();
      geometry = new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
    }
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flat;
    }
    geometry.applyMatrix4(obj.matrixWorld);
    geometry.deleteAttribute("uv");
    const batch = batches.get(material) ?? {
      geometries: [],
      lines: obj instanceof THREE.Line,
    };
    batch.geometries.push(geometry);
    batches.set(material, batch);
  });
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line)
      obj.geometry.dispose();
  });
  group.clear();
  batches.forEach(({ geometries, lines }, material) => {
    const merged = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    if (merged)
      group.add(
        lines
          ? new THREE.LineSegments(merged, material)
          : new THREE.Mesh(merged, material),
      );
  });
}
function person(parent: THREE.Object3D, variant: number) {
  const g = new THREE.Group();
  parent.add(g);
  const robe = [dark, linen, green][variant % 3];
  mesh(g, new THREE.CylinderGeometry(0.065, 0.115, 0.33, 6), robe, 0, 0.245, 0);
  mesh(g, new THREE.SphereGeometry(0.064, 7, 5), wood, 0, 0.46, 0);
  if (variant % 3 === 0)
    mesh(g, new THREE.ConeGeometry(0.15, 0.065, 10), linen, 0, 0.53, 0);
  else box(g, 0.13, 0.05, 0.12, 0, 0.515, 0, dark);
  beam(g, [-0.045, 0.12, 0], [-0.055, 0.02, 0.025], 0.02, dark);
  beam(g, [0.045, 0.12, 0], [0.06, 0.02, -0.025], 0.02, dark);
  beam(g, [-0.06, 0.36, 0], [-0.12, 0.24, 0.04], 0.029, robe);
  beam(g, [0.06, 0.36, 0], [0.12, 0.24, 0.04], 0.029, robe);
  if (variant % 4 === 0) {
    beam(g, [-0.3, 0.39, 0], [0.3, 0.39, 0], 0.014, dark);
    for (const side of [-1, 1]) {
      beam(g, [side * 0.27, 0.39, 0], [side * 0.27, 0.14, 0], 0.009, dark);
      mesh(
        g,
        new THREE.CylinderGeometry(0.08, 0.055, 0.12, 8),
        linen,
        side * 0.27,
        0.13,
        0,
      );
    }
  }
  return g;
}
function parasol(parent: THREE.Object3D, x: number, z: number) {
  beam(parent, [x, 0.08, z], [x, 1.15, z], 0.024, dark);
  mesh(parent, new THREE.ConeGeometry(0.62, 0.19, 16), linen, x, 1.18, z);
  for (let j = 0; j < 12; j++) {
    const a = (j * Math.PI) / 6;
    beam(
      parent,
      [x, 1.28, z],
      [x + Math.cos(a) * 0.61, 1.09, z + Math.sin(a) * 0.61],
      0.007,
      dark,
    );
  }
}
// Authored in the horizontal/depth basis of the supplied crop, not repeated districts.
function bank(parent: THREE.Group, outline: number[][]) {
  const shape = new THREE.Shape();
  outline.forEach(([x, z], i) => {
    const p = scrollPoint(x, z);
    if (i === 0) shape.moveTo(p.x, -p.z);
    else shape.lineTo(p.x, -p.z);
  });
  shape.closePath();
  const ground = mesh(
    parent,
    new THREE.ShapeGeometry(shape),
    mat(0xb09a6d, true),
    0,
    0.015,
    0,
    false,
  );
  ground.rotation.x = -Math.PI / 2;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    if (
      (Math.abs(a[0]) >= 21 && Math.abs(b[0]) >= 21) ||
      Math.abs(a[1]) >= 12 ||
      Math.abs(b[1]) >= 12
    )
      continue;
    const pts = [];
    for (let j = 0; j <= 16; j++) {
      const t = j / 16,
        p = scrollPoint(
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t + Math.sin(j * 2.4) * 0.035,
        );
      p.y = 0.032;
      pts.push(p);
    }
    parent.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ink),
    );
  }
}
function hall(
  parent: THREE.Group,
  s: number,
  d: number,
  w: number,
  depth: number,
  h: number,
  turn = 0,
) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.copy(scrollPoint(s, d));
  g.position.y = 0.06;
  g.rotation.y = turn;
  box(g, w, h, depth, 0, h / 2, 0, plaster);
  // Hipped tile roof: short ridge, broad roof planes, triangular hip ends.
  const e = w / 2 + 0.2,
    f = depth / 2 + 0.23,
    r = w * 0.29,
    y = h + 0.1,
    top = h + 0.72;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-e, y, -f, e, y, -f, e, y, f, -e, y, f, -r, top, 0, r, top, 0],
      3,
    ),
  );
  geo.setIndex([0, 4, 5, 0, 5, 1, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2]);
  geo.computeVertexNormals();
  mesh(g, geo, roof);
  for (let i = 0; i <= Math.ceil(w * 12); i++) {
    const x = -e + (2 * e * i) / Math.ceil(w * 12),
      rx = THREE.MathUtils.clamp(x, -r, r);
    for (const side of [-1, 1])
      beam(g, [rx, top + 0.008, 0], [x, y + 0.01, side * f], 0.006, dark);
  }
  for (let row = 1; row < 8; row++) {
    const t = row / 8,
      half = r + (e - r) * t;
    for (const side of [-1, 1])
      beam(
        g,
        [-half, top - (top - y) * t + 0.01, side * f * t],
        [half, top - (top - y) * t + 0.01, side * f * t],
        0.005,
        dark,
      );
  }
  beam(g, [-r - 0.06, top + 0.025, 0], [r + 0.06, top + 0.025, 0], 0.027, dark);
  for (let i = 0; i <= Math.ceil(w / 0.6); i++) {
    const x = -w / 2 + (i * w) / Math.ceil(w / 0.6);
    box(g, 0.037, h, 0.035, x, h / 2, depth / 2 + 0.018, dark);
    if (i < Math.ceil(w / 0.6))
      box(
        g,
        0.32,
        h * 0.45,
        0.035,
        x + 0.22,
        h * 0.54,
        depth / 2 + 0.022,
        wood,
      );
  }
  for (const side of [-1, 1])
    for (let z = -depth / 2; z <= depth / 2; z += 0.5)
      box(g, 0.035, h, 0.032, (side * w) / 2, h / 2, z, dark);
  box(g, w, 0.032, 0.035, 0, h * 0.28, depth / 2 + 0.04, dark);
  return g;
}
function workingBoat(
  parent: THREE.Group,
  s: number,
  d: number,
  length: number,
  width: number,
  cabin: boolean,
  turn: number,
) {
  const g = new THREE.Group();
  g.position.copy(scrollPoint(s, d));
  g.rotation.y = turn;
  parent.add(g);
  boat(g, 0, 0, !cabin);
  const hull = g.children[0];
  hull.scale.set(width / 1.1, 0.85, length / 3.1);
  if (cabin) {
    box(g, width * 0.8, 0.45, length * 0.47, 0, 0.5, 0, plaster);
    box(g, width * 0.98, 0.07, length * 0.57, 0, 0.77, 0, roof);
    for (let z = -length * 0.22; z < length * 0.23; z += 0.32)
      for (const side of [-1, 1])
        box(g, 0.02, 0.24, 0.18, side * width * 0.405, 0.53, z, dark);
    beam(g, [0, 0.34, -length * 0.31], [0, 1.85, -length * 0.31], 0.025, dark);
    beam(
      g,
      [-width * 0.45, 0.85, -length * 0.31],
      [width * 0.45, 0.85, -length * 0.31],
      0.02,
      dark,
    );
  }
  for (const side of [-1, 1]) {
    const crew = person(g, side + 2);
    crew.scale.setScalar(0.65);
    crew.position.set(0, 0.34, side * length * 0.34);
  }
  return g;
}
export function createBridgeStudy() {
  const group = new THREE.Group();
  const water = new THREE.Group();
  group.add(water);
  water.rotation.y = REFERENCE_AZIMUTH;
  const river = mesh(
    water,
    new THREE.PlaneGeometry(44, 27),
    mat(0xcfbd8e, true),
    0,
    -0.04,
    0,
    false,
  );
  river.rotation.x = -Math.PI / 2;
  bank(group, [
    [-22, -13],
    [22, -13],
    [22, -3.4],
    [17, -4.2],
    [11, -5],
    [5, -5.5],
    [-3.6, -5.8],
    [-7, -6.8],
    [-13, -6.8],
    [-22, -5.8],
  ]);
  bank(group, [
    [-22, -1.5],
    [-16, 0.1],
    [-11, 1.8],
    [-8.4, -0.2],
    [-6.5, 2.5],
    [-3, 4],
    [0, 4],
    [4, 1.5],
    [7, 0.7],
    [10, 3],
    [16, 5.4],
    [22, 6],
    [22, 14],
    [-22, 14],
  ]);
  // Quiet water strokes follow the broad bend rather than a straight channel.
  for (let i = 0; i < 180; i++) {
    const p = scrollPoint(-21 + ((i * 0.731) % 42), -3.9 + ((i * 0.417) % 7));
    const q = p.clone().add(scrollPoint(0.25 + (i % 3) * 0.14, 0.03));
    p.y = q.y = -0.02;
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([p, q]),
        riverInk,
      ),
    );
  }
  const bridge = new THREE.Group();
  bridge.position.copy(scrollPoint(-6, -3));
  group.add(bridge);
  const height = (x: number) =>
    0.15 + 1.65 * Math.cos(((x / 3.65) * Math.PI) / 2);
  for (let i = 0; i < 40; i++) {
    const x = -3.65 + ((i + 0.5) * 7.3) / 40,
      dx = 7.3 / 40;
    const plank = box(bridge, dx + 0.008, 0.1, 1.35, x, height(x), 0);
    plank.rotation.z = Math.atan2(height(x + dx / 2) - height(x - dx / 2), dx);
  }
  for (const z of [-0.62, 0.62]) {
    for (let i = 0; i < 14; i++) {
      const a = -3.65 + (i * 7.3) / 14,
        b = -3.65 + ((i + 1) * 7.3) / 14;
      beam(bridge, [a, height(a) - 0.2, z], [b, height(b) - 0.2, z], 0.075);
      beam(bridge, [a, height(a), z], [a, height(a) + 0.5, z], 0.035);
      beam(bridge, [a, height(a) + 0.5, z], [b, height(b) + 0.5, z], 0.035);
      beam(bridge, [a, height(a) + 0.26, z], [b, height(b) + 0.26, z], 0.025);
      if (i < 13)
        beam(bridge, [a, height(a) - 0.4, z], [b, height(b) - 0.08, z], 0.055);
    }
  }
  // Far-bank warehouses, low riverfront shop rows, and the larger eastern compound.
  hall(group, -18, -8.8, 4.4, 2.1, 0.85, 0.12);
  hall(group, -13.3, -8.9, 3.8, 2.6, 1.05, -0.15);
  hall(group, -8.7, -9.5, 3, 2.2, 0.95, 0.04);
  hall(group, -1.5, -9, 4.5, 2.7, 1.2, -0.05);
  hall(group, 4, -8.5, 3.3, 2.3, 1.0, 0.1);
  hall(group, 10.3, -8.1, 5.4, 3.1, 1.25, 0.06);
  hall(group, 16.9, -7, 5.1, 2.9, 1.0, -0.13);
  // The broad foreground roof masses are deliberately much larger than a person.
  hall(group, -17.5, 7.2, 4.8, 3.8, 1.15, 0.22);
  hall(group, -9.6, 10.5, 5.9, 4.2, 1.45, -0.16);
  hall(group, -3.3, 10.3, 5.4, 3.6, 1.25, 0.08);
  hall(group, 2.6, 10, 4.1, 3.8, 1.2, -0.12);
  hall(group, -1, 6.8, 3.1, 2.1, 0.8, 0.1);
  const shoreShops = [
    [-17, -5.9],
    [-13, -5.8],
    [-0.9, -6.1],
    [3.2, -5.6],
  ];
  shoreShops.forEach(([s, d], i) =>
    hall(group, s, d, 2.7, 1.3, 0.6, (i % 2 ? 1 : -1) * 0.08),
  );
  for (const [s, d] of [
    [-19, 3],
    [-16, 5],
    [-2, -10],
    [6, -9],
    [8, 2.1],
    [10.2, 4],
    [6, 3.2],
    [3.5, 4.8],
    [12, 5.7],
    [18, -9],
  ]) {
    const p = scrollPoint(s, d);
    tree(group, p.x, p.z, false);
  }
  const market = [
    [-10, 0.9],
    [-11.9, 2.1],
    [-9, 3.1],
    [-8.3, 4.5],
    [-6.5, 5.5],
    [-12.8, 4.2],
    [-5, -5.9],
    [-3.8, -6.5],
  ];
  market.forEach(([s, d], i) => {
    const p = scrollPoint(s, d);
    stall(group, p.x, p.z, i % 3 === 0);
    if (i % 2 === 0) parasol(group, p.x + 0.4, p.z + 0.3);
  });
  workingBoat(
    group,
    16,
    -0.3,
    7.2,
    1.6,
    true,
    REFERENCE_AZIMUTH + Math.PI / 2 + 0.2,
  );
  workingBoat(
    group,
    -6.8,
    -3.1,
    5.4,
    1.1,
    false,
    REFERENCE_AZIMUTH + Math.PI / 2,
  );
  workingBoat(
    group,
    -16,
    -3.8,
    5.1,
    1.0,
    true,
    REFERENCE_AZIMUTH + Math.PI / 2 - 0.1,
  );
  workingBoat(
    group,
    9.8,
    5.4,
    4.9,
    1.0,
    false,
    REFERENCE_AZIMUTH + Math.PI / 2 + 0.2,
  );
  workingBoat(
    group,
    1,
    1.6,
    3.5,
    0.75,
    false,
    REFERENCE_AZIMUTH + Math.PI / 2 - 0.25,
  );
  for (let i = 0; i < 50; i++) {
    const onApproach = i < 34;
    const s = onApproach
      ? -12 + (i % 5) * 0.72 + Math.floor(i / 5) * 0.33
      : -19 + (i - 34) * 2.4;
    const d = onApproach ? 1 + Math.floor(i / 5) * 0.78 : -6.8;
    const p = person(group, i);
    p.scale.setScalar(0.65);
    p.position.copy(scrollPoint(s, d));
    p.position.y = 0.055;
    p.rotation.y = i * 1.7;
  }
  for (let i = 0; i < 12; i++) {
    const x = -3.3 + i * 0.59,
      p = person(bridge, i);
    p.scale.setScalar(0.65);
    p.position.set(x, height(x) + 0.08, i % 2 ? 0.42 : -0.42);
  }
  batchStatic(group);
  const bridgeOrigin = scrollPoint(-6, -3);
  const people = Array.from({ length: 8 }, (_, i) => {
    const p = person(group, i);
    batchStatic(p);
    p.scale.setScalar(0.65);
    return p;
  });
  return {
    group,
    setPainting(enabled: boolean) {
      paintingAmount.value = enabled ? 1 : 0;
    },
    update(time: number) {
      people.forEach((p, i) => {
        const phase = (time * 0.018 + i * 0.173) % 2,
          travel = phase < 1 ? phase : 2 - phase;
        if (i < 4) {
          const x = -3.5 + travel * 7;
          p.position
            .copy(bridgeOrigin)
            .add(new THREE.Vector3(x, height(x) + 0.085, i % 2 ? 0.18 : -0.18));
          p.rotation.y = phase < 1 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          p.position.copy(
            scrollPoint(-10.2 + travel * 2.4, 1.2 + (i - 4) * 0.65),
          );
          p.position.y = 0.06;
          p.rotation.y =
            REFERENCE_AZIMUTH + (phase < 1 ? Math.PI / 2 : -Math.PI / 2);
        }
      });
    },
  };
}
