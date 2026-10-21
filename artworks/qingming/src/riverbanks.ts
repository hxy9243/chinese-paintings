import * as THREE from "three";
import {
  BRIDGE,
  SHORELINES,
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
const stone = [0xa49c86, 0x9c967f].map((c) => paintMaterial(c));
const greys = [0xb8b9ae, 0xc7c5b9].map((c) => paintMaterial(c));

/** Exact box convolution of the reference polyline gives continuous tangents. */
export function bankEdgeDepth(side: BankSide, s: number) {
  const radius = 0.26,
    left = s - radius,
    right = s + radius;
  const cuts = [
    left,
    ...SHORELINES[side].map((p) => p.s).filter((x) => x > left && x < right),
    right,
  ];
  let area = 0;
  for (let i = 1; i < cuts.length; i++)
    area +=
      (shoreDepth(side, cuts[i - 1]) + shoreDepth(side, cuts[i])) *
      (cuts[i] - cuts[i - 1]) *
      0.5;
  return area / (radius * 2);
}
export function bankSection(side: BankSide, s: number, t: number) {
  const direction = side === "far" ? 1 : -1;
  const rough = Math.sin(s * 1.1) * 0.008 + Math.sin(s * 2.7) * 0.003;
  // Ease both ends of the cross-section into a rounded lip and submerged toe.
  const drop = 0.5 - 0.5 * Math.cos(Math.PI * t);
  return {
    s,
    d: bankEdgeDepth(side, s) + direction * (-0.22 + 0.245 * t + rough),
    y: THREE.MathUtils.lerp(GROUND_Y + 0.004, -0.14, drop),
  };
}
export function buildBankFace(side: BankSide) {
  const group = new THREE.Group();
  group.name = `${side}-raised-bank`;
  const positions: number[] = [],
    indices: number[] = [];
  const start = SHORELINES[side][0].s, count = Math.round((22-start)*10),
    rows = 17;
  for (let i = 0; i <= count; i++)
    for (let j = 0; j < rows; j++) {
      const p = bankSection(side, start + i * 0.1, j / (rows - 1)),
        world = scrollPoint(p.s, p.d);
      positions.push(world.x, p.y, world.z);
    }
  for (let i = 0; i < count; i++)
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j,
        b = a + rows;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry, earth));
  // Broken patches of riprap, rather than a continuous modern concrete wall.
  for (let i = 0; i < Math.floor((22-start)/.203); i++) {
    const s = start+.2 + i * 0.203;
    if (Math.sin(s * 1.7) + Math.sin(s * 0.67) < 0.6) continue;
    const p = bankSection(side, s, 0.48 + (i % 3) * 0.17),
      world = scrollPoint(p.s, p.d);
    const rock = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 1),
      stone[i % 2],
    );
    rock.position.set(world.x, p.y, world.z);
    rock.scale.set(0.12 + (i % 4) * 0.045, 0.065 + (i % 3) * 0.032, 0.045);
    // Local depth points across the river; constrain the riverward envelope.
    rock.rotation.y = THREE.MathUtils.degToRad(-50);
    rock.rotation.z = Math.sin(i * 3.1) * 0.22;
    group.add(rock);
  }
  return group;
}
const mortarInk = createDryInk(0.25);
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
          const brick = new THREE.Mesh(
            new THREE.BoxGeometry(0.294, 0.125, length - 0.009),
            greys[(row + col + bay) % 2],
          );
          brick.position.set(x, -0.12 + row * 0.135 + 0.0625, z + length / 2);
          group.add(brick);
          const joints = new THREE.LineSegments(
            new THREE.EdgesGeometry(brick.geometry),
            mortarInk,
          );
          joints.position.copy(brick.position);
          group.add(joints);
          z += length;
        }
      }
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.045, width + 0.035),
        greys[1],
      );
      cap.position.set(x, -0.12 + rows * 0.135 + 0.012, 0);
      group.add(cap);
    }
  return group;
}
