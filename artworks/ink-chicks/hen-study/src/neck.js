import * as THREE from 'three';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const NECK_SEGMENTS=8,NECK_LENGTH=1.10;
const SEGMENT=NECK_LENGTH/NECK_SEGMENTS;
// The cervical chain is buried inside a feather mantle. Its broad lower
// skirt belongs to the shoulder; the smaller upper ruff cradles the skull.
// Front/back widths differ, giving a deep nape and a rounded breast curve.
const PROFILE=[
 [0,.25,.46,.31],[.18,.35,.49,.36],[.38,.31,.42,.33],
 [.60,.235,.33,.265],[.80,.175,.235,.205],[1,.125,.16,.155]
];
function profile(t){
 t=clamp(t);const i=Math.min(PROFILE.length-2,PROFILE.findIndex((p,j)=>j<PROFILE.length-1&&t<=PROFILE[j+1][0]));
 const a=PROFILE[Math.max(0,i)],b=PROFILE[Math.max(0,i)+1],u=clamp((t-a[0])/(b[0]-a[0])),s=u*u*(3-2*u);
 return a.slice(1).map((v,k)=>v+(b[k+1]-v)*s);
}
export function createNeck(material){
 const rings=48,sides=32,positions=[],uv=[],indices=[],skinIndex=[],skinWeight=[];
 function vertex(x,y,z,u,v){
  positions.push(x,y,z);uv.push(u,v);
  const t=clamp(y/NECK_LENGTH),influence=t*NECK_SEGMENTS-.5,a=clamp(Math.floor(influence),0,NECK_SEGMENTS-1),b=Math.min(a+1,NECK_SEGMENTS-1),w=clamp(influence-a);
  // Feather roots are planted in the breast, rather than turning with the
  // lowest vertebra and revealing a seam where neck and body meet.
  const moving=clamp(t/.23),blend=moving*moving*(3-2*moving);
  skinIndex.push(a,b,NECK_SEGMENTS,0);skinWeight.push((1-w)*blend,w*blend,1-blend,0);
 }
 for(let r=0;r<=rings;r++){
  const t=r/rings,y=t*NECK_LENGTH,[front,back,side]=profile(t);
  for(let s=0;s<=sides;s++){
   const angle=s/sides*Math.PI*2,c=Math.cos(angle),sn=Math.sin(angle);
   const scallop=1+.022*Math.cos(angle*8)*Math.sin(Math.PI*t);
   const x=c*(c<0?front:back)*scallop,z=sn*side*scallop;
   vertex(x,y,z,(262-38*t+Math.abs(sn)*15+c*5)/441,1-(231+43*t)/453);
  }
 }
 for(let r=0;r<rings;r++)for(let s=0;s<sides;s++){const a=r*(sides+1)+s,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
 // Broad, overlapping hackle tips soften the outline. These are actual
 // feather volumes, mirrored across the hen and bound to the same chain.
 for(const [row,level]of [.17,.39,.61,.79].entries()){
  const count=12;
  for(let j=0;j<count;j++){
   const angle=(j+(row%2)*.5)/count*Math.PI*2,c=Math.cos(angle),sn=Math.sin(angle);
   const t=level+.035*Math.cos(angle*3),[front,back,side]=profile(t),halfLength=.20-.075*t,width=.15-.06*t;
   const center=V(c*(c<0?front:back)*.96,t*NECK_LENGTH,sn*side*.96);
   const normal=V(c,0,sn),tangent=V(-sn,0,c),offset=positions.length/3;
   const lat=10,lon=12;
   for(let v=0;v<=lat;v++)for(let u=0;u<=lon;u++){
    const phi=v/lat*Math.PI,theta=u/lon*Math.PI*2,long=Math.cos(phi),rim=Math.sin(phi);
    // Rounded teardrops overlap like brush-loaded feather strokes.
    const taper=.82+.18*(long+1)/2;
    const p=center.clone().addScaledVector(tangent,Math.cos(theta)*rim*width*taper).addScaledVector(normal,Math.sin(theta)*rim*.034);
    p.y+=long*halfLength;
    // Source patches vary down the mantle but remain identical on both sides.
    const sourceX=241+row*1.6+Math.abs(sn)*8+(p.x-center.x)/width*12;
    const sourceY=244+row*5.5-long*11;
    vertex(p.x,p.y,p.z,sourceX/441,1-sourceY/453);
   }
   for(let v=0;v<lat;v++)for(let u=0;u<lon;u++){
    const a=offset+v*(lon+1)+u,b=a+lon+1;indices.push(a,b,a+1,a+1,b,b+1);
   }
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));g.setIndex(indices);g.computeVertexNormals();
 const bones=Array.from({length:NECK_SEGMENTS},(_,i)=>{const b=new THREE.Bone();b.name='Cervical group '+(i+1);if(i)b.position.y=SEGMENT;return b;});
 for(let i=1;i<bones.length;i++)bones[i-1].add(bones[i]);
 const anchor=new THREE.Bone();anchor.name='Feather mantle breast anchor';
 const mesh=new THREE.SkinnedMesh(g,material);mesh.name='Continuous feathered neck';mesh.add(bones[0],anchor);mesh.bind(new THREE.Skeleton([...bones,anchor]));mesh.frustumCulled=false;
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

 function poseAngles(angles){
  const points=[V()];let previous=new THREE.Quaternion();
  for(let i=0;i<NECK_SEGMENTS;i++){
   const global=new THREE.Quaternion().setFromAxisAngle(V(0,0,1),angles[i]);
   bones[i].quaternion.copy(previous).invert().multiply(global);previous=global;
   points.push(points.at(-1).clone().add(V(0,SEGMENT,0).applyQuaternion(global)));
  }
  return points.map(p=>p.toArray());
 }
 return{mesh,pose,poseAngles};
}
