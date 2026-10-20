import { expect, it } from "vitest";
import * as THREE from "three";
import { createBridgeStudy } from "../src/bridgeStudy";
import { BRIDGE, bridgePoint } from "../src/passageLayout";
import { scrollPoint } from "../src/scrollLayout";

it("keeps both landing board surfaces above the bank instead of coplanar", () => {
  const study = createBridgeStudy(9243);
  study.group.updateMatrixWorld(true);
  const staticMeshes = study.group.children.filter(
    (o): o is THREE.Mesh =>
      o instanceof THREE.Mesh && o.name !== "animated-crowd",
  );
  const pigment = (o: THREE.Object3D) =>
    (
      o as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
    ).material.uniforms.pigment?.value?.getHex();
  const ground = staticMeshes.filter((o) => pigment(o) === 0xb09a6d);
  const timber = staticMeshes.filter((o) => pigment(o) === 0x9f814f);
  const ray = new THREE.Raycaster();
  try {
    for (const side of [-1, 1])
      for (const lateral of [-1.2, 0, 1.2]) {
        const p = bridgePoint(side * (BRIDGE.length / 2 + 0.38), lateral);
        const origin = scrollPoint(p.s, p.d);
        origin.y = 10;
        ray.set(origin, new THREE.Vector3(0, -1, 0));
        const bank = ray.intersectObjects(ground, false)[0];
        const board = ray.intersectObjects(timber, false)[0];
        expect(bank, `bank beneath landing ${side}/${lateral}`).toBeDefined();
        expect(board, `board at landing ${side}/${lateral}`).toBeDefined();
        const gap = board.point.y - bank.point.y;
        expect(gap, `landing ${side}/${lateral} surface gap`).toBeGreaterThan(
          0.01,
        );
        expect(gap).toBeLessThan(0.02);
      }
  } finally {
    study.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line)
        o.geometry.dispose();
    });
  }
});
