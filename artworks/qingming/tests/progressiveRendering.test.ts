import {expect,it} from "vitest";
import * as THREE from "three";
import {RenderDemand} from "../src/renderDemand";
import {createProgressiveScene,type BufferedChunk} from "../src/progressiveScene";
it("renders a coarse drag frame, refines after settling, and stops drawing when paused",()=>{
  const demand=new RenderDemand();
  demand.interaction(true,0);expect(demand.takeFrame(5,false,false)).toEqual({draw:true,preview:true});
  demand.invalidate(40,true);expect(demand.takeFrame(45,false,false).preview).toBe(true);
  demand.interaction(false,60);expect(demand.takeFrame(70,false,false).preview).toBe(true);
  expect(demand.nextDelay(70,false,false)).toBe(170);
  expect(demand.takeFrame(240,false,false)).toEqual({draw:true,preview:false});
  expect(demand.nextDelay(240,false,false)).toBeNull();
  expect(demand.takeFrame(400,false,false).draw).toBe(false);
  demand.invalidate(450);expect(demand.takeFrame(450,false,false).draw).toBe(true);
  expect(demand.takeFrame(480,true,false).draw).toBe(true);
});
it("builds only visible districts on demand and reuses their cached detail after dragging away",()=>{
  const root=new THREE.Group(),camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,50);
  const chunks:BufferedChunk[]=[0,12].map((x,i)=>({id:String(i),bounds:new THREE.Box3(new THREE.Vector3(x-1,-1,-1),new THREE.Vector3(x+1,1,1)),coarse:new THREE.Group(),buildFine:()=>new THREE.Group()}));
  const scene=createProgressiveScene(root,chunks);
  camera.position.set(0,0,10);camera.lookAt(0,0,0);
  scene.update(camera,true);expect(chunks[0].coarse.visible).toBe(true);expect(chunks.every(c=>!c.fine)).toBe(true);
  scene.update(camera,false);expect(chunks[0].fine?.visible).toBe(true);expect(chunks[1].fine).toBeUndefined();
  camera.position.x=12;camera.lookAt(12,0,0);scene.update(camera,true);
  expect(chunks[0].fine?.visible).toBe(false);expect(chunks[1].coarse.visible).toBe(true);
  scene.update(camera,false);expect(chunks[1].builds).toBe(1);
  camera.position.x=0;camera.lookAt(0,0,0);scene.update(camera,false);
  expect(chunks[0].builds).toBe(1);expect(chunks[0].fine?.visible).toBe(true);
});
