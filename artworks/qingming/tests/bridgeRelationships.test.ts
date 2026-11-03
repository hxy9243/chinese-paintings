import { expect, it } from "vitest";
import * as THREE from "three";
import { BOATS, BRIDGE, bridgeCoordinates, bridgePoint, onBank, shoreDepth } from "../src/passageLayout";
import { boatPose } from "../src/passageLife";
import { BOAT_PERIOD, rigBridgeDistance } from "../src/boatNavigation";
import { loweringRigAngle } from "../src/referenceDetails";
import { REFERENCE_AZIMUTH, scrollPoint } from "../src/scrollLayout";

it("carries the main boat along the channel and squarely through the bridge opening", () => {
  const bridgeDirection=scrollPoint(BRIDGE.far.s,BRIDGE.far.d)
    .sub(scrollPoint(BRIDGE.near.s,BRIDGE.near.d)).normalize();
  const b=BOATS[0];
  let passages=0,previous=bridgeCoordinates(boatPose(0,0)).cross;
  for(let time=0;time<BOAT_PERIOD*1.5;time+=.5) {
    const pose=boatPose(0,time),centre=bridgeCoordinates(pose);
    if(Math.sign(centre.cross)!==Math.sign(previous)&&Math.abs(centre.cross)<1)passages++;
    previous=centre.cross;
    if(Math.abs(centre.cross)>BRIDGE.width/2)continue;
    // Beneath the deck the keel lies across the bridge, both ends in open water.
    expect(Math.abs(centre.along),`along at ${time}`).toBeLessThan(2.5);
    const keel=new THREE.Vector3(0,0,1).applyEuler(new THREE.Euler(
      pose.pitch,REFERENCE_AZIMUTH+Math.PI/2-pose.angle,pose.roll));
    expect(Math.abs(keel.dot(bridgeDirection)),`keel at ${time}`).toBeLessThan(.1);
    const position=scrollPoint(pose.s,pose.d);
    const ends=[-1,1].map(sign=>{
      const p=position.clone().addScaledVector(keel,sign*b.length/2);
      const s=p.x*Math.cos(REFERENCE_AZIMUTH)-p.z*Math.sin(REFERENCE_AZIMUTH);
      const d=p.x*Math.sin(REFERENCE_AZIMUTH)+p.z*Math.cos(REFERENCE_AZIMUTH);
      return bridgeCoordinates({s,d}).cross;
    }).sort((x,y)=>x-y);
    expect(ends[0]).toBeLessThan(-BRIDGE.width/2-1);
    expect(ends[1]).toBeGreaterThan(BRIDGE.width/2+1);
  }
  // It passes beneath the arch once per passage, and is painted there at t=0.
  expect(passages).toBeGreaterThanOrEqual(1);
  expect(Math.abs(bridgeCoordinates(boatPose(0,0)).cross)).toBeLessThan(.3);
  expect(Math.abs(Math.sin(boatPose(0,0).angle-BRIDGE.angle-Math.PI/2))).toBeLessThan(.01);
});

it("lowers the main boat's folding mast near the bridge and raises it again once clear", () => {
  const lowered:number[]=[],raised:number[]=[];
  for(let time=0;time<BOAT_PERIOD;time+=1) {
    const pose=boatPose(0,time),cross=Math.abs(bridgeCoordinates(pose).cross),angle=loweringRigAngle(rigBridgeDistance(0,pose));
    if(cross<BRIDGE.width/2)lowered.push(angle);
    if(cross>14&&Math.abs(bridgeCoordinates(pose).along)<30)raised.push(angle);
  }
  expect(lowered.length).toBeGreaterThan(0);
  expect(raised.length).toBeGreaterThan(0);
  // Near the arch the mast lies almost flat; well clear of it, it stands upright.
  expect(Math.min(...lowered)).toBeGreaterThan(Math.PI/2-.2);
  expect(Math.max(...raised)).toBeLessThan(.1);
});

it("puts the near-bank projection under the abutment rather than beside the bridge", () => {
  const foot=-BRIDGE.length/2;
  expect(onBank("near",bridgePoint(foot+.35))).toBe(true);
  expect(onBank("near",bridgePoint(foot+1.6))).toBe(false);
  // The bank beside the bridge must not reach further into the river than the
  // abutment. A detached peak once projected six units beside the base.
  const abutmentEdge=bridgePoint(foot+1.6).d;
  for(let s=BRIDGE.near.s-6;s<BRIDGE.near.s-2;s+=.1)
    expect(shoreDepth("near",s),`shore at ${s}`).toBeGreaterThan(abutmentEdge-.3);
});
