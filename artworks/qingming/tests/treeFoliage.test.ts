import {expect,it,vi} from "vitest";
import * as THREE from "three";
import * as assets from "../src/referenceAssets";
import {createBridgeStudy} from "../src/bridgeStudy";
import {FEATURE_TREES,NATURE} from "../src/passageLife";

it("gives leafy plantings needle crowns and preserves explicitly bare trees at every detail",()=>{
  const original=assets.buildReferenceTree;
  const crowns:{form:string;seed:number;detail:number;vertices:number;bare:boolean}[]=[];
  // Inspect actual factory output before static batching merges individual trees.
  const spy=vi.spyOn(assets,"buildReferenceTree").mockImplementation((...args)=>{
    const tree=original(...args);let vertices=0;
    tree.traverse(n=>{
      if(n.name==="pine-needle-fascicles" && n instanceof THREE.Mesh)
        vertices+=n.geometry.getAttribute("position").count;
    });
    crowns.push({form:args[0],seed:args[1],detail:args[2]??2,vertices,bare:args[4]==="bare"});
    return tree;
  });
  let study:ReturnType<typeof createBridgeStudy>|undefined;
  try{
    study=createBridgeStudy(9243);
    const camera=new THREE.OrthographicCamera(-120,120,120,-120,.1,500);
    camera.position.set(0,150,0);camera.lookAt(0,0,0);
    study.update(0,camera,800,false);
    const planted=FEATURE_TREES.length+NATURE.filter(n=>!["willow","reed","rock"].includes(n.kind)).length;
    for(const detail of [0,1,2]){
      const level=crowns.filter(c=>c.detail===detail);
      expect(level).toHaveLength(planted);
      expect(level.filter(c=>!c.bare && c.vertices===0),`Bare crowns at detail ${detail}`).toEqual([]);
      expect(level.filter(c=>c.bare).every(c=>c.vertices===0)).toBe(true);
    }
  }finally{
    spy.mockRestore();
    study?.group.traverse(n=>{if(n instanceof THREE.Mesh||n instanceof THREE.Line)n.geometry.dispose();});
  }
});
