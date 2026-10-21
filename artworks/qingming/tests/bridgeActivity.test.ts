import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createBridgeStudy } from "../src/bridgeStudy";
import { BRIDGE, BRIDGE_SHOPS, bridgeHeight } from "../src/passageLayout";
import { BRIDGE_OBSERVERS } from "../src/passageLife";
import { advanceSceneTime } from "../src/peopleMotion";
import { bridgeActivity, bridgeRole } from "../src/bridgeActivity";

describe("busy bridge market", () => {
  it("keeps life at elapsed-time speed after dropped frames and freezes on pause", () => {
    expect(advanceSceneTime(2, 0.5, false)).toBe(2.5);
    expect(advanceSceneTime(2, 0.5, true)).toBe(2);
    let t = 0;
    for (const delta of [0.03, 0.4, 0.07, 0.5])
      t = advanceSceneTime(t, delta, false);
    expect(t).toBeCloseTo(1);
  });
  it("places two rows of stands outside the passing lanes, with looser browsing and river-watching groups", () => {
    expect(BRIDGE_SHOPS).toHaveLength(16);
    const counts = Array.from({ length: BRIDGE_OBSERVERS }, (_, i) =>
      bridgeRole(i),
    ).reduce(
      (r, role) => ({ ...r, [role]: (r[role] ?? 0) + 1 }),
      {} as Record<string, number>,
    );
    expect(counts).toEqual({
      vendor: 8,
      customer: 8,
      "river-watcher": 8,
      conversation: 8,
    });
    for (const shop of BRIDGE_SHOPS) {
      expect(Math.abs(shop.lateral) - shop.depth / 2).toBeGreaterThan(1.5);
      expect(Math.abs(shop.x) + shop.width / 2).toBeLessThan(BRIDGE.length / 2);
      const sameSide = BRIDGE_SHOPS.filter(
        (s) => s.side === shop.side && s !== shop,
      );
      sameSide.forEach((s) =>
        expect(Math.abs(s.x - shop.x)).toBeGreaterThan(
          (s.width + shop.width) / 2 + 0.2,
        ),
      );
    }
  });
  it("coordinates buyer and seller phases and varies activity between neighbouring stalls", () => {
    const phases = new Set<number>();
    for (let t = 0; t < 18; t += 0.4) {
      expect(bridgeActivity(2, t, 9243).phase).toBe(
        bridgeActivity(4, t, 9243).phase,
      );
      expect(bridgeActivity(2, t, 9243)).toEqual(bridgeActivity(2, t, 9243));
    }
    for (let i = 2; i < 64; i += 8)
      phases.add(bridgeActivity(i, 4, 9243).phase);
    expect(phases.size).toBeGreaterThan(6);
  });
  it("moves rendered torsos, elbows and hands while keeping the feet anchored and replayable", () => {
    const study = createBridgeStudy(9243),
      actors: THREE.Object3D[] = [];
    study.group.traverse((o) => {
      if (o.name === "bridge-observer") actors.push(o);
    });
    expect(actors).toHaveLength(BRIDGE_OBSERVERS);
    const workingArm = (actor: THREE.Object3D) =>
      actor.userData.activity === "river-watcher"
        ? "left-forearm"
        : "right-forearm";
    const hand = (actor: THREE.Object3D) =>
      actor
        .getObjectByName(workingArm(actor))!
        .localToWorld(new THREE.Vector3(0, -0.03, 0.12));
    const feet = (actor: THREE.Object3D) =>
      actor.getObjectByName("left-leg")!.getWorldPosition(new THREE.Vector3());
    const samples = actors.map(() => ({
      hands: [] as THREE.Vector3[],
      feet: [] as THREE.Vector3[],
      torso: [] as number[],
      elbow: [] as number[],
    }));
    for (let t = 0; t < 12; t += 0.5) {
      study.update(t);
      study.group.updateMatrixWorld(true);
      actors.forEach((a, i) => {
        samples[i].hands.push(hand(a));
        if (a.userData.activity === "vendor")
          expect(
            a
              .getObjectByName("held-cup")!
              .getWorldPosition(new THREE.Vector3())
              .distanceTo(hand(a)),
          ).toBeLessThan(0.03);
        samples[i].feet.push(feet(a));
        samples[i].torso.push(a.getObjectByName("torso")!.rotation.x);
        samples[i].elbow.push(a.getObjectByName(workingArm(a))!.rotation.x);
      });
    }
    for (const s of samples) {
      expect(
        Math.max(...s.hands.map((p) => p.distanceTo(s.hands[0]))),
      ).toBeGreaterThan(0.025);
      expect(
        Math.max(...s.feet.map((p) => p.distanceTo(s.feet[0]))),
      ).toBeLessThan(0.02);
      expect(Math.max(...s.torso) - Math.min(...s.torso)).toBeGreaterThan(0.04);
      expect(Math.max(...s.elbow) - Math.min(...s.elbow)).toBeGreaterThan(0.15);
    }
    study.update(3);
    study.group.updateMatrixWorld(true);
    const at3 = actors.map(hand);
    study.update(11);
    study.update(3);
    study.group.updateMatrixWorld(true);
    actors.forEach((a, i) =>
      expect(hand(a).distanceTo(at3[i])).toBeLessThan(1e-9),
    );
    // Dynamic roots stay on the actual arch surface; pause/seek does not accumulate motion.
    expect(study.metadata().bridgeLife.passingPeople).toBeGreaterThanOrEqual(6);
    expect(bridgeHeight(0)).toBeGreaterThan(2);
    study.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line)
        o.geometry.dispose();
    });
  });
});
