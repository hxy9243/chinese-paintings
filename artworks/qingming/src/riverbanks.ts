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
const earth = paintMaterial(0x95846c);
const stone = [0xaaa99b, 0x92968c].map((c) => paintMaterial(c));
const greys = [0xb8b9ae, 0xc7c5b9].map((c) => paintMaterial(c));

export function bankSection(side: BankSide, s: number, t: number) {
  const direction = side === "far" ? 1 : -1;
  const rough = Math.sin(s * 7.3) * 0.012 + Math.sin(s * 17.1) * 0.006;
  return {
    s,
    d: shoreDepth(side, s) + direction * (-0.2 + 0.27 * t + rough),
    y:
      THREE.MathUtils.lerp(GROUND_Y + 0.004, -0.14, t) +
      Math.sin(t * Math.PI) * Math.sin(s * 8.1) * 0.025,
  };
}
export function buildBankFace(side: BankSide) {
  const group = new THREE.Group();
  group.name = `${side}-raised-bank`;
  const positions: number[] = [],
    indices: number[] = [];
  const count = 440,
    rows = 5;
  for (let i = 0; i <= count; i++)
    for (let j = 0; j < rows; j++) {
      const p = bankSection(side, -22 + i * 0.1, j / (rows - 1)),
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
  for (let i = 0; i < 215; i++) {
    const s = -21.8 + i * 0.203;
    if (Math.sin(s * 1.7) + Math.sin(s * 0.67) < -0.45) continue;
    const p = bankSection(side, s, 0.48 + (i % 3) * 0.17),
      world = scrollPoint(p.s, p.d);
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1, 0),
      stone[i % 2],
    );
    rock.position.set(world.x, p.y, world.z);
    rock.scale.set(0.11 + (i % 4) * 0.022, 0.07 + (i % 3) * 0.02, 0.055);
    // Local depth points across the river; constrain the riverward envelope.
    rock.rotation.y = THREE.MathUtils.degToRad(-50);
    rock.rotation.z = Math.sin(i * 3.1) * 0.22;
    group.add(rock);
  }
  return group;
}
const mortarInk=createDryInk(.25);
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
          const joints=new THREE.LineSegments(new THREE.EdgesGeometry(brick.geometry),mortarInk);
          joints.position.copy(brick.position);group.add(joints);
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
