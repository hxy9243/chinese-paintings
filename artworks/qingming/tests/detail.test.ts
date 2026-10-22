import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { chooseDetail, projectedHeightPixels } from "../../../packages/scene-kit/lod";
import { createBridgeStudy } from "../src/bridgeStudy";
import { FIGURE_TYPES } from "../src/figureTypes";
import { HALLS, REFERENCE_TREE, onBank } from "../src/passageLayout";
import { FEATURE_TREES } from "../src/passageLife";

describe("reference landmarks and geometry detail", () => {
  it("retains the perpendicular foreground gable and explicitly placed old tree", () => {
    const hall=HALLS[9];
    expect(hall.gable).toBe(true);
    expect(hall.angle).toBeCloseTo(Math.PI/2);
    HALLS.forEach(h=>expect(Number.isFinite(h.angle)).toBe(true));
    expect(HALLS).toHaveLength(27);
    expect(FEATURE_TREES).toContainEqual({...REFERENCE_TREE,id:"near-quay-old-tree"});
    expect(FEATURE_TREES.map(t=>t.id)).toContain("foreground-pine");
    expect(FEATURE_TREES.map(t=>t.id)).toContain("west-bend-pine");
    expect(onBank("near",REFERENCE_TREE,.7)).toBe(true);
    // The tree must be behind the foreground roof line, beside the water.
    expect(REFERENCE_TREE.d).toBeLessThan(HALLS[17].d-HALLS[17].depth/2);
  });
  it("uses projected size for perspective and orthographic cameras with stable thresholds", () => {
    expect(projectedHeightPixels({height:1,viewportHeight:800,zoom:2,orthographicSpan:20})).toBe(80);
    const near=projectedHeightPixels({height:1,viewportHeight:800,zoom:1,distance:10,verticalFov:50});
    const far=projectedHeightPixels({height:1,viewportHeight:800,zoom:1,distance:100,verticalFov:50});
    expect(near).toBeCloseTo(far*10);
    expect(chooseDetail(19,2)).toBe(2);expect(chooseDetail(19,1)).toBe(1);
    expect(chooseDetail(9,0)).toBe(0);expect(chooseDetail(9,1)).toBe(1);
  });
  it("renders fewer actual crowd triangles when zoomed out and restores close detail", () => {
    const study=createBridgeStudy(9243), camera=new THREE.OrthographicCamera(-26,26,13,-13,.1,250);
    camera.position.set(0,80,80);camera.lookAt(0,0,0);
    camera.zoom=2.5;camera.updateProjectionMatrix();study.update(8,camera,760);
    const close=study.metadata();
    camera.zoom=.3;camera.updateProjectionMatrix();study.update(8,camera,760);
    const far=study.metadata();
    const triangles=(m:typeof close)=>m.crowd.levels.reduce((n,l)=>n+l.triangles,0);
    expect(close.crowd.variants).toBe(16);
    expect(new Set(FIGURE_TYPES.map(f=>f.name)).size).toBe(16);
    expect(far.crowd.levels[0].actors).toBeGreaterThan(100);
    const visible=(m:typeof close)=>m.crowd.levels.reduce((n,l)=>n+l.visibleActors,0);
    // The close camera culls most actors; compare geometry per visible person.
    expect(visible(close)).toBeGreaterThan(0);expect(visible(far)).toBeGreaterThan(visible(close));
    expect(triangles(far)/visible(far)).toBeLessThan(triangles(close)/visible(close)*.35);
    expect(far.vegetationLevel).toBeLessThan(close.vegetationLevel);
    const counts=study.group.children.filter(o=>o.name==="horse-cart");
    expect(new Set(counts.map(o=>o.userData.trafficKind))).toEqual(new Set(["horse-cart","covered-cart","ox-cart","donkey-cart","pack-horse","handcart"]));
    camera.zoom=2.5;camera.updateProjectionMatrix();study.update(8,camera,760);expect(study.metadata().crowd).toEqual(close.crowd);
    study.group.traverse(n=>{if(n instanceof THREE.Mesh||n instanceof THREE.Line)n.geometry.dispose();});
  });
});
