import * as THREE from "three";
import {paintMaterial,createDryInk} from "./paintMaterial";

const timber=paintMaterial(0x967c51),dark=paintMaterial(0x60543f),plaster=paintMaterial(0xc5b58b),
  tile=paintMaterial(0x786746),cloth=paintMaterial(0xc9ba95),ink=createDryInk(.5);
type P=[number,number,number];
function box(root:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,material=timber){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);root.add(m);return m;
}
function beam(root:THREE.Object3D,a:P,b:P,r=.022,material=timber){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),6),material);m.position.copy(A.add(B).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());root.add(m);return m;
}
function strokes(root:THREE.Object3D,positions:number[],name:string){
  const m=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3)),ink);m.name=name;root.add(m);
}
type Roof={x0:number;x1:number;z0:number;z1:number;height:(x:number,z:number)=>number};

/** Two rectangular timber wings join at a real roof valley, not two intersecting solid roofs. */
export function buildCrossroadsHouse(w:number,d:number,h:number,shop=true){
  const root=new THREE.Group();root.name=shop?"crossroads-open-shop":"cross-wing-house";
  const wing=w*.42,backDepth=d*.46,backZ=-d*.27,frontZ=d*.5,wall=h;
  const eave=h+.12,rise=Math.min(.84,d*.24),wingRise=rise*.9;
  const main:Roof={x0:-w/2-.18,x1:w/2+.18,z0:-d/2-.18,z1:-d*.04+.18,
    height:(_x,z)=>eave+rise*(1-Math.abs(z-backZ)/(backDepth/2+.18))};
  const front:Roof={x0:-wing/2-.18,x1:wing/2+.18,z0:backZ,z1:frontZ+.2,
    height:(x,_z)=>eave+wingRise*(1-Math.abs(x)/(wing/2+.18))};
  const inside=(r:Roof,x:number,z:number)=>x>=r.x0-1e-6&&x<=r.x1+1e-6&&z>=r.z0-1e-6&&z<=r.z1+1e-6;
  const visible=(r:Roof,other:Roof,x:number,z:number)=>!inside(other,x,z)||r.height(x,z)>=other.height(x,z)-.002;
  const roofs:number[]=[],ribs:number[]=[],valleys:number[]=[];
  for(const [r,other] of [[main,front],[front,main]]){
    // Include both ridges and the wing intersections in the surface grid.
    const xs=Array.from(new Set([r.x0,r.x1,0,other.x0,other.x1,...Array.from({length:Math.ceil((r.x1-r.x0)/.12)},(_,i)=>r.x0+i*.12)].filter(x=>x>=r.x0&&x<=r.x1))).sort((a,b)=>a-b);
    const zs=Array.from(new Set([r.z0,r.z1,backZ,other.z0,other.z1,...Array.from({length:Math.ceil((r.z1-r.z0)/.12)},(_,i)=>r.z0+i*.12)].filter(z=>z>=r.z0&&z<=r.z1))).sort((a,b)=>a-b);
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
      const center=[(xs[i]+xs[i+1])/2,(zs[j]+zs[j+1])/2];
      let polygon:P[]=[[xs[i],r.height(xs[i],zs[j]),zs[j]],[xs[i+1],r.height(xs[i+1],zs[j]),zs[j]],[xs[i+1],r.height(xs[i+1],zs[j+1]),zs[j+1]],[xs[i],r.height(xs[i],zs[j+1]),zs[j+1]]];
      if(inside(other,center[0],center[1])){
        const clipped:P[]=[];
        for(let k=0;k<polygon.length;k++){
          const a=polygon[k],b=polygon[(k+1)%polygon.length],fa=a[1]-other.height(a[0],a[2]),fb=b[1]-other.height(b[0],b[2]);
          if(fa>=0)clipped.push(a);
          if((fa>=0)!==(fb>=0)){
            const t=fa/(fa-fb),p:P=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];clipped.push(p);
          }
        }
        polygon=clipped;
      }
      for(let k=1;k<polygon.length-1;k++)roofs.push(...polygon[0],...polygon[k+1],...polygon[k]);
    }
    // Raised tile courses follow each wing's slope and stop at the valley.
    const rows=r===main?Math.ceil((r.x1-r.x0)/.115):Math.ceil((r.z1-r.z0)/.115);
    for(let i=0;i<=rows;i++){
      const along=i/rows;
      for(let j=0;j<50;j++){
        const t=j/50,u=(j+1)/50;
        const a:P=r===main?[r.x0+(r.x1-r.x0)*along,0,r.z0+(r.z1-r.z0)*t]:[r.x0+(r.x1-r.x0)*t,0,r.z0+(r.z1-r.z0)*along];
        const b:P=r===main?[a[0],0,r.z0+(r.z1-r.z0)*u]:[r.x0+(r.x1-r.x0)*u,0,a[2]];
        if(visible(r,other,a[0],a[2])&&visible(r,other,b[0],b[2])){a[1]=r.height(a[0],a[2])+.008;b[1]=r.height(b[0],b[2])+.008;ribs.push(...a,...b);}
      }
    }
    for(let j=0;j<40;j++){
      const z=main.z0+(main.z1-main.z0)*j/40;
      const x=(1-(main.height(0,z)-eave)/wingRise)*(wing/2+.18);
      if(z>=front.z0&&x>0&&x<wing/2+.18){
        for(const side of [-1,1])valleys.push(side*x,main.height(0,z)+.014,z,side*x,main.height(0,z)+.014,z+.035);
      }
    }
  }
  const geometry=new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(roofs,3));geometry.computeVertexNormals();
  const roof=new THREE.Mesh(geometry,tile);roof.material.side=THREE.DoubleSide;roof.name="joined-gable-roofs-with-valleys";root.add(roof);
  const tileJoints:number[]=[],raised:number[]=[];
  for(let i=0;i<ribs.length;i+=6){
    const a=new THREE.Vector3(...ribs.slice(i,i+3) as P),b=new THREE.Vector3(...ribs.slice(i+3,i+6) as P),v=b.clone().sub(a),n=new THREE.Vector3(-v.z,0,v.x).normalize().multiplyScalar(.012);
    const A=a.clone().add(n),B=b.clone().add(n),C=b.clone().add(new THREE.Vector3(0,.015,0)),D=a.clone().add(new THREE.Vector3(0,.015,0));
    raised.push(...A.toArray(),...B.toArray(),...C.toArray(),...A.toArray(),...C.toArray(),...D.toArray());
    if(i%24===0){const cross=n.clone().multiplyScalar(3.5),left=a.clone().sub(cross),right=a.clone().add(cross);if([left,right].every(p=>inside(main,p.x,p.z)||inside(front,p.x,p.z)))tileJoints.push(...left.toArray(),...right.toArray());}
  }
  const ribGeo=new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(raised,3));ribGeo.computeVertexNormals();root.add(new THREE.Mesh(ribGeo,tile));
  strokes(root,tileJoints.map((v,i)=>i%3===1?v+.024:v),"staggered-tile-joints");
  strokes(root,ribs.map((v,i)=>i%3===1?v+.024:v),"individual-tile-courses");strokes(root,valleys,"roof-valley-seams");
  beam(root,[main.x0,eave+rise,backZ],[main.x1,eave+rise,backZ],.04,dark);
  const joinZ=backZ+(rise-wingRise)/rise*(backDepth/2+.18);
  beam(root,[0,eave+wingRise,joinZ],[0,eave+wingRise,front.z1],.037,dark);
  // Floors, back walls and the open transverse hall share an unobstructed interior.
  box(root,w,.075,backDepth,0,.0375,backZ,plaster);
  box(root,wing,.075,d*.77,0,.0375,d*.115,plaster);
  // The camera-facing rear elevation has recessed open bays and lattice,
  // rather than a single blank wall hiding the transverse interior.
  const bays=Math.max(4,Math.round(w/.85)),bay=w/bays;
  for(let j=0;j<=bays;j++)beam(root,[-w/2+j*bay,0,-d/2],[-w/2+j*bay,wall,-d/2],.035,dark);
  for(let j=0;j<bays;j++){
    const x=-w/2+(j+.5)*bay;
    if(j!==Math.floor(bays/2)){
      box(root,bay-.05,wall*.27,.055,x,wall*.135,-d/2,plaster);
      for(let q=0;q<5;q++)beam(root,[x-bay*.38+q*bay*.19,wall*.34,-d/2+.018],[x-bay*.38+q*bay*.19,wall*.82,-d/2+.018],.009,dark);
      for(const y of [.43,.65])beam(root,[x-bay*.4,wall*y,-d/2+.018],[x+bay*.4,wall*y,-d/2+.018],.009,dark);
    }
    box(root,bay-.04,wall*.12,.055,x,wall*.94,-d/2,plaster);
  }
  beam(root,[-w/2,wall,-d/2],[w/2,wall,-d/2],.04,dark);
  for(const side of [-1,1]){
    box(root,.055,wall,backDepth,side*w/2,wall/2,backZ,plaster);
    for(const x of [-w/2,-w*.25,0,w*.25,w/2])beam(root,[x,0,backZ+side*backDepth/2],[x,wall,backZ+side*backDepth/2],.037,dark);
    beam(root,[-w/2,wall,backZ+side*backDepth/2],[w/2,wall,backZ+side*backDepth/2],.045,dark);
  }
  for(const side of [-1,1]){
    const x=side*wing/2;
    for(let j=0;j<4;j++){
      const z=-d*.03+j*(frontZ+d*.03)/3;beam(root,[x,0,z],[x,wall,z],.036,dark);
      if(j<3&&!shop){box(root,.045,wall*.25,d*.12,x,wall*.125,z+d*.085,plaster);}
      beam(root,[x,wall-.2,z],[x-side*.15,wall,z],.016,dark);
    }
    beam(root,[x,wall,-d*.04],[x,wall,frontZ],.047,dark);
    beam(root,[x,wall,frontZ],[0,eave+wingRise-.04,frontZ],.03,dark);
    if(shop){
      box(root,.35,.065,d*.38,x-side*.23,.57,d*.24,timber);
      for(const z of [d*.08,d*.39])for(const xx of [x-side*.12,x-side*.33])box(root,.035,.5,.035,xx,.29,z,dark);
      for(let j=0;j<6;j++)box(root,.13,.06+(j%2)*.05,.18,x-side*.23,.64,d*.06+j*d*.055,j%2?cloth:plaster);
    }
  }
  // Exposed front truss and side gables make the sections visible in the crop.
  beam(root,[-wing/2,wall,frontZ],[wing/2,wall,frontZ],.05,dark);
  beam(root,[0,wall,frontZ],[0,eave+wingRise,frontZ],.027,dark);
  for(const side of [-1,1]){
    beam(root,[side*w/2,wall,-d/2],[side*w/2,eave+rise,backZ],.035,dark);
    beam(root,[side*w/2,eave+rise,backZ],[side*w/2,wall,-d*.04],.035,dark);
    beam(root,[side*w/2,wall,backZ],[side*w/2,eave+rise,backZ],.025,dark);
    for(let n=0;n<4;n++){
      const z=-d/2+(n+.5)*backDepth/4;
      beam(root,[side*w/2,wall,z],[side*w/2,main.height(side*w/2,z)-.05,z],.012,dark);
    }
  }
  // Interior roof frames remain visible through the open shop sections.
  for(const x of [-w*.3,0,w*.3]){
    beam(root,[x,wall,-d/2],[x,eave+rise-.06,backZ],.022,dark);
    beam(root,[x,eave+rise-.06,backZ],[x,wall,-d*.04],.022,dark);
    beam(root,[x,wall,-d/2],[x,wall,-d*.04],.028,dark);
  }
  // Occupied interior: tables, stools, jars and a hanging shop sign.
  for(const x of [-w*.28,w*.28]){
    box(root,.65,.055,.44,x,.46,backZ,timber);
    for(const dx of [-.26,.26])for(const dz of [-.16,.16])box(root,.035,.43,.035,x+dx,.22,backZ+dz,dark);
    for(const z of [backZ-.4,backZ+.4]){box(root,.38,.045,.15,x,.27,z,timber);for(const dx of [-.13,.13])box(root,.035,.25,.1,x+dx,.13,z,dark);}
    for(let j=0;j<3;j++){
      const jar=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.035,0),new THREE.Vector2(.075,.03),new THREE.Vector2(.08,.12),new THREE.Vector2(.04,.17)],8),plaster);
      jar.position.set(x+(j-1)*.13,.49,backZ);root.add(jar);
    }
  }
  if(shop){beam(root,[wing/2,wall-.1,frontZ],[wing/2+.32,wall-.1,frontZ],.023);box(root,.22,.5,.025,wing/2+.24,wall-.37,frontZ,cloth);}
  root.userData={architecture:"joined-rectangular-wings",openFront:shop,roofValleys:true};
  return root;
}
