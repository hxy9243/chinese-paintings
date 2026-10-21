import {expect,it} from "vitest";
import * as THREE from "three";
import {BOATS,BRIDGE,bridgeHeight,PERSON_SCALE} from "../src/passageLayout";
import {boatPose} from "../src/passageLife";
import {FIGURE_HEIGHT} from "../src/figures";
import {boatCrewStations,buildLoweringRig,loweringRigAngle} from "../src/referenceDetails";
it("keeps roof workers and the lowering freight rig below the bridge throughout a full navigation cycle",()=>{
  const b=BOATS[1],rig=buildLoweringRig(b.length,b.width);
  const vertices:THREE.Vector3[]=[];
  rig.updateMatrixWorld(true);
  rig.traverse(n=>{if(n instanceof THREE.Mesh || n instanceof THREE.Line){
    const pos=n.geometry.getAttribute("position");
    for(let j=0;j<pos.count;j++)vertices.push(new THREE.Vector3().fromBufferAttribute(pos,j).applyMatrix4(n.matrixWorld));
  }});
  let crossings=0;
  for(let time=0;time<400;time+=.75){
    const pose=boatPose(1,time),angle=loweringRigAngle(Math.abs(pose.s-BRIDGE.center.s));
    const pivot=new THREE.Vector3(b.width*.22,.36,-b.length*.26);
    const points=vertices.map(v=>v.clone().sub(pivot).applyAxisAngle(new THREE.Vector3(1,0,0),angle).add(pivot));
    for(const crew of boatCrewStations(b.length,b.width,"freight"))
      points.push(new THREE.Vector3(crew.x,crew.y+FIGURE_HEIGHT*PERSON_SCALE+.04,crew.z));
    for(const v of points){
      const s=pose.s+v.x*Math.sin(pose.angle)+v.z*Math.cos(pose.angle),
        d=pose.d-v.x*Math.cos(pose.angle)+v.z*Math.sin(pose.angle),
        u=(s-BRIDGE.center.s)*Math.cos(BRIDGE.angle)+(d-BRIDGE.center.d)*Math.sin(BRIDGE.angle),
        lateral=-(s-BRIDGE.center.s)*Math.sin(BRIDGE.angle)+(d-BRIDGE.center.d)*Math.cos(BRIDGE.angle);
      if(Math.abs(lateral)<BRIDGE.width/2+.12 && Math.abs(u)<BRIDGE.length/2){
        crossings++;
        expect(v.y+pose.y+.02,`time ${time}, u ${u}`).toBeLessThan(bridgeHeight(u)-.42);
      }
    }
  }
  expect(crossings).toBeGreaterThan(100);
  rig.traverse(n=>{if(n instanceof THREE.Mesh || n instanceof THREE.Line)n.geometry.dispose();});
});
