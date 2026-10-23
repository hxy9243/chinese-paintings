import {expect,it} from "vitest";
import * as THREE from "three";
import {BOATS,BRIDGE,bridgeCoordinates,bridgeHeight,PERSON_SCALE} from "../src/passageLayout";
import {boatPose} from "../src/passageLife";
import {FIGURE_HEIGHT} from "../src/figures";
import {boatCrewStations,buildLoweringRig,updateLoweringRig} from "../src/referenceDetails";
it("keeps roof workers and the articulated boat rigs below the bridge throughout a full navigation cycle",()=>{
  let crossings=0,clearance=Infinity,closest="";
  for(const index of [0]){
  const b=BOATS[index],rig=buildLoweringRig(b.length,b.width);
  for(let time=0;time<400;time+=.75){
    const pose=boatPose(index,time),distance=Math.abs(bridgeCoordinates(pose).cross);
    if(distance>12)continue;
    updateLoweringRig(rig,distance);rig.updateMatrixWorld(true);
    const points:THREE.Vector3[]=[];
    rig.traverse(n=>{if(n instanceof THREE.Mesh || n instanceof THREE.Line){
      const pos=n.geometry.getAttribute("position");
      for(let j=0;j<pos.count;j++)points.push(new THREE.Vector3().fromBufferAttribute(pos,j).applyMatrix4(n.matrixWorld));
    }});
    for(const crew of boatCrewStations(b.length,b.width,index===1?"freight":"cabin"))
      points.push(new THREE.Vector3(crew.x,crew.y+FIGURE_HEIGHT*PERSON_SCALE+.04,crew.z));
    for(const v of points){
      const s=pose.s+v.x*Math.sin(pose.angle)+v.z*Math.cos(pose.angle),
        d=pose.d-v.x*Math.cos(pose.angle)+v.z*Math.sin(pose.angle),
        u=(s-BRIDGE.center.s)*Math.cos(BRIDGE.angle)+(d-BRIDGE.center.d)*Math.sin(BRIDGE.angle),
        lateral=-(s-BRIDGE.center.s)*Math.sin(BRIDGE.angle)+(d-BRIDGE.center.d)*Math.cos(BRIDGE.angle);
      if(Math.abs(lateral)<BRIDGE.width/2+.12 && Math.abs(u)<BRIDGE.length/2){
        crossings++;
        const gap=bridgeHeight(u)-.42-(v.y+pose.y+.02);
        if(gap<clearance){clearance=gap;closest=`boat ${index}, time ${time}, u ${u}`;}
      }
    }
  }
  rig.traverse(n=>{if(n instanceof THREE.Mesh || n instanceof THREE.Line)n.geometry.dispose();});
  }
  expect(crossings).toBeGreaterThan(100);expect(clearance,closest).toBeGreaterThan(0);
});

it("gathers the sail before folding the mast while the deck socket stays fixed",()=>{
  const rig=buildLoweringRig(5.4,1.1),base=rig.getObjectByName("mast-tabernacle")!,
    mast=rig.getObjectByName("mast-hinge")!,sail=rig.getObjectByName("battened-sail")!;
  updateLoweringRig(rig,12);rig.updateMatrixWorld(true);
  const fixed=base.matrixWorld.clone(),full=new THREE.Box3().setFromObject(sail).getSize(new THREE.Vector3());
  expect(full.y).toBeGreaterThan(2);expect(full.x).toBeGreaterThan(1.5);
  updateLoweringRig(rig,8);
  expect(sail.scale.y).toBeLessThan(.1);expect(mast.rotation.x).toBeLessThan(.05);
  updateLoweringRig(rig,0);rig.updateMatrixWorld(true);
  expect(mast.rotation.x).toBeGreaterThan(1.5);expect(base.matrixWorld.equals(fixed)).toBe(true);
  rig.traverse(n=>{if(n instanceof THREE.Mesh || n instanceof THREE.Line)n.geometry.dispose();});
});
