import {expect,it,vi} from "vitest";
import * as THREE from "three";
import * as assets from "../src/referenceTrees";

it("retains the fine deciduous shoot canopy at every detail level",async()=>{
  const {createBridgeStudy}=await import("../src/bridgeStudy");
  const {FEATURE_TREES,NATURE}=await import("../src/passageLife");
  const original=assets.buildScrollTree;
  const crowns:{form:string;seed:number;detail:number;vertices:number;bare:boolean}[]=[];
  // Inspect actual factory output before static batching merges individual trees.
  const spy=vi.spyOn(assets,"buildScrollTree").mockImplementation((...args)=>{
    const tree=original(...args);let vertices=0;
    tree.traverse(n=>{
      if(n.name==="fine-pollard-shoots" && n instanceof THREE.LineSegments)
        vertices+=n.geometry.getAttribute("position").count;
    });
    crowns.push({form:args[0],seed:args[1],detail:args[2]??2,vertices,bare:!args[4]});
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
      expect(level.filter(c=>c.vertices===0),`Bare crowns at detail ${detail}`).toEqual([]);
    }
  }finally{
    spy.mockRestore();
    study?.group.traverse(n=>{if(n instanceof THREE.Mesh||n instanceof THREE.Line)n.geometry.dispose();});
  }
});


it("keeps full fan architecture and pointed leaves through all tree detail levels",()=>{
  for(const form of ["spreading","pollard","sapling"] as const){
    let primaryCount:number|undefined;
    for(const detail of [0,1,2] as const){
      const tree=assets.buildScrollTree(form,28.61,detail,form==="spreading",false);
      if(primaryCount===undefined)primaryCount=tree.userData.shootCount;
      expect(tree.userData.shootCount).toBe(primaryCount);
      if(form!=="sapling")expect(primaryCount).toBe(29);
      expect(tree.userData.leafCount).toBeGreaterThan(400);
      let leafVertices=0;
      tree.traverse(n=>{
        if(!(n instanceof THREE.Mesh||n instanceof THREE.Line))return;
        const position=n.geometry.getAttribute("position");
        expect(position.count,n.name).toBeGreaterThan(0);
        let finite=true;
        for(let i=0;i<position.array.length;i++)if(!Number.isFinite(position.array[i]))finite=false;
        expect(finite,n.name).toBe(true);
        n.geometry.computeBoundingSphere();
        expect(Number.isFinite(n.geometry.boundingSphere!.radius),n.name).toBe(true);
        if(n.name==="pointed-fan-leaf-strokes")leafVertices+=position.count;
      });
      expect(leafVertices).toBeGreaterThan(2000);
      const bounds=new THREE.Box3().setFromObject(tree);
      expect(bounds.max.y-bounds.min.y).toBeGreaterThan(2.5);
      expect(bounds.max.x-bounds.min.x).toBeGreaterThan(1.5);
      expect(bounds.max.z-bounds.min.z).toBeGreaterThan(1.5);
      tree.traverse(n=>{if(n instanceof THREE.Mesh||n instanceof THREE.Line)n.geometry.dispose();});
    }
  }
});
