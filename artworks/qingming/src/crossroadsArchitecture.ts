import * as THREE from "three";
import {paintMaterial,createDryInk} from "./paintMaterial";

// The transverse halls and projecting wings in the source are timber buildings,
// not extrusions of a painted silhouette. Their roofs share real valley cuts.
const timber=paintMaterial(0x8f7957),dark=paintMaterial(0x514b3e),plaster=paintMaterial(0xb5a784),
  tile=paintMaterial(0x686352),tileLight=paintMaterial(0x756f5d),cloth=paintMaterial(0xc2b38e),ink=createDryInk(.65);
type P=[number,number,number];
function box(root:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,material=timber){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);root.add(m);return m;
}
function beam(root:THREE.Object3D,a:P,b:P,r=.022,material=timber){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);
  if(v.lengthSq()<1e-10)return;
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),6),material);m.position.copy(A.add(B).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());root.add(m);return m;
}
function strokes(root:THREE.Object3D,positions:number[],name:string,material=ink){
  if(positions.length<6)return;
  const m=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3)),material);m.name=name;root.add(m);
}
function surface(root:THREE.Object3D,positions:number[],material:THREE.Material,name:string){
  if(positions.length<9)return;
  const g=new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();
  const m=new THREE.Mesh(g,material);m.name=name;root.add(m);return m;
}
type Roof={x0:number;x1:number;z0:number;z1:number;axis:"x"|"z";ridge:number;height:(x:number,z:number)=>number};
const inside=(r:Roof,x:number,z:number)=>x>=r.x0-1e-6&&x<=r.x1+1e-6&&z>=r.z0-1e-6&&z<=r.z1+1e-6;
const exposed=(r:Roof,roofs:Roof[],x:number,z:number)=>roofs.every(o=>o===r||!inside(o,x,z)||r.height(x,z)>=o.height(x,z)-.001);
// A concave sweep flattens at the eave. Negative t² would incorrectly steepen
// the roof edge. Both ends remain fixed, so supporting walls/valleys still fit.
const profile=(t:number)=>1-1.45*t+.45*t*t;
function roof(root:THREE.Group,roofs:Roof[],name:string){
  const faces:number[]=[],tiles:number[]=[],joints:number[]=[],valleys:number[]=[],fascia:number[]=[],eaveLines:number[]=[];
  const triangle=(out:number[],a:P,b:P,c:P)=>out.push(...a,...b,...c);
  for(const r of roofs){
    const xs=Array.from(new Set([r.x0,r.x1,...(r.axis==="z"?[r.ridge]:[]),...roofs.flatMap(o=>[o.x0,o.x1]),...Array.from({length:Math.ceil((r.x1-r.x0)/.12)},(_,i)=>r.x0+i*.12)].filter(x=>x>=r.x0&&x<=r.x1))).sort((a,b)=>a-b);
    const zs=Array.from(new Set([r.z0,r.z1,...(r.axis==="x"?[r.ridge]:[]),...roofs.flatMap(o=>[o.z0,o.z1]),...Array.from({length:Math.ceil((r.z1-r.z0)/.12)},(_,i)=>r.z0+i*.12)].filter(z=>z>=r.z0&&z<=r.z1))).sort((a,b)=>a-b);
    for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){
      let poly:P[]=[[xs[i-1],r.height(xs[i-1],zs[j-1]),zs[j-1]],[xs[i],r.height(xs[i],zs[j-1]),zs[j-1]],[xs[i],r.height(xs[i],zs[j]),zs[j]],[xs[i-1],r.height(xs[i-1],zs[j]),zs[j]]];
      for(const o of roofs){
        if(o===r||!inside(o,(xs[i-1]+xs[i])/2,(zs[j-1]+zs[j])/2))continue;
        const clipped:P[]=[];
        for(let k=0;k<poly.length;k++){
          const a=poly[k],b=poly[(k+1)%poly.length],fa=a[1]-o.height(a[0],a[2]),fb=b[1]-o.height(b[0],b[2]);
          if(fa>=0)clipped.push(a);
          if((fa>=0)!==(fb>=0)){
            const t=fa/(fa-fb);clipped.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]);
          }
        }
        poly=clipped;
      }
      for(let k=1;k<poly.length-1;k++)triangle(faces,poly[0],poly[k+1],poly[k]);
      for(let k=0;k<poly.length;k++){
        const a=poly[k],b=poly[(k+1)%poly.length];
        if(roofs.some(o=>o!==r&&inside(o,a[0],a[2])&&inside(o,b[0],b[2])&&Math.abs(a[1]-o.height(a[0],a[2]))<.008&&Math.abs(b[1]-o.height(b[0],b[2]))<.008))valleys.push(a[0],a[1]+.02,a[2],b[0],b[1]+.02,b[2]);
      }
    }
    // Shallow barrel-cap strips are real 3D geometry. Staggered short joints
    // across drainage courses distinguish tiles from long parallel pinstripes.
    const start=r.axis==="x"?r.x0:r.z0,end=r.axis==="x"?r.x1:r.z1;
    const across0=r.axis==="x"?r.z0:r.x0,across1=r.axis==="x"?r.z1:r.x1;
    const count=Math.ceil((end-start)/.13),steps=Math.ceil((across1-across0)/.09);
    for(let i=0;i<=count;i++){
      const along=start+(end-start)*i/count,half=.025;
      for(let j=0;j<steps;j++){
        const u=across0+(across1-across0)*j/steps,v=across0+(across1-across0)*(j+1)/steps;
        const point=(a:number,b:number,dy=0):P=>r.axis==="x"?[a,r.height(a,b)+dy,b]:[b,r.height(b,a)+dy,a];
        const A=point(along,u,.012),B=point(along,v,.012);
        if(!exposed(r,roofs,A[0],A[2])||!exposed(r,roofs,B[0],B[2]))continue;
        const aa=Math.max(start,along-half),bb=Math.min(end,along+half);
        const L=point(aa,u,.01),R=point(bb,u,.01),M=point(along,u,.036),L2=point(aa,v,.01),R2=point(bb,v,.01),M2=point(along,v,.036);
        triangle(tiles,L,L2,M2);triangle(tiles,L,M2,M);triangle(tiles,M,M2,R2);triangle(tiles,M,R2,R);
        if(j%3===(i%2)){
          const l=point(Math.max(start,along-.056),u,.039),q=point(Math.min(end,along+.056),u,.039);joints.push(...l,...q);
        }
      }
    }
    const edges:[[number,number],[number,number]][]=[[[r.x0,r.z0],[r.x1,r.z0]],[[r.x1,r.z0],[r.x1,r.z1]],[[r.x1,r.z1],[r.x0,r.z1]],[[r.x0,r.z1],[r.x0,r.z0]]];
    for(const [a,b] of edges){
      const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(len/.10);
      for(let i=0;i<n;i++){
        const p=(t:number):P=>{const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;return [x,r.height(x,z),z];};
        const A=p(i/n),B=p((i+1)/n);
        if(!exposed(r,roofs,A[0],A[2])||!exposed(r,roofs,B[0],B[2]))continue;
        const C:P=[B[0],B[1]-.105,B[2]],D:P=[A[0],A[1]-.105,A[2]];
        triangle(fascia,A,B,C);triangle(fascia,A,C,D);
        for(const dy of [-.025,-.085])eaveLines.push(A[0],A[1]+dy,A[2],B[0],B[1]+dy,B[2]);
      }
    }
    const ridgeStart=r.axis==="x"?r.x0:r.z0,ridgeEnd=r.axis==="x"?r.x1:r.z1;
    const ridgePoints:P[]=[];
    for(let t=ridgeStart+.04;t<=ridgeEnd-.04;t+=.10){
      const x=r.axis==="x"?t:r.ridge,z=r.axis==="x"?r.ridge:t;
      if(exposed(r,roofs,x,z))ridgePoints.push([x,r.height(x,z)+.044,z]);
    }
    for(let i=1;i<ridgePoints.length;i++)if(new THREE.Vector3(...ridgePoints[i]).distanceTo(new THREE.Vector3(...ridgePoints[i-1]))<.15)beam(root,ridgePoints[i-1],ridgePoints[i],.035,tileLight);
  }
  surface(root,faces,tile,name);surface(root,tiles,tileLight,"raised-barrel-tile-caps");surface(root,fascia,dark,"layered-eave-fascia");
  strokes(root,joints,"staggered-tile-joints");strokes(root,valleys,"roof-valley-seams");strokes(root,eaveLines,"layered-eave-ink");
}
function lattice(root:THREE.Object3D,x:number,y:number,z:number,w:number,h:number){
  for(let n=0;n<=5;n++)beam(root,[x-w/2+n*w/5,y-h/2,z],[x-w/2+n*w/5,y+h/2,z],.009,dark);
  for(const q of [-.5,0,.5])beam(root,[x-w/2,y+q*h,z],[x+w/2,y+q*h,z],.009,dark);
}
function jar(root:THREE.Object3D,x:number,y:number,z:number,size=.15){
  const m=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.30,0),new THREE.Vector2(.47,.2),new THREE.Vector2(.5,.58),new THREE.Vector2(.3,.87),new THREE.Vector2(.29,1)],8),plaster);
  m.scale.setScalar(size);m.position.set(x,y,z);root.add(m);
}
function table(root:THREE.Object3D,x:number,z:number,w=.65,d=.4,y=.5){
  box(root,w,.055,d,x,y,z,timber);
  for(const a of [-1,1])for(const b of [-1,1])box(root,.035,y,.035,x+a*w*.4,y/2,z+b*d*.35,dark);
  for(let j=0;j<3;j++)jar(root,x+(j-1)*w*.25,y+.03,z,.13+(j%2)*.03);
}
function bayFront(root:THREE.Group,w:number,h:number,z:number,shop:boolean,y0=0,side=1){
  const n=Math.max(2,Math.round(w/.88)),bay=w/n;
  for(let j=0;j<=n;j++)beam(root,[-w/2+j*bay,y0,z],[-w/2+j*bay,y0+h,z],.032,dark);
  beam(root,[-w/2,y0+h,z],[w/2,y0+h,z],.043,dark);
  for(let j=0;j<n;j++){
    const x=-w/2+(j+.5)*bay,isDoor=j===Math.floor(n/2);
    box(root,bay-.04,h*.13,.05,x,y0+h*.935,z,plaster);
    if(!isDoor){
      if(shop){
        // Move all shop furniture toward the room, for either facade side.
        const inward=z-side*.18;
        box(root,bay-.1,.065,.28,x,y0+.47,inward,timber);
        for(const dx of [-.33,.33])box(root,.032,.44,.032,x+dx*bay,y0+.22,inward,dark);
        for(let q=0;q<3;q++){if((j+q)%2)jar(root,x+(q-1)*bay*.22,y0+.51,inward,.12);else box(root,bay*.18,.07,.12,x+(q-1)*bay*.22,y0+.53,inward,cloth);}
        // Folded shutters hang below the transom; the lower opening stays open.
        box(root,bay-.13,.10,.16,x,y0+h*.80,z-side*.13,cloth);
      }else{
        box(root,bay-.06,h*.3,.055,x,y0+h*.15,z,plaster);
        lattice(root,x,y0+h*.56,z+side*.018,bay*.72,h*.4);
      }
    }
    for(const end of [-1,1])beam(root,[x+end*bay*.45,y0+h*.82,z],[x+end*bay*.31,y0+h,z],.014,timber);
  }
}
function gable(root:THREE.Group,x:number,z:number,depth:number,wall:number,top:number){
  const outline:P[]=[[x,wall,z-depth/2],[x,top,z],[x,wall,z+depth/2]];
  surface(root,[...outline[0],...outline[1],...outline[2]],plaster,"plaster-gable-infill");
  beam(root,outline[0],outline[1],.025,dark);beam(root,outline[1],outline[2],.025,dark);
  beam(root,outline[0],outline[2],.035,dark);beam(root,[x,wall,z],[x,top,z],.023,dark);
  for(const t of [-.5,.5])beam(root,[x,wall,z+t*depth*.5],[x,wall+(top-wall)*.48,z+t*depth*.5],.012,dark);
}

/** Conventional reference halls: shallow frontage shops, tiled dwellings and
 * the two-storey riverside balcony are distinct from the joined cross roofs. */
export function buildReferenceHouse(w:number,d:number,h:number,kind="shop"){
  const root=new THREE.Group();root.name=`reference-${kind}`;
  const shop=kind==="shop"||kind==="gallery"||kind==="market"||kind==="teahouse",upper=kind==="upper-storey";
  const eave=h+.10,rise=Math.min(.92,d*.26),height=(_x:number,z:number)=>eave+rise*profile(Math.min(1,Math.abs(z)/(d/2+.20)));
  const r:Roof={x0:-w/2-.18,x1:w/2+.18,z0:-d/2-.20,z1:d/2+.20,axis:"x",ridge:0,height};
  roof(root,[r],"reference-curved-tile-roof");
  box(root,w,.06,d,0,.03,0,plaster);
  for(const side of [-1,1]){
    box(root,.055,h,d,side*w/2,h/2,0,plaster);
    for(const z of [-d/2,0,d/2])beam(root,[side*w/2,0,z],[side*w/2,h,z],.034,dark);
    beam(root,[side*w/2,h,-d/2],[side*w/2,h,d/2],.04,dark);
    gable(root,side*w/2,0,d,h,eave+rise-.03);
  }
  if(upper){
    const floor=h*.52,upperH=h-floor;
    box(root,w,.07,d,0,floor,0,timber);
    bayFront(root,w,floor,d/2,true);
    bayFront(root,w,upperH,d*.30,false,floor);
    bayFront(root,w,h,-d/2,false,0,-1);
    // The balcony is recessed under the common roof, with a continuous railing.
    for(let i=0,n=Math.ceil(w/.24);i<=n;i++)beam(root,[-w/2+i*w/n,floor,d/2],[-w/2+i*w/n,floor+upperH*.39,d/2],.013,dark);
    for(const y of [floor+.06,floor+upperH*.39])beam(root,[-w/2,y,d/2],[w/2,y,d/2],.025,dark);
    for(const side of [-1,1])beam(root,[side*w/2,floor+upperH*.39,d*.30],[side*w/2,floor+upperH*.39,d/2],.025,dark);
  }else{
    bayFront(root,w,h,d/2,shop);
    bayFront(root,w,h,-d/2,false,0,-1);
    if(shop&&d>1.4)for(const x of [-w*.26,w*.26])table(root,x,-d*.1,Math.min(.7,w*.2),Math.min(.45,d*.28));
    if(kind==="warehouse")for(let i=0;i<Math.min(6,Math.floor(w));i++){
      const x=-w*.36+i*w*.72/Math.max(1,Math.min(6,Math.floor(w))-1);
      box(root,.45,.40,.4,x,.23,d*.2,cloth);box(root,.40,.16,.38,x,.51,d*.2,plaster);
    }
  }
  // Repeated short rafters and a few exposed tied frames, useful at close view.
  const detail=new THREE.Group();detail.name="close-only-joinery";root.add(detail);
  for(let i=0,n=Math.ceil(w/.22);i<=n;i++)for(const side of [-1,1]){
    const x=-w/2+i*w/n;beam(detail,[x,h+.02,side*d*.32],[x,h+.025,side*(d/2+.16)],.014,timber);
  }
  for(const x of [-w*.3,0,w*.3]){
    beam(detail,[x,h,-d*.46],[x,eave+rise-.07,0],.022,dark);
    beam(detail,[x,eave+rise-.07,0],[x,h,d*.46],.022,dark);
    beam(detail,[x,h,-d*.46],[x,h,d*.46],.025,dark);
  }
  root.userData={architecture:"rectangular-timber-hall",kind,openFront:shop,upperStorey:upper};
  return root;
}

function crossHouse(w:number,d:number,h:number,shop:boolean){
  const root=new THREE.Group();root.name=shop?"crossroads-open-shop":"cross-wing-house";
  const wing=w*.48,backDepth=d*.62,backZ=-d*.19,frontZ=d*.5,wall=h;
  const eave=h+.10,rise=Math.min(.94,d*.26),wingRise=rise*.94;
  const main:Roof={x0:-w/2-.18,x1:w/2+.18,z0:-d/2-.18,z1:d*.12+.18,axis:"x",ridge:backZ,
    height:(_x,z)=>eave+rise*profile(Math.abs(z-backZ)/(backDepth/2+.18))};
  const front:Roof={x0:-wing/2-.18,x1:wing/2+.18,z0:backZ,z1:frontZ+.20,axis:"z",ridge:0,
    height:(x,_z)=>eave+wingRise*profile(Math.abs(x)/(wing/2+.18))};
  roof(root,[main,front],"joined-gable-roofs-with-valleys");
  box(root,w,.06,backDepth,0,.03,backZ,plaster);box(root,wing,.06,d*.69,0,.03,d*.155,plaster);
  bayFront(root,w,h,-d/2,shop,0,-1);
  // Main hall front is open beside the forward wing. Keep walls out of the
  // shared interior, so looking into a shop reveals depth, tables and trusses.
  for(const side of [-1,1]){
    const x=side*w/2;
    box(root,.055,h,backDepth,x,h/2,backZ,plaster);
    gable(root,x,backZ,backDepth,h,eave+rise-.03);
    const span=(w-wing)/2;
    const porch=new THREE.Group();porch.position.x=side*(wing/2+span/2);root.add(porch);
    bayFront(porch,span,h,d*.12,shop);
    for(const z of [-d/2,backZ,d*.12])beam(root,[x,0,z],[x,h,z],.034,dark);
    beam(root,[x,h,-d/2],[x,h,d*.12],.038,dark);
    for(let i=0;i<4;i++){
      const z=d*.12+(frontZ-d*.12)*i/3,xx=side*wing/2;
      beam(root,[xx,0,z],[xx,h,z],.034,dark);
      if(!shop&&i<3)box(root,.045,h*.26,(frontZ-d*.12)/3,xx,h*.13,z+(frontZ-d*.12)/6,plaster);
      beam(root,[xx,h-.16,z],[xx-side*.12,h,z],.015,timber);
    }
    beam(root,[side*wing/2,h,d*.12],[side*wing/2,h,frontZ],.04,dark);
    beam(root,[side*wing/2,h,frontZ],[0,eave+wingRise-.04,frontZ],.028,dark);
  }
  bayFront(root,wing,h,frontZ,shop);
  const gableFace:P[]=[[-wing/2,h,frontZ],[0,eave+wingRise-.04,frontZ],[wing/2,h,frontZ]];
  surface(root,[...gableFace[0],...gableFace[1],...gableFace[2]],plaster,"projecting-wing-gable");
  beam(root,[-wing/2,h,frontZ],[wing/2,h,frontZ],.04,dark);
  beam(root,[0,h,frontZ],[0,eave+wingRise-.04,frontZ],.025,dark);
  const detail=new THREE.Group();detail.name="close-only-joinery";root.add(detail);
  for(const x of [-w*.31,0,w*.31]){
    beam(detail,[x,h,-d/2],[x,eave+rise-.05,backZ],.025,dark);
    beam(detail,[x,eave+rise-.05,backZ],[x,h,d*.12],.025,dark);
    beam(detail,[x,h,-d/2],[x,h,d*.12],.028,dark);
  }
  for(const x of [-w*.27,w*.27])table(root,x,backZ,Math.min(.70,w*.2),Math.min(.44,backDepth*.25));
  if(shop){
    for(const side of [-1,1])table(root,side*wing*.27,d*.27,Math.min(.45,wing*.35),Math.min(.4,d*.18));
    const signX=Math.min(w/2-.14,wing/2+.28);
    beam(root,[wing/2,h-.12,frontZ],[signX,h-.12,frontZ],.02,timber);
    box(root,.20,.40,.025,signX,h-.34,frontZ,cloth);
  }
  root.userData={architecture:"joined-rectangular-wings",openFront:shop,roofValleys:true};
  return root;
}

export function buildCrossroadsHouse(w:number,d:number,h:number,shop=true,variant:"front-wing"|"rear-wing"|"side-wing"="front-wing"){
  const root=variant==="side-wing"?crossHouse(d,w,h,shop):crossHouse(w,d,h,shop);
  if(variant==="rear-wing")root.rotation.y=Math.PI;
  if(variant==="side-wing")root.rotation.y=Math.PI/2;
  root.userData.variant=variant;
  return root;
}
