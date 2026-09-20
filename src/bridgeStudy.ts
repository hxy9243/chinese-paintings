import * as THREE from "three";
import {
  paintMaterial,
  paintingAmount,
  createDryInk,
  brushEdges,
} from "./paintMaterial";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// A shallow, camera-constrained diorama. Hidden façades are intentionally plain.
// The original passage runs from the near lower-left approach to the far upper-right.
export const VIEW_ANGLE = THREE.MathUtils.degToRad(-50);
export const TILT_LIMIT = 12;
export const ELEVATION = Math.PI / 3.1;
const ink = createDryInk();
const mat = paintMaterial;
const wood = mat(0xa18a61),
  dark = mat(0x514a3b),
  plaster = mat(0xded2af),
  roof = mat(0x827965);
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
function building(
  parent: THREE.Object3D,
  x: number,
  z: number,
  scale = 1,
  turn = 0,
) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.set(x, 0.14, z);
  g.scale.setScalar(scale);
  g.rotation.y = turn;
  box(g, 2, 1.15, 1.6, 0, 0.575, 0, plaster);
  [-0.85, 0, 0.85].forEach((a) => box(g, 0.065, 1.4, 0.065, a, 0.7, 1.02));
  box(g, 2, 0.09, 0.09, 0, 1.32, 1.02);
  box(g, 1.8, 0.4, 0.38, 0, 0.3, 0.94);
  // Timber framing and open shop bays, visible at the reference-facing angle.
  for (const a of [-0.94, -0.32, 0.32, 0.94])
    box(g, 0.045, 1.1, 0.035, a, 0.57, 0.82, dark);
  for (const y of [0.18, 0.45, 0.98])
    box(g, 1.88, 0.025, 0.035, 0, y, 0.84, wood);
  for (let i = 0; i < 8; i++)
    box(g, 0.025, 0.55, 0.02, -0.87 + i * 0.095, 0.57, 0.85, dark);
  // Paired pitched roof planes and raised eaves, with repeated ink tile seams.
  for (const side of [-1, 1]) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          -1.24,
          1.97,
          0,
          1.24,
          1.97,
          0,
          1.24,
          1.28,
          side * 1.17,
          -1.24,
          1.28,
          side * 1.17,
        ],
        3,
      ),
    );
    geom.setIndex(side === 1 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
    geom.computeVertexNormals();
    mesh(g, geom, roof);
    for (let i = 0; i <= 22; i++) {
      const a = -1.24 + (i * 2.48) / 22;
      beam(g, [a, 1.98, 0], [a, 1.29, side * 1.17], 0.008, dark);
    }
    for (let row = 1; row < 7; row++) {
      const t = row / 7;
      beam(
        g,
        [-1.23, 1.98 - 0.69 * t, side * 1.17 * t],
        [1.23, 1.98 - 0.69 * t, side * 1.17 * t],
        0.007,
        dark,
      );
    }
    beam(g, [-1.28, 1.32, side * 1.18], [1.28, 1.32, side * 1.18], 0.035);
  }
  beam(g, [-1.3, 2, 0], [1.3, 2, 0], 0.045, dark);
  box(g, 0.35, 0.45, 0.03, 0.62, 0.85, 0.816, dark);
  for (let i = 0; i < 4; i++)
    box(g, 0.014, 0.42, 0.018, 0.49 + i * 0.085, 0.85, 0.845, linen);
  box(g, 0.25, 0.48, 0.05, -0.72, 1.12, 1.08, linen);
  for (let i = 0; i < 3; i++)
    box(g, 0.11, 0.014, 0.018, -0.72, 1.24 - i * 0.09, 1.12, dark);
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
    for (let twig = 0; twig < 3; twig++) {
      const tip = [
        end[0] * (1.3 + twig * 0.12),
        end[1] + 0.27 + twig * 0.14,
        end[2] * (1.25 + twig * 0.15),
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
    if (!(obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments))
      return;
    const material = obj.material as THREE.Material;
    let geometry = obj.geometry.clone();
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flat;
    }
    geometry.applyMatrix4(obj.matrixWorld);
    geometry.deleteAttribute("uv");
    const batch = batches.get(material) ?? {
      geometries: [],
      lines: obj instanceof THREE.LineSegments,
    };
    batch.geometries.push(geometry);
    batches.set(material, batch);
  });
  const retained: THREE.Line[] = [];
  group.traverse((obj) => {
    if (obj instanceof THREE.Line && !(obj instanceof THREE.LineSegments)) {
      const geometry = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
      retained.push(new THREE.Line(geometry, obj.material));
      obj.geometry.dispose();
    }
  });
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments)
      obj.geometry.dispose();
  });
  group.clear();
  retained.forEach((obj) => group.add(obj));
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
export function createBridgeStudy() {
  const group = new THREE.Group();
  const river = mesh(
    group,
    new THREE.PlaneGeometry(17, 11.5),
    mat(0xc4bea7, true),
    0,
    -0.03,
    0,
    false,
  );
  river.rotation.x = -Math.PI / 2;
  for (const side of [-1, 1]) {
    const bank = new THREE.Shape();
    bank.moveTo(side * 8.5, -5.7);
    bank.lineTo(side * 2.75, -5.7);
    for (let j = 0; j <= 30; j++) {
      const z = -5.7 + (j * 11.4) / 30;
      bank.lineTo(
        side * (2.75 + 0.22 * Math.sin(z * 1.3) + 0.08 * Math.cos(z * 3)),
        z,
      );
    }
    bank.lineTo(side * 8.5, 5.7);
    bank.closePath();
    const land = mesh(
      group,
      new THREE.ShapeGeometry(bank),
      mat(0xd6c6a1, true),
      0,
      0.06,
      0,
      false,
    );
    land.rotation.x = -Math.PI / 2;
    const pts = [];
    for (let j = 0; j <= 60; j++) {
      const z = -5.4 + (j * 10.8) / 60;
      pts.push(
        new THREE.Vector3(
          side * (2.75 + 0.22 * Math.sin(-z * 1.3) + 0.08 * Math.cos(z * 3)),
          0.065,
          z,
        ),
      );
    }
    group.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ink),
    );
  }
  // River strokes are deliberate ink marks rather than a glossy water shader.
  for (let i = 0; i < 65; i++) {
    const x = Math.sin(i * 7.9) * 2.3,
      z = Math.cos(i * 3.83) * 5.45;
    const points = [
      new THREE.Vector3(x, 0.001, z),
      new THREE.Vector3(x + 0.12, 0.001, z + 0.2),
      new THREE.Vector3(x + 0.09, 0.001, z + 0.45),
    ];
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: 0x798e80,
          transparent: true,
          opacity: 0.3,
        }),
      ),
    );
  }
  const height = (x: number) =>
    0.15 + 1.65 * Math.cos(((x / 3.65) * Math.PI) / 2);
  for (let i = 0; i < 40; i++) {
    const x = -3.65 + ((i + 0.5) * 7.3) / 40,
      dx = 7.3 / 40;
    const plank = box(group, dx + 0.008, 0.1, 1.35, x, height(x), 0);
    plank.rotation.z = Math.atan2(height(x + dx / 2) - height(x - dx / 2), dx);
  }
  for (const z of [-0.62, 0.62]) {
    for (let i = 0; i < 14; i++) {
      const a = -3.65 + (i * 7.3) / 14,
        b = -3.65 + ((i + 1) * 7.3) / 14;
      beam(group, [a, height(a) - 0.2, z], [b, height(b) - 0.2, z], 0.075);
      beam(group, [a, height(a), z], [a, height(a) + 0.5, z], 0.035);
      beam(group, [a, height(a) + 0.5, z], [b, height(b) + 0.5, z], 0.035);
      beam(group, [a, height(a) + 0.26, z], [b, height(b) + 0.26, z], 0.025);
      if (i < 13)
        beam(group, [a, height(a) - 0.4, z], [b, height(b) - 0.08, z], 0.055);
    }
  }
  // Far-bank shops and near-bank roof masses frame the bridge without covering it.
  building(group, -6.8, -3.7, 1.05);
  building(group, -4.4, -3.7, 0.82);
  building(group, 4.6, -3.8, 0.9);
  building(group, 6.8, -3.5, 1.05);
  building(group, -6.8, 3.6, 0.85);
  building(group, 6.5, 3.6, 1.12);
  building(group, 4.3, 4.3, 0.72);
  for (const [x, z, leafy] of [
    [-7.8, -1.3, 0],
    [-7.5, 4.7, 0],
    [-3.6, -5, 0],
    [7.7, 1, 0],
    [7.5, 4.8, 1],
    [4.1, -5, 0],
    [-4.2, 4.1, 1],
  ])
    tree(group, x, z, !!leafy);
  for (const [x, z, covered] of [
    [-4.4, 1.45, 1],
    [-5.8, 0.85, 0],
    [-3.65, 3.1, 0],
    [4.15, 1.6, 1],
    [5.65, 0.55, 0],
    [3.6, -1.9, 0],
  ])
    stall(group, x, z, !!covered);
  parasol(group, -4.15, 2.65);
  parasol(group, 4.6, 0.35);
  parasol(group, -5.9, -1.6);
  boat(group, -0.9, 3.5, true);
  boat(group, 1.25, -3.4, false);
  const crowdPositions = [
    [-4.0, 0.8],
    [-4.8, 0.7],
    [-5.4, 1.5],
    [-6.2, 1.6],
    [-3.8, 2.3],
    [-3.45, 3.6],
    [-4.8, -2.25],
    [-6.5, -2.2],
    [-5.7, -1.35],
    [-6.7, 2.6],
    [3.8, 0.85],
    [4.7, 0.9],
    [5.3, 1.5],
    [6.2, 1.25],
    [3.55, -1.3],
    [4.25, -2.35],
    [5.3, -2.0],
    [6.8, -2.1],
    [5.1, 2.65],
    [3.4, 2.8],
  ];
  crowdPositions.forEach(([x, z], i) => {
    const p = person(group, i);
    p.position.set(x, 0.12, z);
    p.rotation.y = i * 1.7;
  });
  for (let i = 0; i < 6; i++) {
    const x = -2.7 + i * 1.05;
    const p = person(group, i + 1);
    p.position.set(x, height(x) + 0.09, i % 2 ? 0.45 : -0.45);
    p.rotation.y = i % 2 ? 0 : Math.PI;
  }
  batchStatic(group);
  const people = Array.from({ length: 8 }, (_, i) => person(group, i));
  return {
    group,
    setPainting(enabled: boolean) {
      paintingAmount.value = enabled ? 1 : 0;
    },
    update(time: number) {
      people.forEach((p, i) => {
        // Ping-pong routes avoid teleporting at either bridge approach.
        const phase = (time * 0.018 + i * 0.173) % 2;
        const travel = phase < 1 ? phase : 2 - phase;
        if (i < 4) {
          const x = -3.55 + travel * 7.1;
          p.position.set(x, height(x) + 0.09, i % 2 ? 0.19 : -0.19);
          p.rotation.y = phase < 1 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          const side = i % 2 ? 1 : -1;
          const z = -1.8 + travel * 3.6;
          p.position.set(side * (i < 6 ? 3.13 : 6.8), 0.12, z);
          p.rotation.y = phase < 1 ? 0 : Math.PI;
        }
      });
    },
  };
}
