import * as THREE from 'three';
export function taperedTube(points,r0,r1,radial=8,steps=12){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:new THREE.Vector3(...p)));
 const frames=curve.computeFrenetFrames(steps,false),p=[],uv=[],idx=[];
 for(let i=0;i<=steps;i++){
  let t=i/steps,c=curve.getPoint(t),r=THREE.MathUtils.lerp(r0,r1,t)*(1+.025*Math.sin(i*3.7));
  for(let j=0;j<=radial;j++){
   const angle=j/radial*Math.PI*2,n=frames.normals[i].clone().multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[i],Math.sin(angle));
   const v=c.clone().addScaledVector(n,r);p.push(v.x,v.y,v.z);uv.push(j/radial,t*3);
  }
 }
 for(let i=0;i<steps;i++)for(let j=0;j<radial;j++){const a=i*(radial+1)+j,b=a+1,c=a+radial+2,d=a+radial+1;idx.push(a,b,c,a,c,d);}
 const low=p.length/3;p.push(...curve.getPoint(0).toArray());uv.push(.5,0);
 const high=p.length/3;p.push(...curve.getPoint(1).toArray());uv.push(.5,1);
 for(let j=0;j<radial;j++){idx.push(low,j+1,j);const a=steps*(radial+1)+j;idx.push(high,a,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function box(w,h,d,material,x=0,y=0,z=0,name='Timber member'){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.name=name;m.castShadow=true;m.receiveShadow=true;return m;
}
export function pipe(a,b,r,material,name='Beam'){
 const m=new THREE.Mesh(taperedTube([a,b],r,r,8,2),material);m.name=name;m.castShadow=true;m.receiveShadow=true;return m;
}
export function makeLeaf(){
 const p=[],uv=[],idx=[],steps=6;
 // A cupped, tapered blade with a curved edge, instead of a six-corner chip.
 for(let j=0;j<=steps;j++){
  const t=j/steps,width=.23*Math.pow(Math.sin(t*Math.PI),.82);
  for(const s of [-1,0,1]){p.push(s*width+Math.sin(t*Math.PI)*.035,Math.sin(t*Math.PI)*(s===0?.085:.025),t-.5);uv.push((s+1)/2,t);}
 }
 for(let j=0;j<steps;j++)for(let k=0;k<2;k++){const a=j*3+k;idx.push(a,a+3,a+1,a+1,a+3,a+4);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

// Five open, tapered sprays occupy different planes. Their pointed silhouette
// reads as branch-tip foliage from an orbit, without a spherical crown or card.
export function makeLeafSpray(){
 const p=[],uv=[],idx=[];
 for(let k=0;k<5;k++){
  const a=k*2.399,reach=.66+(k%3)*.12,base=p.length/3;
  const end=new THREE.Vector3(Math.cos(a)*reach,.18+(k%3)*.18,Math.sin(a)*reach);
  const side=new THREE.Vector3(-Math.sin(a),.12,Math.cos(a)).multiplyScalar(.055+(k%2)*.025);
  const root=new THREE.Vector3(0,-.18,0),middle=root.clone().lerp(end,.53);
  for(const v of [root,middle.clone().add(side),end,middle.clone().sub(side)])p.push(...v.toArray());
  uv.push(.5,0,0,.5,.5,1,1,.5);idx.push(base,base+1,base+2,base,base+2,base+3);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
