import * as THREE from 'three';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const NECK_SEGMENTS=8,NECK_LENGTH=1.10;
const SEGMENT=NECK_LENGTH/NECK_SEGMENTS;
// A continuous feather collar over a short cervical chain. The body and skull
// are rigid; bend is distributed over the chain instead of one visible elbow.
export function createNeck(material){
 const rings=48,sides=28,positions=[],uv=[],indices=[],skinIndex=[],skinWeight=[];
 for(let r=0;r<=rings;r++){
  const t=r/rings,y=t*NECK_LENGTH;
  // A soft chest collar, narrow upper throat, and buried atlas attachment.
  const radius=.105+.20*(1-t)**1.65;
  const influence=t*NECK_SEGMENTS-.5,a=clamp(Math.floor(influence),0,NECK_SEGMENTS-1),b=Math.min(a+1,NECK_SEGMENTS-1),w=clamp(influence-a);
  for(let s=0;s<=sides;s++){
   const angle=s/sides*Math.PI*2,feather=1+.018*Math.cos(angle*7)*Math.sin(Math.PI*t);
   positions.push(Math.cos(angle)*radius*feather,y,Math.sin(angle)*radius*.88*feather);
   // Dark, descending neck marks; coordinates stay attached to the skin.
   uv.push((244+Math.abs(Math.sin(angle))*30)/441,1-(232+t*41)/453);
   skinIndex.push(a,b,0,0);skinWeight.push(1-w,w,0,0);
  }
 }
 for(let r=0;r<rings;r++)for(let s=0;s<sides;s++){const a=r*(sides+1)+s,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));g.setIndex(indices);g.computeVertexNormals();
 const bones=Array.from({length:NECK_SEGMENTS},(_,i)=>{const b=new THREE.Bone();b.name='Cervical group '+(i+1);if(i)b.position.y=SEGMENT;return b;});
 for(let i=1;i<bones.length;i++)bones[i-1].add(bones[i]);
 const mesh=new THREE.SkinnedMesh(g,material);mesh.name='Continuous feathered neck';mesh.add(bones[0]);mesh.bind(new THREE.Skeleton(bones));mesh.frustumCulled=false;
 function pose(end,pitch){
  const feeding=clamp(pitch/.98),up=V(0,1,0),normal=V(end.y,-end.x,0).normalize(),s=.42*(1-feeding)+.06*feeding;
  // An S-shaped guide distributes curvature smoothly. Solve its amplitude so
  // consecutive points are one bone apart; unconstrained IK can kink a chain.
  function solve(amplitude){
   const at=t=>end.clone().multiplyScalar(t).addScaledVector(normal,amplitude*(Math.sin(Math.PI*t)+s*Math.sin(2*Math.PI*t)));
   const points=[V()];let previousT=0;
   for(let i=1;i<NECK_SEGMENTS;i++){
    const previous=points[i-1];let low=previousT,high=low;
    while(high<1&&previous.distanceTo(at(high))<SEGMENT)high=Math.min(1,high+.035);
    if(previous.distanceTo(at(high))<SEGMENT)return{error:-SEGMENT*(NECK_SEGMENTS-i)+previous.distanceTo(at(high)),points};
    for(let j=0;j<22;j++){const mid=(low+high)/2;if(previous.distanceTo(at(mid))<SEGMENT)low=mid;else high=mid;}
    previousT=(low+high)/2;points.push(at(previousT));
   }
   return{error:points.at(-1).distanceTo(end)-SEGMENT,points};
  }
  let low=0,high=.30;while(solve(high).error<0&&high<2)high*=1.5;
  for(let i=0;i<30;i++){const mid=(low+high)/2;if(solve(mid).error<0)low=mid;else high=mid;}
  const points=solve((low+high)/2).points;points.push(end.clone());
  let previous=new THREE.Quaternion();
  for(let i=0;i<NECK_SEGMENTS;i++){
   const global=new THREE.Quaternion().setFromUnitVectors(up,points[i+1].clone().sub(points[i]).normalize());
   bones[i].quaternion.copy(previous).invert().multiply(global);previous=global;
  }
  return points.map(p=>p.toArray());
 }

 return{mesh,pose};
}
