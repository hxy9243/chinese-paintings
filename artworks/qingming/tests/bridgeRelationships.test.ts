import { expect, it } from "vitest";
import * as THREE from "three";
import { BOATS, BRIDGE, bridgeCoordinates, bridgePoint, onBank, shoreDepth } from "../src/passageLayout";
import { boatPose } from "../src/passageLife";
import { REFERENCE_AZIMUTH, scrollPoint } from "../src/scrollLayout";

it("places the rendered boat keel perpendicular to and through the bridge opening", () => {
  const bridgeDirection=scrollPoint(BRIDGE.far.s,BRIDGE.far.d)
    .sub(scrollPoint(BRIDGE.near.s,BRIDGE.near.d)).normalize();
  for(const time of [0,30,60,120,180,240]) {
    const pose=boatPose(0,time), b=BOATS[0];
    // The boat geometry runs along local Z, while the bridge runs along local X.
    const keel=new THREE.Vector3(0,0,1).applyEuler(new THREE.Euler(
      pose.pitch,REFERENCE_AZIMUTH+Math.PI/2-pose.angle,pose.roll));
    expect(Math.abs(keel.dot(bridgeDirection))).toBeLessThan(.004);
    const position=scrollPoint(pose.s,pose.d);
    const ends=[-1,1].map(sign=>{
      const p=position.clone().addScaledVector(keel,sign*b.length/2);
      const s=p.x*Math.cos(REFERENCE_AZIMUTH)-p.z*Math.sin(REFERENCE_AZIMUTH);
      const d=p.x*Math.sin(REFERENCE_AZIMUTH)+p.z*Math.cos(REFERENCE_AZIMUTH);
      return bridgeCoordinates({s,d});
    });
    expect(ends[0].cross).toBeLessThan(-BRIDGE.width/2-1);
    expect(ends[1].cross).toBeGreaterThan(BRIDGE.width/2+1);
    expect(Math.abs(ends[0].along)).toBeLessThan(.03);
    expect(Math.abs(ends[1].along)).toBeLessThan(.03);
  }
});

it("puts the near-bank projection under the abutment rather than beside the bridge", () => {
  const foot=-BRIDGE.length/2;
  expect(onBank("near",bridgePoint(foot+.35))).toBe(true);
  expect(onBank("near",bridgePoint(foot+1.6))).toBe(false);
  // The bank to the left must recede behind the landing. The previous detached
  // peak projected into the water six units beside the bridge's actual base.
  for(let s=BRIDGE.near.s-6;s<BRIDGE.near.s-2;s+=.1) {
    const p=bridgeCoordinates({s,d:shoreDepth("near",s)});
    expect(p.along,`shore at ${s}`).toBeLessThan(foot-.5);
  }
});
