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
  passageOutline,
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
  CARTS,
  cartPose,
  FEATURE_TREES,
  MARKET,
  STATIC_PEOPLE,
  WALKER_COUNT,
  RIPPLE_COUNT,
  boatPose,
  walkPose,
  residentPose,
  observerPose,
  SHOP_VISITORS,
  shopperPose,
  riverRipple,
  type BuildingKind,
} from "./passageLife";
import { MOORED_BOATS, mooredBoatPose, mooringAnchor } from "./moorings";
import { createCrowd } from "./crowd";
import { idleMotion } from "./peopleMotion";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// A shallow, camera-constrained diorama. Hidden façades are intentionally plain.
// The original passage runs from the near lower-left approach to the far upper-right.
export const VIEW_ANGLE = REFERENCE_AZIMUTH;
export const TILT_LIMIT = 30;
// 35 degrees above ground leaves the full ±30° pitch range above the banks.
export const ELEVATION = THREE.MathUtils.degToRad(55);
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
type TreeForm = "upright" | "spreading" | "pollard" | "sapling";
// Bare crowns in the supplied crop range from fine upright sprays to old,
// low-forking riverbank trees. Forms are deterministic across visits.
function characterTree(
  parent: THREE.Object3D,
  x: number,
  z: number,
  form: TreeForm,
  seed: number,
) {
  const g = new THREE.Group();
  parent.add(g);
  g.position.set(x, GROUND_Y, z);
  const old = form === "spreading",
    short = form === "pollard";
  const height = old ? 1.35 : short ? 1.65 : 2.25;
  const thick = old ? 0.16 : short ? 0.11 : 0.045;
  const lean = Math.sin(seed * 2.1) * 0.23;
  const trunk = [
    [0, 0, 0],
    [lean * 0.6, height * 0.38, 0.07],
    [-0.08, height * 0.72, 0.02],
    [lean, height, 0],
  ];
  for (let i = 0; i < 3; i++)
    beam(g, trunk[i], trunk[i + 1], thick * (1 - i * 0.19));
  // Buttress roots and bark strokes keep old trunks from reading as poles.
  if (old || short)
    for (let j = 0; j < 5; j++) {
      const a = j * 1.26;
      beam(
        g,
        [Math.cos(a) * 0.29, 0.015, Math.sin(a) * 0.29],
        [lean * 0.3, 0.4, 0.02],
        0.033,
        dark,
      );
      beam(
        g,
        [Math.cos(a) * thick, 0.15, Math.sin(a) * thick],
        [
          lean * 0.6 + Math.cos(a) * thick * 0.6,
          height * 0.7,
          0.02 + Math.sin(a) * thick * 0.6,
        ],
        0.006,
        dark,
      );
    }
  const branches = old ? 9 : short ? 12 : 6;
  for (let j = 0; j < branches; j++) {
    const a = j * 2.399 + seed,
      originY = short ? height * 0.86 : height * (0.42 + (j % 4) * 0.13);
    const reach = old
      ? 1.15 + (j % 3) * 0.22
      : short
        ? 0.44 + (j % 3) * 0.12
        : 0.4 + (j % 3) * 0.1;
    const tip = [
      lean + Math.cos(a) * reach,
      height + (j % 4) * 0.15,
      Math.sin(a) * reach * 0.68,
    ];
    const elbow = [tip[0] * 0.62, originY + 0.3, tip[2] * 0.52];
    beam(g, [lean * 0.5, originY, 0.02], elbow, old ? 0.048 : 0.027);
    beam(g, elbow, tip, old ? 0.031 : 0.015);
    for (let k = 0; k < 7; k++) {
      const spread = (k - 3) * 0.11;
      const end = [
        tip[0] + Math.cos(a + spread * 2) * 0.35 + spread,
        tip[1] + 0.24 + (k % 3) * 0.14,
        tip[2] + Math.sin(a + spread * 2) * 0.26,
      ];
      beam(g, tip, end, 0.007, dark);
      beam(
        g,
        end,
        [end[0] + spread * 0.7, end[1] + 0.18, end[2] + 0.08 * Math.sin(k)],
        0.004,
        dark,
      );
    }
    if (short)
      mesh(g, new THREE.SphereGeometry(0.085, 6, 4), wood, lean, originY, 0.02);
  }
  return g;
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
      const t =
        n.kind === "spring"
          ? tree(parent, p.x, p.z, true)
          : characterTree(
              parent,
              p.x,
              p.z,
              n.s < 0 ? "sapling" : "pollard",
              n.s,
            );
      t.scale.set(n.size * 0.85, n.size * 1.1, n.size * 0.85);
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
  beam(g, [0.3, 0.32, -0.7], [0.68, 0.1, -1.55], 0.022, dark);
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
function horseCart(parent: THREE.Group, index: number) {
  const layout = CARTS[index];
  const g = new THREE.Group();
  g.position.copy(scrollPoint(layout.s, layout.d));
  g.position.y = GROUND_Y;
  g.rotation.y = REFERENCE_AZIMUTH - layout.angle;
  g.scale.setScalar(0.7);
  parent.add(g);
  const coat = index % 2 ? dark : wood;
  // Horse faces local +x: rounded barrel, sloping neck, muzzle and alert ears.
  const body = mesh(g, new THREE.SphereGeometry(1, 10, 7), coat, 0.65, 0.65, 0);
  body.scale.set(0.48, 0.22, 0.2);
  const headGroup = new THREE.Group();
  g.add(headGroup);
  beam(headGroup, [0.9, 0.68, 0], [1.12, 1.03, 0], 0.13, coat);
  const head = mesh(
    headGroup,
    new THREE.SphereGeometry(1, 8, 6),
    coat,
    1.22,
    1.02,
    0,
  );
  head.scale.set(0.24, 0.12, 0.105);
  for (const z of [-0.075, 0.075])
    beam(headGroup, [1.12, 1.1, z], [1.1, 1.26, z], 0.025, coat);
  const legs: THREE.Group[] = [];
  for (const x of [0.35, 0.94])
    for (const z of [-0.14, 0.14]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.59, z);
      leg.name = "horse-leg";
      g.add(leg);
      beam(leg, [0, 0, 0], [0.02, -0.29, 0], 0.04, coat);
      beam(leg, [0.02, -0.29, 0], [0, -0.555, 0], 0.029, coat);
      box(leg, 0.105, 0.06, 0.075, 0.025, -0.56, 0, coat);
      legs.push(leg);
    }
  beam(g, [0.22, 0.72, 0], [0.04, 0.35, 0.03], 0.055, dark);
  beam(g, [0.94, 0.88, 0], [1.05, 1.12, 0], 0.045, dark);
  // Two wooden shafts visibly join harness and cart.
  for (const z of [-0.24, 0.24]) {
    beam(g, [-1.1, 0.38, z], [0.85, 0.47, z], 0.025);
    beam(g, [0.82, 0.48, z], [0.82, 0.84, z * 0.7], 0.018, dark);
    beam(g, [-0.58, 0.86, z / 2], [1.3, 1.02, z / 3], 0.008, dark);
  }
  box(g, 1.05, 0.1, 0.64, -0.85, 0.43, 0);
  const wheels: THREE.Group[] = [];
  for (const z of [-0.31, 0.31]) {
    box(g, 1.08, 0.23, 0.04, -0.85, 0.58, z);
    const wheel = new THREE.Group();
    wheel.position.set(-0.94, 0.3, z * 1.28);
    wheel.name = "cart-wheel";
    g.add(wheel);
    mesh(wheel, new THREE.TorusGeometry(0.29, 0.025, 5, 16), dark);
    for (let j = 0; j < 10; j++) {
      const a = (j / 10) * Math.PI * 2;
      beam(
        wheel,
        [0, 0, 0],
        [Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0],
        0.012,
      );
    }
    wheels.push(wheel);
  }
  if (index % 2) {
    const canopy = mesh(
      g,
      new THREE.CylinderGeometry(0.34, 0.34, 0.85, 12, 1, true, 0, Math.PI),
      linen,
      -0.96,
      0.65,
      0,
    );
    canopy.rotation.z = Math.PI / 2;
  } else
    for (let i = 0; i < 3; i++) {
      const sack = mesh(
        g,
        new THREE.SphereGeometry(0.2, 7, 5),
        linen,
        -1.13 + i * 0.23,
        0.65,
        0,
      );
      sack.scale.set(0.8, 0.8, 1.25);
    }
  const animated = [...legs, ...wheels, headGroup];
  animated.forEach((part) => g.remove(part));
  batchStatic(g);
  animated.forEach((part) => {
    batchStatic(part);
    g.add(part);
  });
  // Clip the traffic to the same rounded ground boundary. Each train wraps
  // only after its entire horse, cart and driver have left that boundary.
  const materials = new Map<THREE.Material, THREE.ShaderMaterial>();
  g.traverse((n) => {
    if (!(n instanceof THREE.Mesh || n instanceof THREE.Line)) return;
    const original = n.material as THREE.ShaderMaterial;
    let material = materials.get(original);
    if (!material) {
      material = original.clone();
      material.uniforms = original.uniforms;
      material.fragmentShader = material.fragmentShader.replace(
        "void main(){",
        `void main(){
        float roadS=point.x*.64278761+point.z*.76604444;
        float roadD=-point.x*.76604444+point.z*.64278761;
        if(length(vec2(max(0.,abs(roadS)-16.),max(0.,abs(roadD)-8.)))>6.)discard;
      `,
      );
      materials.set(original, material);
    }
    n.material = material;
  });
  g.name = "horse-cart";
  return { group: g, legs, wheels, head: headGroup };
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
  if (!walking && variant % 4 === 0) {
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
  if (kind === "compound") {
    const rear = hall(g, 0, 0, w * 0.9, depth * 0.35, h, 0, "dwelling");
    rear.position.set(0, 0, -depth * 0.28);
    const wing = hall(g, 0, 0, w * 0.27, depth * 0.5, h * 0.74, 0, "warehouse");
    wing.position.set(-w * 0.31, 0, depth * 0.14);
    // Low yard wall and a recessed gate rather than another enclosed hall.
    box(
      g,
      w * 0.55,
      h * 0.27,
      0.08,
      w * 0.17,
      h * 0.135,
      depth * 0.42,
      plaster,
    );
    box(g, 0.38, h * 0.42, 0.06, w * 0.16, h * 0.21, depth * 0.43, dark);
    box(g, 0.53, 0.065, 0.28, w * 0.16, h * 0.43, depth * 0.42, roof);
    for (let i = 0; i < 3; i++)
      mesh(
        g,
        new THREE.CylinderGeometry(0.11, 0.09, 0.17, 8),
        linen,
        w * 0.12 + i * 0.24,
        0.085,
        0,
      );
    return g;
  }
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
  if (kind === "openhall") {
    // Open-front trading shelter: daylight between posts, benches and a back screen.
    box(g, w, h * 0.72, 0.045, 0, h * 0.36, -depth / 2, wood);
    for (const side of [-1, 1]) {
      box(g, 0.045, h * 0.46, depth, (side * w) / 2, h * 0.23, 0, plaster);
      box(g, w * 0.36, 0.07, depth * 0.22, side * w * 0.25, h * 0.25, 0, wood);
    }
    for (let i = 0; i <= 4; i++) {
      const x = -w / 2 + (i * w) / 4;
      beam(g, [x, 0, depth / 2], [x, h, depth / 2], 0.032);
      beam(
        g,
        [x, h * 0.72, depth / 2],
        [x + 0.13, h * 0.94, depth / 2],
        0.016,
        dark,
      );
    }
  } else
    box(
      g,
      w,
      h,
      depth,
      0,
      h / 2,
      0,
      kind === "warehouse" || kind === "shed" ? wood : plaster,
    );
  // Low shop/warehouse gables contrast with broad hipped dwelling roofs.
  // Restrained concave eaves follow the crop rather than pagoda silhouettes.
  const gabled = kind === "warehouse" || kind === "shop" || kind === "shed";
  const e = w / 2 + 0.2,
    f = depth / 2 + 0.23;
  const r = gabled ? e : w * 0.29;
  const y = h + 0.1,
    top = h + Math.min(0.64, depth * (gabled ? 0.28 : 0.23));
  const roofY = (t: number) =>
    top + (y - top) * t - Math.sin(t * Math.PI) * 0.065;
  const positions: number[] = [];
  const triangle = (a: number[], b: number[], c: number[]) =>
    positions.push(...a, ...b, ...c);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 10; row++) {
      const t = row / 10,
        u = (row + 1) / 10;
      const a = r + (e - r) * t,
        b = r + (e - r) * u;
      const A = [-a, roofY(t), side * f * t],
        B = [a, roofY(t), side * f * t];
      const C = [b, roofY(u), side * f * u],
        D = [-b, roofY(u), side * f * u];
      triangle(A, B, C);
      triangle(A, C, D);
      if (!gabled) {
        const P = [side * a, roofY(t), -f * t],
          Q = [side * a, roofY(t), f * t];
        const R = [side * b, roofY(u), f * u],
          S = [side * b, roofY(u), -f * u];
        triangle(P, Q, R);
        triangle(P, R, S);
      }
      beam(
        g,
        [-b, roofY(u) + 0.012, side * f * u],
        [b, roofY(u) + 0.012, side * f * u],
        0.005,
        dark,
      );
    }
    for (let i = 0; i <= Math.ceil(w * 10); i++) {
      const x = -e + (2 * e * i) / Math.ceil(w * 10),
        rx = THREE.MathUtils.clamp(x, -r, r);
      const points = Array.from({ length: 11 }, (_, j) => {
        const t = j / 10;
        return new THREE.Vector3(
          rx + (x - rx) * t,
          roofY(t) + 0.008,
          side * f * t,
        );
      });
      g.add(
        new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), ink),
      );
    }
    beam(g, [-e, y - 0.025, side * f], [e, y - 0.025, side * f], 0.027, wood);
    for (let x = -w / 2; x <= w / 2; x += 0.22)
      beam(
        g,
        [x, y - 0.055, side * (f - 0.2)],
        [x, y - 0.025, side * f],
        0.017,
        wood,
      );
    if (gabled) {
      const end = new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [
            (side * w) / 2,
            h,
            -depth / 2,
            (side * w) / 2,
            top - 0.04,
            0,
            (side * w) / 2,
            h,
            depth / 2,
          ],
          3,
        ),
      );
      end.computeVertexNormals();
      mesh(g, end, kind === "warehouse" ? wood : plaster);
      beam(g, [side * e, y, -f], [side * e, top, 0], 0.024, dark);
      beam(g, [side * e, top, 0], [side * e, y, f], 0.024, dark);
    }
  }
  const geo = new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geo.computeVertexNormals();
  mesh(g, geo, kind === "shed" ? linen : roof);
  beam(g, [-r, top + 0.025, 0], [r, top + 0.025, 0], 0.028, dark);
  if (kind === "openhall") {
    beam(
      g,
      [-w / 2, h * 0.9, depth / 2],
      [w / 2, h * 0.9, depth / 2],
      0.035,
      dark,
    );
    return g;
  }
  if (kind === "shed") {
    // Rough vertical boards, a low door, and uneven straw at the eaves.
    for (let x = -w / 2; x < w / 2; x += 0.13)
      beam(g, [x, 0, depth / 2 + 0.02], [x, h, depth / 2 + 0.02], 0.009, dark);
    box(
      g,
      w * 0.24,
      h * 0.76,
      0.028,
      -w * 0.12,
      h * 0.38,
      depth / 2 + 0.04,
      dark,
    );
    for (let x = -e; x < e; x += 0.055)
      for (const side of [-1, 1])
        beam(
          g,
          [x, y + 0.03, side * (f - 0.13)],
          [x + 0.015, y - 0.055 - Math.sin(x * 61) * 0.025, side * f],
          0.008,
          linen,
        );
    return g;
  }
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
    // Hanging shop board and small wares remain within the roof overhang.
    beam(
      g,
      [-w * 0.36, h * 0.9, depth / 2],
      [-w * 0.36, h * 0.9, depth / 2 + 0.2],
      0.016,
      dark,
    );
    box(g, 0.18, h * 0.38, 0.025, -w * 0.36, h * 0.68, depth / 2 + 0.19, linen);
    for (let i = 0; i < 5; i++) {
      const x = -w * 0.34 + i * w * 0.17;
      mesh(
        g,
        new THREE.CylinderGeometry(0.055, 0.045, 0.09, 8),
        i % 2 ? linen : wood,
        x,
        h * 0.27,
        depth / 2 + 0.14,
      );
    }
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
    // Balcony corner posts and hanging lanterns distinguish larger tea halls.
    for (const x of [-w * 0.44, w * 0.44]) {
      beam(g, [x, 0, depth / 2 + 0.12], [x, h, depth / 2 + 0.12], 0.032);
      box(g, 0.14, 0.19, 0.12, x, h * 0.76, depth / 2 + 0.13, linen);
    }
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
    beam(g, [0, 0.34, -length * 0.31], [0, 1.1, -length * 0.31], 0.025, dark);
    beam(
      g,
      [-width * 0.45, 0.85, -length * 0.31],
      [width * 0.45, 0.85, -length * 0.31],
      0.02,
      dark,
    );
  }
  return g;
}
export function createBridgeStudy(seed = Math.floor(Math.random() * 10000)) {
  const group = new THREE.Group();
  const waterShape = new THREE.Shape();
  passageOutline().forEach(([s, d], i) => {
    const p = scrollPoint(s, d);
    if (i === 0) waterShape.moveTo(p.x, -p.z);
    else waterShape.lineTo(p.x, -p.z);
  });
  waterShape.closePath();
  const river = mesh(
    group,
    new THREE.ShapeGeometry(waterShape),
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
  // Staggered overlapping timber courses give the open arch its deep structure.
  for (const z of [-0.88, -0.44, 0, 0.44, 0.88]) {
    for (let layer = 0; layer < 3; layer++) {
      const count = 10,
        step = BRIDGE.length / count;
      for (let i = 0; i < count; i++) {
        const a = -half + i * step,
          b = Math.min(half, a + step * 1.24);
        const inset = 0.14 + layer * 0.105;
        beam(
          bridge,
          [a, height(a) - inset, z],
          [b, height(b) - inset, z],
          0.064,
          layer === 1 ? dark : wood,
        );
      }
    }
  }
  // Paired outer arch bands and transverse tie logs; no piers in the channel.
  for (let i = 0; i < 24; i++) {
    const a = -half + (i * BRIDGE.length) / 24,
      b = a + BRIDGE.length / 24;
    for (const side of [-1, 1]) {
      const z = side * (BRIDGE.width / 2 + 0.035);
      for (const inset of [0.12, 0.38])
        beam(
          bridge,
          [a, height(a) - inset, z],
          [b, height(b) - inset, z],
          0.052,
        );
      if (i % 2 === 0)
        beam(
          bridge,
          [a, height(a) - 0.38, z],
          [b, height(b) - 0.12, z],
          0.038,
          dark,
        );
    }
    if (i % 2 === 0)
      beam(
        bridge,
        [a, height(a) - 0.25, -BRIDGE.width / 2 - 0.12],
        [a, height(a) - 0.25, BRIDGE.width / 2 + 0.12],
        0.065,
      );
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
  for (const { s, d, size, form } of FEATURE_TREES) {
    const p = scrollPoint(s, d),
      t = characterTree(group, p.x, p.z, form, s);
    t.scale.set(size * 1.15, size * 1.5, size * 1.15);
    t.rotation.y = s * 0.31;
  }
  riversideNature(group);
  MARKET.forEach(({ s, d, parasol: covered }, i) => {
    const p = scrollPoint(s, d);
    stall(group, p.x, p.z, i % 3 === 0);
    if (covered) parasol(group, p.x + 0.4, p.z + 0.3);
  });
  batchStatic(group);
  const carts = CARTS.map((_, i) => horseCart(group, i));
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
  const moored = MOORED_BOATS.map((b) => {
    const vessel = workingBoat(
      group,
      b.s,
      b.d,
      b.length,
      b.width,
      b.cabin,
      REFERENCE_AZIMUTH + Math.PI / 2 - b.angle,
    );
    vessel.name = "moored-boat";
    batchStatic(vessel);
    return vessel;
  });
  const mooringPosts = new THREE.Group();
  group.add(mooringPosts);
  const ties = moored.flatMap((vessel, index) =>
    [-1, 1].map((side) => {
      const anchor = mooringAnchor(index, side),
        point = scrollPoint(anchor.s, anchor.d);
      beam(
        mooringPosts,
        [point.x, -0.1, point.z],
        [point.x, 0.24, point.z],
        0.028,
        dark,
      );
      const geometry = new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(new Float32Array(9 * 3), 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      const rope = new THREE.Line(geometry, ink);
      rope.name = "mooring-line";
      rope.frustumCulled = false;
      group.add(rope);
      return { vessel, index, side, point, rope };
    }),
  );
  batchStatic(mooringPosts);
  const boatLayouts = [...BOATS, ...MOORED_BOATS];
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
  const crowd = createCrowd(group, (i) => person(new THREE.Group(), i, true));
  const addPerson = (parent: THREE.Object3D, i: number, name: string) => {
    const p = crowd.add(parent, i, name);
    p.scale.setScalar(PERSON_SCALE);
    return {
      group: p,
      left: p.getObjectByName("left-leg")!,
      right: p.getObjectByName("right-leg")!,
    };
  };
  const people = Array.from({ length: WALKER_COUNT }, (_, i) =>
    addPerson(group, i, "walking-person"),
  );
  const residents = STATIC_PEOPLE.map((_, i) =>
    addPerson(group, i, "resident-person"),
  );
  const observers = Array.from({ length: 12 }, (_, i) =>
    addPerson(group, i, "bridge-observer"),
  );
  const shoppers = SHOP_VISITORS.map((_, i) =>
    addPerson(group, i, "shop-visitor"),
  );
  const drivers = carts.map((c, i) => addPerson(c.group, i, "cart-driver"));
  const crew = [...boats, ...moored].flatMap((b, i) =>
    [-1, 1].map((side) => ({
      rig: addPerson(b, i + (side + 1) / 2, "boat-crew"),
      side,
      boat: i,
    })),
  );
  crowd.finish();
  function animatePerson(
    p: (typeof people)[number],
    id: number,
    time: number,
    pose: ReturnType<typeof walkPose>,
  ) {
    const idle = idleMotion(id, time, seed),
      stride = pose.moving ? Math.sin(pose.stride + id) : 0;
    p.group.position.copy(scrollPoint(pose.s, pose.d));
    p.group.position.y = pose.y + idle.breath + Math.abs(stride) * 0.003;
    p.group.rotation.set(
      0,
      REFERENCE_AZIMUTH - pose.angle + Math.PI / 2 + idle.look,
      idle.lean,
    );
    p.left.rotation.x = stride * 0.46;
    p.right.rotation.x = -stride * 0.46;
  }
  return {
    group,
    setPainting(enabled: boolean) {
      paintingAmount.value = enabled ? 1 : 0;
    },
    update(time: number) {
      carts.forEach((cart, i) => {
        const pose = cartPose(i, time),
          stride = pose.moving ? pose.traveled * 15 : time * 2.4;
        cart.group.position.copy(scrollPoint(pose.s, pose.d));
        cart.group.position.y = pose.y;
        cart.group.rotation.y = REFERENCE_AZIMUTH - pose.angle;
        cart.legs.forEach((leg, j) => {
          leg.rotation.z =
            Math.sin(stride + (j === 0 || j === 3 ? 0 : Math.PI)) *
            (pose.moving ? 0.23 : pose.turning ? 0.12 : 0);
        });
        cart.wheels.forEach((wheel, j) => {
          wheel.rotation.z =
            -pose.traveled / (0.7 * 0.29) +
            (pose.turning ? (pose.angle - CARTS[i].angle) * (j ? 1 : -1) : 0);
        });
        cart.head.position.y = Math.sin(stride) * 0.012;
      });
      people.forEach((p, i) =>
        animatePerson(p, i, time, walkPose(i, time, seed)),
      );
      residents.forEach((p, i) =>
        animatePerson(p, i + 100, time, residentPose(i, time, seed)),
      );
      observers.forEach((p, i) =>
        animatePerson(p, i + 200, time, observerPose(i, time, seed)),
      );
      shoppers.forEach((p, i) =>
        animatePerson(p, i + 300, time, shopperPose(i, time, seed)),
      );
      drivers.forEach((p, i) => {
        const idle = idleMotion(i + 400, time, seed);
        p.group.position.set(-0.42, 0.48 + idle.breath, 0);
        p.group.visible = Math.abs(cartPose(i, time).s - 0.294) < 19.25;
        p.group.rotation.set(
          idle.lean,
          Math.PI / 2 + idle.look,
          idle.lean * 0.5,
        );
      });
      crew.forEach(({ rig: p, side, boat }, i) => {
        const idle = idleMotion(i + 500, time, seed);
        p.group.position.set(
          Math.sin(time * 0.33 + i) * 0.025,
          0.34 + idle.breath,
          side * boatLayouts[boat].length * 0.36,
        );
        p.group.rotation.set(
          idle.lean,
          idle.look + (side === 1 ? 0 : Math.PI),
          idle.lean,
        );
      });
      boats.forEach((vessel, i) => {
        const pose = boatPose(i, time);
        vessel.visible = Math.abs(pose.s) < 22 + BOATS[i].length * 0.62 + 0.2;
        vessel.position.copy(scrollPoint(pose.s, pose.d));
        vessel.position.y = pose.y;
        vessel.rotation.set(
          pose.pitch,
          REFERENCE_AZIMUTH + Math.PI / 2 - pose.angle,
          pose.roll,
        );
      });
      moored.forEach((vessel, i) => {
        const pose = mooredBoatPose(i, time);
        vessel.position.copy(scrollPoint(pose.s, pose.d));
        vessel.position.y = pose.y;
        vessel.rotation.set(
          pose.pitch,
          REFERENCE_AZIMUTH + Math.PI / 2 - pose.angle,
          pose.roll,
        );
      });
      // Lines follow the gently bobbing boats while their shore posts stay fixed.
      ties.forEach(({ vessel, index, side, point, rope }) => {
        const b = MOORED_BOATS[index];
        vessel.updateWorldMatrix(true, false);
        const start = vessel.localToWorld(
          new THREE.Vector3(b.width * 0.5, 0.3, side * b.length * 0.31),
        );
        const end = new THREE.Vector3(point.x, 0.2, point.z),
          positions = rope.geometry.getAttribute("position");
        for (let i = 0; i <= 8; i++) {
          const t = i / 8,
            p = start.clone().lerp(end, t);
          p.y -= Math.sin(t * Math.PI) * 0.06;
          positions.setXYZ(i, p.x, p.y, p.z);
        }
        positions.needsUpdate = true;
      });
      crowd.update();
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
