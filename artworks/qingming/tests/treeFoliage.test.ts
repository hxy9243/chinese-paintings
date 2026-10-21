import {expect,it,vi} from "vitest";
import * as THREE from "three";
import * as assets from "../src/referenceAssets";
import {createBridgeStudy} from "../src/bridgeStudy";
import {FEATURE_TREES,NATURE} from "../src/passageLife";

it("gives every planted pine a needle crown at every level of scene detail",()=>{
  const original=assets.buildReferenceTree;
  const crowns:{form:string;seed:number;detail:number;vertices:number}[]=[];
  // Inspect actual factory output before static batching merges individual trees.
  const spy=vi.spyOn(assets,"buildReferenceTree").mockImplementation((...args)=>{
    const tree=original(...args);let vertices=0;
    tree.traverse(n=>{
      if(n.name==="pine-needle-fascicles" && n instanceof THREE.Mesh)
        vertices+=n.geometry.getAttribute("position").count;
    });
    crowns.push({form:args[0],seed:args[1],detail:args[2]??2,vertices});
    return tree;
  });
  let study:ReturnType<typeof createBridgeStudy>|undefined;
  try{
    study=createBridgeStudy(9243);
    const planted=FEATURE_TREES.length+NATURE.filter(n=>!["willow","reed","rock"].includes(n.kind)).length;
    for(const detail of [0,1,2]){
      const level=crowns.filter(c=>c.detail===detail);
      expect(level).toHaveLength(planted);
      expect(level.filter(c=>c.vertices===0),`Bare crowns at detail ${detail}`).toEqual([]);
    }
  }finally{
    spy.mockRestore();
    study?.group.traverse(n=>{if(n instanceof THREE.Mesh||n instanceof THREE.Line)n.geometry.dispose();});
  }
});
