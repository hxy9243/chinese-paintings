import { expect, it } from "vitest";
import * as THREE from "three";
import { ELEVATION } from "../src/bridgeStudy";
import { BUILDING_KINDS } from "../src/passageLife";
import { GROUND_Y, HALLS } from "../src/passageLayout";
import {
  PANORAMA,
  PANORAMA_CAMERA,
  ROOF_MASS_RISE,
  TRACED_BUILDINGS,
  cropToPanorama,
  panoramaToPlan,
  planToPanorama,
} from "../src/paintingLayout";
import { REFERENCE_AZIMUTH, scrollPoint } from "../src/scrollLayout";

it("registers the panorama through the app's own comparison camera", () => {
  expect(PANORAMA_CAMERA.polar).toBeCloseTo(ELEVATION);
  // Reproduce Mock3D's orthographic camera at zero yaw and pitch.
  const { width: W, height: H } = PANORAMA,
    span = Math.max(10, 26 / (W / H)),
    zoom = (PANORAMA_CAMERA.pixelsPerUnit * 2 * span) / H;
  const camera = new THREE.OrthographicCamera(-span * W / H, span * W / H, span, -span, 0.1, 250);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  const target = scrollPoint(PANORAMA_CAMERA.target.s, PANORAMA_CAMERA.target.d);
  target.y = PANORAMA_CAMERA.targetY;
  camera.position.copy(target).add(new THREE.Vector3().setFromSphericalCoords(110, ELEVATION, REFERENCE_AZIMUTH));
  camera.lookAt(target);
  camera.updateMatrixWorld();
  for (const [s, d, y] of [[-20, 8, GROUND_Y], [12, -6, 2.4], [-40, 15, 0.9]]) {
    const world = scrollPoint(s, d);
    world.y = y;
    const ndc = world.project(camera),
      expected = planToPanorama(s, d, y);
    expect((ndc.x + 1) / 2 * W).toBeCloseTo(expected.x, 3);
    expect((1 - ndc.y) / 2 * H).toBeCloseTo(expected.y, 3);
    const back = panoramaToPlan(expected.x, expected.y, y);
    expect(back.s).toBeCloseTo(s, 6);
    expect(back.d).toBeCloseTo(d, 6);
  }
});

it("stitches the crops into one continuous panorama", () => {
  // Crop widths: crossroads 1601, bend 2048, bridge 2048 pixels.
  const { crossroads, bend, bridge } = PANORAMA.crops;
  expect(cropToPanorama("crossroads", 1601, 0).x).toBeGreaterThan(bend.x);
  expect(cropToPanorama("bend", 2048, 0).x).toBeGreaterThan(bridge.x);
  expect(Math.round(cropToPanorama("bridge", 2048, 0).x)).toBe(PANORAMA.width);
  expect(crossroads.x).toBe(0);
});

it("puts every traced building's roof on its painted roof", () => {
  expect(new Set(TRACED_BUILDINGS.map((t) => t.hall)).size).toBe(TRACED_BUILDINGS.length);
  for (const t of TRACED_BUILDINGS) {
    const h = HALLS[t.hall],
      p = planToPanorama(h.s, h.d, GROUND_Y + h.height + ROOF_MASS_RISE);
    expect(Math.hypot(p.x - t.roof[0], p.y - t.roof[1]), t.id).toBeLessThan(1);
    expect(h.side).toBe("near");
  }
  const gate = TRACED_BUILDINGS.find((t) => t.id === "inn-festooned-gatehouse")!;
  expect(BUILDING_KINDS[gate.hall]).toBe("festoon-gate");
});
