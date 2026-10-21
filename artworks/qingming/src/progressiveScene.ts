import * as THREE from "three";
export interface BufferedChunk {id:string;bounds:THREE.Box3;coarse:THREE.Group;buildFine:()=>THREE.Group;fine?:THREE.Group;visible?:boolean;builds?:number}
/** Cache detailed chunks, cull offscreen districts, and admit one build per frame. */
export function createProgressiveScene(parent:THREE.Group,chunks:BufferedChunk[]){
  chunks.forEach(c=>parent.add(c.coarse));
  const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4();
  let pending=0;
  return {
    update(camera?:THREE.Camera,preview=false,budget=1){
      if(camera){camera.updateMatrixWorld();matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);}
      pending=0;
      for(const c of chunks){
        const visible=!!camera&&frustum.intersectsBox(c.bounds);c.visible=visible;
        if(visible&&!preview&&!c.fine){
          if(budget>0){c.fine=c.buildFine();c.builds=(c.builds??0)+1;parent.add(c.fine);budget--;}
          else pending++;
        }
        c.coarse.visible=visible&&(preview||!c.fine);
        if(c.fine)c.fine.visible=visible&&!preview;
      }
      return pending;
    },
    metadata:()=>({pending,chunks:chunks.map(c=>({id:c.id,visible:!!c.visible,cached:!!c.fine,builds:c.builds??0,detail:c.fine?.visible?2:0}))}),
  };
}
