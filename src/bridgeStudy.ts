import * as THREE from "three";
import { REFERENCE_AZIMUTH, scrollPoint } from "./scrollLayout";
import {
  paintMaterial,
  paintingAmount,
  createDryInk,
  brushEdges,
} from "./paintMaterial";
import {
  bankOutline,
  shoreDepth,
  HALLS,
  BOATS,
  BRIDGE,
  bridgeHeight,
  GROUND_Y,
  PERSON_SCALE,
} from "./passageLayout";
import {
  BUILDING_KINDS,
  NATURE,
  WALKER_COUNT,
  RIPPLE_COUNT,
  boatPose,
  walkPose,
  riverRipple,
  type BuildingKind,
} from "./passageLife";
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
  g.position.set(x, GROUND_Y, z);
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
  return g;
}
function riversideNature(parent: THREE.Group) {
  for (const n of NATURE) {
    const p = scrollPoint(n.s, n.d);
    if (n.kind === "bare" || n.kind === "spring") {
      const t = tree(parent, p.x, p.z, n.kind === "spring");
      t.scale.setScalar(n.size * (n.kind === "spring" ? 0.7 : 0.8));
      continue;
    }
    const g = new THREE.Group();
    g.position.set(p.x, GROUND_Y, p.z);
    g.scale.setScalar(n.size);
    parent.add(g);
    if (n.kind === "rock") {
      const rock = mesh(
        g,
        new THREE.DodecahedronGeometry(0.16, 0),
        pale,
        0,
        0.07,
        0,
      );
      rock.scale.set(1.6, 0.6, 0.9);
    } else if (n.kind === "reed") {
      for (let j = 0; j < 9; j++) {
        const angle = j * 2.4,
          reach = 0.09 + j * 0.007;
        beam(
          g,
          [Math.sin(j) * 0.055, 0, Math.cos(j) * 0.055],
          [
            Math.cos(angle) * reach,
            0.13 + (j % 3) * 0.07,
            Math.sin(angle) * reach,
          ],
          0.005,
          green,
        );
      }
    } else {
      beam(g, [0, 0, 0], [0.12, 1.3, 0], 0.07);
      for (let j = 0; j < 9; j++) {
        const a = j * 2.4,
          x = Math.cos(a) * 0.65,
          z = Math.sin(a) * 0.65;
        beam(g, [0.12, 1.05, 0], [x, 1.5 + (j % 3) * 0.12, z], 0.02);
        for (let strand = 0; strand < 3; strand++) {
          const pts = [];
          for (let k = 0; k <= 9; k++) {
            const t = k / 9;
            pts.push(
              new THREE.Vector3(
                x + Math.cos(a) * t * 0.22 + strand * 0.035,
                1.6 + (j % 3) * 0.12 - t * t * (0.8 + strand * 0.12),
                z + Math.sin(a) * t * 0.23,
              ),
            );
          }
          g.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(pts),
              riverInk,
            ),
          );
          for (let k = 2; k < 9; k += 2) {
            const v = pts[k];
            beam(
              g,
              v.toArray(),
              [v.x + 0.03, v.y - 0.085, v.z + 0.025],
              0.008,
              green,
            );
          }
        }
      }
    }
  }
}
function boat(parent: THREE.Object3D, x: number, z: number, cargo: boolean) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.set(x, 0.09, z);
  g.rotation.y = 0;
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
function stall(
  parent: THREE.Object3D,
  x: number,
  z: number,
  covered: boolean,
  turn = REFERENCE_AZIMUTH,
) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.set(x, GROUND_Y, z);
  g.rotation.y = turn;
  g.scale.setScalar(0.55);
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
  group.updateWorldMatrix(true, true);
  const inverse = group.matrixWorld.clone().invert();
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
    geometry.applyMatrix4(inverse.clone().multiply(obj.matrixWorld));
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
function person(parent: THREE.Object3D, variant: number, walking = false) {
  const g = new THREE.Group();
  parent.add(g);
  const robe = [dark, linen, green][variant % 3];
  mesh(g, new THREE.CylinderGeometry(0.065, 0.115, 0.33, 6), robe, 0, 0.245, 0);
  mesh(g, new THREE.SphereGeometry(0.064, 7, 5), wood, 0, 0.46, 0);
  if (variant % 3 === 0)
    mesh(g, new THREE.ConeGeometry(0.15, 0.065, 10), linen, 0, 0.53, 0);
  else box(g, 0.13, 0.05, 0.12, 0, 0.515, 0, dark);
  if (!walking) {
    beam(g, [-0.045, 0.12, 0], [-0.055, 0.02, 0.025], 0.02, dark);
    beam(g, [0.045, 0.12, 0], [0.06, 0.02, -0.025], 0.02, dark);
  }
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
  if (walking) {
    batchStatic(g);
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.name = side === -1 ? "left-leg" : "right-leg";
      leg.position.set(side * 0.05, 0.13, 0);
      g.add(leg);
      beam(leg, [0, 0, 0], [0, -0.115, 0.025], 0.021, dark);
      batchStatic(leg);
    }
  }
  return g;
}
function parasol(parent: THREE.Object3D, x: number, z: number) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.set(x, GROUND_Y, z);
  g.scale.setScalar(0.7);
  parent = g;
  x = z = 0;
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
    GROUND_Y,
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
  kind: BuildingKind = "dwelling",
) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.copy(scrollPoint(s, d));
  g.position.y = GROUND_Y;
  g.rotation.y = turn;
  if (kind === "courtyard") {
    for (const side of [-1, 1]) {
      const wing = hall(g, 0, 0, w * 0.27, depth * 0.92, h * 0.86);
      wing.position.set(side * w * 0.34, 0, 0);
    }
    const rear = hall(g, 0, 0, w * 0.36, depth * 0.28, h);
    rear.position.set(0, 0, -depth * 0.35);
    for (const side of [-1, 1])
      box(
        g,
        w * 0.1,
        h * 0.36,
        0.1,
        side * w * 0.18,
        h * 0.18,
        depth / 2,
        plaster,
      );
    box(g, w * 0.24, 0.07, 0.34, 0, h * 0.44, depth / 2, roof);
    return g;
  }
  box(g, w, h, depth, 0, h / 2, 0, kind === "warehouse" ? wood : plaster);
  // Hipped tile roof: short ridge, broad roof planes, triangular hip ends.
  const e = w / 2 + 0.2,
    f = depth / 2 + 0.23,
    r = w * (kind === "warehouse" ? 0.48 : 0.29),
    y = h + 0.1,
    top = h + Math.min(0.55, depth * 0.21);
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
  if (kind === "shop") {
    // Deep dark shop bays, counter, and a restrained cloth valance under the eaves.
    for (const x of [-w * 0.3, 0, w * 0.3]) {
      box(g, w * 0.25, h * 0.7, 0.025, x, h * 0.42, depth / 2 + 0.05, dark);
      box(g, w * 0.25, h * 0.23, 0.16, x, h * 0.12, depth / 2 + 0.07, wood);
    }
    const awning = box(g, w * 0.94, 0.035, 0.38, 0, h * 0.83, depth / 2, linen);
    awning.rotation.x = 0.12;
    box(g, w * 0.94, 0.09, 0.025, 0, h * 0.75, depth / 2 + 0.18, linen);
    box(g, 0.14, h * 0.57, 0.035, -w * 0.41, h * 0.65, depth / 2 + 0.09, linen);
  } else if (kind === "gallery") {
    // Recessed upper gallery and a second shallow eave distinguish larger halls.
    box(g, w * 0.88, h * 0.3, 0.025, 0, h * 0.68, depth / 2 + 0.05, dark);
    box(g, w + 0.25, 0.055, depth + 0.28, 0, h * 0.48, 0, roof);
    for (let x = -w * 0.43; x <= w * 0.44; x += 0.22)
      box(g, 0.025, h * 0.22, 0.025, x, h * 0.59, depth / 2 + 0.08, wood);
    for (const y of [h * 0.5, h * 0.69])
      beam(
        g,
        [-w * 0.45, y, depth / 2 + 0.1],
        [w * 0.45, y, depth / 2 + 0.1],
        0.015,
        wood,
      );
  } else if (kind === "warehouse") {
    for (const side of [-1, 1]) {
      box(
        g,
        w * 0.26,
        h * 0.8,
        0.03,
        side * w * 0.2,
        h * 0.4,
        depth / 2 + 0.055,
        dark,
      );
      for (let i = 0; i < 5; i++)
        box(
          g,
          0.035,
          h * 0.78,
          0.035,
          side * w * 0.2 - w * 0.11 + i * w * 0.055,
          h * 0.4,
          depth / 2 + 0.08,
          wood,
        );
    }
  } else {
    for (const x of [-w * 0.27, w * 0.27]) {
      box(g, w * 0.2, h * 0.34, 0.025, x, h * 0.57, depth / 2 + 0.055, dark);
      for (let i = -2; i <= 2; i++)
        box(
          g,
          0.016,
          h * 0.33,
          0.02,
          x + i * w * 0.037,
          h * 0.57,
          depth / 2 + 0.075,
          linen,
        );
      beam(
        g,
        [x - w * 0.1, h * 0.57, depth / 2 + 0.08],
        [x + w * 0.1, h * 0.57, depth / 2 + 0.08],
        0.012,
        linen,
      );
    }
  }
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
    crew.scale.setScalar(PERSON_SCALE);
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
  bank(group, bankOutline("far"));
  bank(group, bankOutline("near"));
  const bridge = new THREE.Group();
  bridge.position.copy(scrollPoint(BRIDGE.center.s, BRIDGE.center.d));
  bridge.rotation.y = REFERENCE_AZIMUTH - BRIDGE.angle;
  group.add(bridge);
  const height = bridgeHeight,
    half = BRIDGE.length / 2;
  // Broad transverse decking seated on five longitudinal timber ribs.
  for (let i = 0; i < 56; i++) {
    const dx = BRIDGE.length / 56,
      x = -half + (i + 0.5) * dx;
    const plank = box(
      bridge,
      dx + 0.008,
      0.09,
      BRIDGE.width,
      x,
      height(x) - 0.045,
      0,
    );
    plank.rotation.z = Math.atan2(height(x + dx / 2) - height(x - dx / 2), dx);
  }
  for (const z of [-0.88, -0.44, 0, 0.44, 0.88]) {
    for (let i = 0; i < 12; i++) {
      const a = -half + (i * BRIDGE.length) / 12,
        b = a + BRIDGE.length / 12;
      beam(bridge, [a, height(a) - 0.2, z], [b, height(b) - 0.2, z], 0.07);
      if (i < 11)
        beam(bridge, [a, height(a) - 0.33, z], [b, height(b) - 0.13, z], 0.045);
    }
  }
  for (let i = 0; i <= 16; i++) {
    const x = -half + (i * BRIDGE.length) / 16;
    beam(
      bridge,
      [x, height(x) - 0.13, -BRIDGE.width / 2],
      [x, height(x) - 0.13, BRIDGE.width / 2],
      0.045,
    );
    for (const z of [-BRIDGE.width / 2, BRIDGE.width / 2]) {
      beam(bridge, [x, height(x), z], [x, height(x) + 0.27, z], 0.021);
      if (i < 16) {
        const next = x + BRIDGE.length / 16;
        for (const rail of [0.14, 0.27])
          beam(
            bridge,
            [x, height(x) + rail, z],
            [next, height(next) + rail, z],
            0.018,
          );
      }
    }
  }
  // Timber bearing sills on dry land at both ends; no piers in the navigable span.
  for (const side of [-1, 1]) {
    box(
      bridge,
      0.6,
      0.22,
      BRIDGE.width + 0.18,
      side * half,
      GROUND_Y - 0.12,
      0,
      dark,
    );
    box(
      bridge,
      0.9,
      0.06,
      BRIDGE.width,
      side * (half + 0.38),
      GROUND_Y - 0.03,
      0,
    );
  }
  for (const [index, h] of HALLS.entries()) {
    hall(
      group,
      h.s,
      h.d,
      h.width,
      h.depth,
      h.height,
      REFERENCE_AZIMUTH - h.angle + (h.side === "near" ? Math.PI : 0),
      BUILDING_KINDS[index],
    );
  }
  for (const [s, d] of [
    [-19, 3],
    [-14.1, 5],
    [-5.8, -10],
    [6.8, -11.5],
    [8, 2.1],
    [10.2, 4],
    [6, 3.2],
    [3.5, 4.8],
    [12, 5.7],
    [20.7, -8.5],
  ]) {
    const side = d < -5 ? "far" : "near";
    const safeDepth =
      side === "far"
        ? Math.min(d, shoreDepth(side, s) - 0.25)
        : Math.max(d, shoreDepth(side, s) + 0.3);
    const p = scrollPoint(s, safeDepth);
    tree(group, p.x, p.z, false);
  }
  riversideNature(group);
  const market = [
    [-10, 0.9],
    [-11.9, 2.1],
    [-9, 3.1],
    [-8.3, 4.5],
    [-6.5, 5.5],
    [-12.8, 4.2],
    [-6.3, -7.1],
    [-5.9, -6.2],
  ];
  market.forEach(([s, d], i) => {
    const side = d < -5 ? "far" : "near";
    const safeDepth =
      side === "far"
        ? Math.min(d, shoreDepth(side, s) - 0.7)
        : Math.max(d, shoreDepth(side, s) + 0.85);
    const p = scrollPoint(s, safeDepth);
    stall(group, p.x, p.z, i % 3 === 0);
    if (i % 2 === 0) parasol(group, p.x + 0.4, p.z + 0.3);
  });
  for (let i = 0; i < 50; i++) {
    const onApproach = i < 34;
    const s = onApproach
      ? -12 + (i % 5) * 0.72 + Math.floor(i / 5) * 0.33
      : -19 + (i - 34) * 2.4;
    const d = onApproach
      ? Math.max(1 + Math.floor(i / 5) * 0.78, shoreDepth("near", s) + 0.3)
      : shoreDepth("far", s) - 0.15;
    const p = person(group, i);
    p.scale.setScalar(PERSON_SCALE);
    p.position.copy(scrollPoint(s, d));
    p.position.y = GROUND_Y;
    p.rotation.y = i * 1.7;
  }
  for (let i = 0; i < 12; i++) {
    const x = -half + 0.4 + (i * (BRIDGE.length - 0.8)) / 11,
      p = person(bridge, i);
    p.scale.setScalar(PERSON_SCALE);
    p.position.set(x, height(x), i % 2 ? 0.7 : -0.7);
  }
  batchStatic(group);
  const boats = BOATS.map((b) => {
    const vessel = workingBoat(
      group,
      b.s,
      b.d,
      b.length,
      b.width,
      b.cabin,
      REFERENCE_AZIMUTH + Math.PI / 2 - b.angle,
    );
    vessel.name = "working-boat";
    batchStatic(vessel);
    return vessel;
  });
  const rippleGeometry = new THREE.BufferGeometry();
  const ripplePositions = new THREE.Float32BufferAttribute(
    new Float32Array(RIPPLE_COUNT * 8 * 3),
    3,
  );
  ripplePositions.setUsage(THREE.DynamicDrawUsage);
  rippleGeometry.setAttribute("position", ripplePositions);
  const ripples = new THREE.LineSegments(rippleGeometry, riverInk);
  ripples.name = "river-ripples";
  ripples.frustumCulled = false;
  group.add(ripples);
  const people = Array.from({ length: WALKER_COUNT }, (_, i) => {
    const p = person(group, i, true);
    p.name = "walking-person";
    p.scale.setScalar(PERSON_SCALE);
    return {
      group: p,
      left: p.getObjectByName("left-leg")!,
      right: p.getObjectByName("right-leg")!,
    };
  });
  return {
    group,
    setPainting(enabled: boolean) {
      paintingAmount.value = enabled ? 1 : 0;
    },
    update(time: number) {
      people.forEach((p, i) => {
        const pose = walkPose(i, time),
          stride = pose.moving ? Math.sin(time * (5 + (i % 3) * 0.3) + i) : 0;
        p.group.position.copy(scrollPoint(pose.s, pose.d));
        p.group.position.y = pose.y + Math.abs(stride) * 0.006;
        p.group.rotation.y = REFERENCE_AZIMUTH - pose.angle + Math.PI / 2;
        p.left.rotation.x = stride * 0.46;
        p.right.rotation.x = -stride * 0.46;
      });
      boats.forEach((vessel, i) => {
        const pose = boatPose(i, time);
        vessel.position.copy(scrollPoint(pose.s, pose.d));
        vessel.position.y = pose.y;
        vessel.rotation.set(
          pose.pitch,
          REFERENCE_AZIMUTH + Math.PI / 2 - pose.angle,
          pose.roll,
        );
      });
      for (let i = 0; i < RIPPLE_COUNT; i++) {
        const ripple = riverRipple(i, time);
        for (let segment = 0; segment < 4; segment++)
          for (let end = 0; end < 2; end++) {
            const t = (segment + end) / 4,
              s = ripple.s + t * ripple.length;
            const far = shoreDepth("far", s),
              near = shoreDepth("near", s);
            const p = scrollPoint(
              s,
              far +
                (near - far) * ripple.fraction +
                Math.sin(t * Math.PI * 2 + i) * 0.025,
            );
            ripplePositions.setXYZ(i * 8 + segment * 2 + end, p.x, -0.019, p.z);
          }
      }
      ripplePositions.needsUpdate = true;
    },
  };
}
