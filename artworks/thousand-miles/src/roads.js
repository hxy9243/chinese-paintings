import * as THREE from 'three';
import {approachRoads,terrainHeight} from './terrain.js';

export function buildRoads(materials){
 const group=new THREE.Group();group.name='Wooded roads continuing from both bridge banks';
 const records=[];
 for(const road of approachRoads){
  const p=[],uv=[],indices=[],samples=[];
  for(let i=0;i<road.samples.length;i++){
   const center=road.samples[i],before=road.samples[Math.max(0,i-1)],after=road.samples[Math.min(road.samples.length-1,i+1)],tangent=after.clone().sub(before).setY(0).normalize(),normal=new THREE.Vector3(-tangent.z,0,tangent.x);
   const width=road.width*(1+.045*Math.sin(i*.81));
   // Five cross-section samples sit on the same triangles as the graded bank.
   for(let j=0;j<5;j++){
    const q=center.clone().addScaledVector(normal,(j/4-.5)*width),height=i===0?road.controls[0][1]+.08:terrainHeight(q.x,q.z)+.08;
    p.push(q.x,height,q.z);uv.push(j/4,i*.23);
   }
   samples.push([center.x,terrainHeight(center.x,center.z)+.08,center.z]);
   if(i>0)for(let j=0;j<4;j++){const a=(i-1)*5+j;indices.push(a,a+1,a+6,a,a+6,a+5);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,materials.path);mesh.name=road.name;mesh.receiveShadow=true;mesh.userData={width:road.width,continuousWithBridge:true,samples};group.add(mesh);records.push({name:road.name,width:road.width,samples});
 }
 return{group,records};
}
