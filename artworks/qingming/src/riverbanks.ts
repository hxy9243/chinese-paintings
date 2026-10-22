import * as THREE from "three";
import {
  BRIDGE,
  GROUND_Y,
  bridgeHeight,
  shoreDepth,
  type BankSide,
} from "./passageLayout";
import { scrollPoint } from "./scrollLayout";
import { paintMaterial, createDryInk } from "./paintMaterial";

// Keep the complete rock/earth toe within 0.09 of the navigation shoreline.
// The moored hulls retain their existing 0.12 minimum envelope clearance.
const earth = paintMaterial(0xb09a6d, true);
// A narrow damp wash loses pigment at the waterline; the upper bank remains solid.
earth.fragmentShader = earth.fragmentShader.replace(
  "gl_FragColor=vec4(result,alpha);",
  `
  result*=1.-(1.-smoothstep(-.03,.19,point.y))*.055;
  alpha*=smoothstep(-.09,.045,point.y);
  gl_FragColor=vec4(result,alpha);`,
);
earth.depthWrite=true;
const stone = [0x887e66, 0x9c9174].map((c) => paintMaterial(c));
const rockInk=createDryInk(.78);
const greys = [0xb8b9ae, 0xc7c5b9].map((c) => paintMaterial(c));

/** The geometry and water shader share the same continuous bank curve. */
export function bankEdgeDepth(side: BankSide, s: number) { return shoreDepth(side,s); }
export function bankSection(side: BankSide, s: number, t: number) {
  const direction = side === "far" ? 1 : -1;
  // Angular erosion folds and small notches belong to the exposed earth lip.
  // The toe remains inside the shared navigation envelope.
  const saw=(x:number)=>1-4*Math.abs((x-Math.floor(x))-.5);
  const rough=(saw(s*1.47)*.065+saw(s*3.73)*.026)*(1-t);
  // Ease both ends of the cross-section into a rounded lip and submerged toe.
  const drop = 0.5 - 0.5 * Math.cos(Math.PI * t);
  return {
    s,
    d: bankEdgeDepth(side, s) + direction * (-0.55 + 0.575 * t + rough),
    y: THREE.MathUtils.lerp(GROUND_Y + 0.004, -0.14, drop),
  };
}
type CachedBankArrays = {
  positions: Float32Array;
   normals: Float32Array;
  indices: Uint32Array;
  rockPos0: Float32Array;
  rockNorm0: Float32Array;
  rockPos1: Float32Array;
  rockNorm1: Float32Array;
  cracks: Float32Array;
  fissures: Float32Array;
};

const bankCache = new Map<BankSide, CachedBankArrays>();
const unitRockGeo = new THREE.IcosahedronGeometry(1, 0);
const unitRockPos = unitRockGeo.getAttribute("position").array as Float32Array;
const unitRockNorm = unitRockGeo.getAttribute("normal").array as Float32Array;
const unitRockEdgePos = new THREE.EdgesGeometry(unitRockGeo, 25).getAttribute(
  "position",
).array as Float32Array;

function appendTransformed(
  outPos: number[],
  outNorm: number[] | null,
  srcPos: Float32Array,
  srcNorm: Float32Array | null,
  px: number,
  py: number,
  pz: number,
  sx: number,
  sy: number,
  sz: number,
  rotY: number,
  rotZ: number,
) {
  const cy = Math.cos(rotY),
    syRot = Math.sin(rotY),
    cz = Math.cos(rotZ),
    szRot = Math.sin(rotZ);
  // Euler XYZ with rotX = 0: R = Ry * Rz
  const m00 = cy * cz,
    m01 = -cy * szRot,
    m02 = syRot;
  const m10 = szRot,
    m11 = cz,
    m12 = 0;
  const m20 = -syRot * cz,
    m21 = syRot * szRot,
    m22 = cy;
  for (let i = 0; i < srcPos.length; i += 3) {
    const x = srcPos[i] * sx,
      y = srcPos[i + 1] * sy,
      z = srcPos[i + 2] * sz;
    outPos.push(
      px + m00 * x + m01 * y + m02 * z,
      py + m10 * x + m11 * y + m12 * z,
      pz + m20 * x + m21 * y + m22 * z,
    );
    if (outNorm && srcNorm) {
      const nx = srcNorm[i] / sx,
        ny = srcNorm[i + 1] / sy,
        nz = srcNorm[i + 2] / sz;
      const wx = m00 * nx + m01 * ny + m02 * nz,
        wy = m10 * nx + m11 * ny + m12 * nz,
        wz = m20 * nx + m21 * ny + m22 * nz;
      const len = Math.hypot(wx, wy, wz) || 1;
      outNorm.push(wx / len, wy / len, wz / len);
    }
  }
}

function getBankArrays(side: BankSide): CachedBankArrays {
  const hit = bankCache.get(side);
  if (hit) return hit;
  const positions: number[] = [],
    indices: number[] = [];
  const count = 540,
    rows = 17;
  for (let i = 0; i <= count; i++)
    for (let j = 0; j < rows; j++) {
      const p = bankSection(side, -24 + i * 0.1, j / (rows - 1)),
        world = scrollPoint(p.s, p.d);
      positions.push(world.x, p.y, world.z);
    }
  for (let i = 0; i < count; i++)
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j,
        b = a + rows;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const tempGeo = new THREE.BufferGeometry();
  tempGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  tempGeo.setIndex(indices);
  tempGeo.computeVertexNormals();
  const normals = new Float32Array(
    (tempGeo.getAttribute("normal").array as Float32Array).slice(),
  );
  tempGeo.dispose();

  const rockPos0: number[] = [],
    rockNorm0: number[] = [],
    rockPos1: number[] = [],
    rockNorm1: number[] = [],
    cracks: number[] = [];
  const rotY = THREE.MathUtils.degToRad(-50);
  for (let i = 0; i < 300; i++) {
    const s = -23.8 + i * 0.178;
    if (s > 22.5) continue;
    if (Math.sin(s * 1.7) + Math.sin(s * 0.67) < -0.55) continue;
    const p = bankSection(side, s, 0.12 + (i % 4) * 0.18),
      world = scrollPoint(p.s, p.d);
    const sx = 0.13 + (i % 4) * 0.055,
      sy = 0.075 + (i % 3) * 0.045,
      sz = 0.07;
    const rotZ = Math.sin(i * 3.1) * 0.22;
    appendTransformed(
      i % 2 === 0 ? rockPos0 : rockPos1,
      i % 2 === 0 ? rockNorm0 : rockNorm1,
      unitRockPos,
      unitRockNorm,
      world.x,
      p.y,
      world.z,
      sx,
      sy,
      sz,
      rotY,
      rotZ,
    );
    appendTransformed(
      cracks,
      null,
      unitRockEdgePos,
      null,
      world.x,
      p.y,
      world.z,
      sx * 1.003,
      sy * 1.003,
      sz * 1.003,
      rotY,
      rotZ,
    );
  }
  const fissures: number[] = [];
  for (let s = -22; s < 25; s += 0.22) {
    if (Math.sin(s * 7) < -0.3) continue;
    for (let j = 0; j < 4; j++) {
      for (const t of [j / 5, (j + 1) / 5]) {
        const p = bankSection(side, s + Math.sin(t * 8 + s * 4) * 0.055, t),
          v = scrollPoint(p.s, p.d);
        fissures.push(v.x, p.y + 0.008, v.z);
      }
    }
  }
  const cached: CachedBankArrays = {
    positions: new Float32Array(positions),
    normals,
    indices: new Uint32Array(indices),
    rockPos0: new Float32Array(rockPos0),
    rockNorm0: new Float32Array(rockNorm0),
    rockPos1: new Float32Array(rockPos1),
    rockNorm1: new Float32Array(rockNorm1),
    cracks: new Float32Array(cracks),
    fissures: new Float32Array(fissures),
  };
  bankCache.set(side, cached);
  return cached;
}

export function buildBankFace(side: BankSide) {
  const group = new THREE.Group();
  group.name = `${side}-raised-bank`;
  const cached = getBankArrays(side);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(cached.positions.slice(), 3),
  );
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(cached.normals.slice(), 3),
  );
  geometry.setIndex(new THREE.BufferAttribute(cached.indices.slice(), 1));
  group.add(new THREE.Mesh(geometry, earth));

  for (const [idx, pos, norm] of [
    [0, cached.rockPos0, cached.rockNorm0],
    [1, cached.rockPos1, cached.rockNorm1],
  ] as const) {
    if (pos.length > 0) {
      const rGeo = new THREE.BufferGeometry();
      rGeo.setAttribute("position", new THREE.BufferAttribute(pos.slice(), 3));
      rGeo.setAttribute("normal", new THREE.BufferAttribute(norm.slice(), 3));
      group.add(new THREE.Mesh(rGeo, stone[idx]));
    }
  }
  const crackGeo = new THREE.BufferGeometry();
  crackGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(cached.cracks.slice(), 3),
  );
  group.add(new THREE.LineSegments(crackGeo, rockInk));

  const fissureGeo = new THREE.BufferGeometry();
  fissureGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(cached.fissures.slice(), 3),
  );
  group.add(new THREE.LineSegments(fissureGeo, createDryInk(0.82)));
  return group;
}

const mortarInk = createDryInk(0.25);
const brickAttrCache = new Map<
  string,
  {
    boxPos: THREE.BufferAttribute;
    boxNorm: THREE.BufferAttribute;
    boxIndex: THREE.BufferAttribute;
    edgePos: THREE.BufferAttribute;
  }
>();
function makeBrickGeos(w: number, h: number, d: number) {
  const key = `${w.toFixed(4)}:${h.toFixed(4)}:${d.toFixed(4)}`;
  let entry = brickAttrCache.get(key);
  if (!entry) {
    const box = new THREE.BoxGeometry(w, h, d);
    const edges = new THREE.EdgesGeometry(box);
    entry = {
      boxPos: box.getAttribute("position") as THREE.BufferAttribute,
      boxNorm: box.getAttribute("normal") as THREE.BufferAttribute,
      boxIndex: box.getIndex()!,
      edgePos: edges.getAttribute("position") as THREE.BufferAttribute,
    };
    brickAttrCache.set(key, entry);
  }
  const boxGeo = new THREE.BufferGeometry();
  boxGeo.setAttribute("position", entry.boxPos);
  boxGeo.setAttribute("normal", entry.boxNorm);
  boxGeo.setIndex(entry.boxIndex);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", entry.edgePos);
  return { box: boxGeo, edges: edgeGeo };
}

export function buildBridgeFoundations() {
  const group = new THREE.Group();
  group.name = "pale-brick-abutments";
  const half = BRIDGE.length / 2,
    width = BRIDGE.width + 0.32;
  for (const side of [-1, 1])
    for (let bay = 0; bay < 6; bay++) {
      const x = side * (half + 0.25 - bay * 0.3);
      // A stepped masonry shoulder follows the rising timber springing, rather
      // than disappearing below the land at the extreme ends of the bridge.
      const top = bridgeHeight(Math.abs(x) + 0.15) - 0.17;
      const rows = Math.max(1, Math.floor((top + 0.12) / 0.135));
      for (let row = 0; row < rows; row++) {
        let z = -width / 2;
        for (let col = 0; z < width / 2 - 0.001; col++) {
          const length = Math.min(
            col === 0 && row % 2 ? 0.23 : 0.46,
            width / 2 - z,
          );
          const geos = makeBrickGeos(0.294, 0.125, length - 0.009);
          const brick = new THREE.Mesh(
            geos.box,
            greys[(row + col + bay) % 2],
          );
          brick.position.set(x, -0.12 + row * 0.135 + 0.0625, z + length / 2);
          group.add(brick);
          const joints = new THREE.LineSegments(geos.edges, mortarInk);
          joints.position.copy(brick.position);
          group.add(joints);
          z += length;
        }
      }
      const capGeos = makeBrickGeos(0.3, 0.045, width + 0.035);
      const cap = new THREE.Mesh(capGeos.box, greys[1]);
      cap.position.set(x, -0.12 + rows * 0.135 + 0.012, 0);
      group.add(cap);
    }
  return group;
}
