import * as THREE from 'three';
import {waterToWorld,worldToWater,swimmerOrientation} from './water-space.js';

const hash=n=>{const x=Math.sin(n*127.13+71.7)*43758.5453;return x-Math.floor(x);};
// Put the entire articulated silhouette outside the current camera, including
// feelers and claws. Translate in the water plane; never fade or scale it in.
export function planEntry(camera,animal,serial){
  camera.updateMatrixWorld(true);
  const side=serial%2?1:-1,y=(hash(serial+31)-.5)*1.1,z=animal.definition.start[2];
  const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),-z);
  const at=(x,y)=>{ray.setFromCamera(new THREE.Vector2(x,y),camera);return ray.ray.intersectPlane(plane,new THREE.Vector3());};
  const edge=at(side,y),target=at(-side*.18,y*.65),start=worldToWater(edge.toArray()),end=worldToWater(target.toArray());
  const heading=Math.atan2(end[1]-start[1],end[0]-start[0]);
  animal.placement.position.copy(edge);animal.placement.quaternion.copy(swimmerOrientation(heading,0,0));animal.placement.updateMatrixWorld(true);
  let min=Infinity,max=-Infinity;const p=new THREE.Vector3();
  animal.model.root.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.visible||!mesh.layers.isEnabled(1))return;
    const positions=mesh.geometry.attributes.position;
    for(let i=0;i<positions.count;i++){p.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera);min=Math.min(min,p.x);max=Math.max(max,p.x);}
  });
  const shift=side>0?1.018-min:-1.018-max;
  edge.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),shift*(camera.right-camera.left)*.5/camera.zoom);
  const position=worldToWater(edge.toArray()),speed=animal.definition.species==='fish'?50:30;
  return{start:position,velocity:[Math.cos(heading)*speed,Math.sin(heading)*speed,0],side};
}
