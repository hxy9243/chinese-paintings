import * as THREE from "three";
import { paintMaterial, createDryInk } from "./paintMaterial";

type Point = [number, number, number];
const wood=paintMaterial(0x99815a),dark=paintMaterial(0x514b3a),mat=paintMaterial(0xb8a57e),
  matEdge=paintMaterial(0x8b7956),hide=paintMaterial(0xa49b7f),horn=paintMaterial(0xc2b897),
  hoof=paintMaterial(0x554f41),recess=paintMaterial(0x5e5747),ink=createDryInk(.72);
function mesh(root:THREE.Object3D,geometry:THREE.BufferGeometry,material:THREE.Material,at:Point){
  const o=new THREE.Mesh(geometry,material);o.position.set(...at);root.add(o);return o;
}
function box(root:THREE.Object3D,size:Point,at:Point,material:THREE.Material=wood){
  return mesh(root,new THREE.BoxGeometry(...size),material,at);
}
function rod(root:THREE.Object3D,a:Point,b:Point,r=.018,material:THREE.Material=wood){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);
  const o=mesh(root,new THREE.CylinderGeometry(r*.9,r,v.length(),7),material,A.add(B).multiplyScalar(.5).toArray() as Point);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;
}
function oval(root:THREE.Object3D,size:Point,at:Point,material:THREE.Material=hide){
  const o=mesh(root,new THREE.SphereGeometry(1,12,8),material,at);o.scale.set(...size);return o;
}
function line(root:THREE.Object3D,points:Point[],material:THREE.Material=ink){
  const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),material);root.add(o);return o;
}
function curveRod(root:THREE.Object3D,points:Point[],r:number,material:THREE.Material){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(root,new THREE.TubeGeometry(curve,20,r,5,false),material,[0,0,0]);
}
function surface(root:THREE.Object3D,points:Point[],indices:number[],material:THREE.Material,name:string){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex(indices);g.computeVertexNormals();
  const m=mesh(root,g,material,[0,0,0]);m.name=name;return m;
}

/** Covered ox cart from the crossroads crop. Ground is y=0; ox travels along +X. */
export function buildReferenceCoveredCart(variant=0){
  const root=new THREE.Group();root.name='reference-covered-ox-cart';root.userData.variant=variant;
  const cart=new THREE.Group();cart.name='woven-covered-cart';root.add(cart);
  const wheelX=-.72,wheelY=.415,wheelR=.4;
  // A narrow timber bed sits over the single axle. The wheel is actually open
  // between its spokes, with separate tire, felloe, nave and projecting pin.
  box(cart,[1.55,.085,1.02],[-.69,.53,0]).name='cart-plank-bed';
  box(cart,[1.67,.09,.09],[-.69,.46,-.4]);box(cart,[1.67,.09,.09],[-.69,.46,.4]);
  rod(cart,[wheelX,wheelY,-.715],[wheelX,wheelY,.715],.05,dark);
  for(const side of [-1,1]){
    const z=side*.605,wheel=new THREE.Group();wheel.name='spoked-cart-wheel';wheel.position.set(wheelX,wheelY,z);cart.add(wheel);
    mesh(wheel,new THREE.TorusGeometry(wheelR-.015,.018,5,32),dark,[0,0,0]);
    mesh(wheel,new THREE.TorusGeometry(wheelR-.045,.029,5,32),wood,[0,0,0]);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;rod(wheel,[0,0,0],[Math.cos(a)*(wheelR-.035),Math.sin(a)*(wheelR-.035),0],.012,wood);
      if(i%2===0)line(wheel,[[Math.cos(a)*(wheelR-.07),Math.sin(a)*(wheelR-.07),side*.026],[Math.cos(a)*wheelR,Math.sin(a)*wheelR,side*.026]]);
    }
    const hub=mesh(wheel,new THREE.CylinderGeometry(.07,.075,.15,10),dark,[0,0,side*.015]);hub.rotation.x=Math.PI/2;
    const pin=mesh(wheel,new THREE.CylinderGeometry(.03,.035,.18,8),wood,[0,0,side*.018]);pin.rotation.x=Math.PI/2;
    box(cart,[1.5,.23,.034],[-.7,.665,side*.495],matEdge);
    for(let x=-1.37;x<.04;x+=.17){
      rod(cart,[x,.57,side*.513],[x,.79,side*.513],.012,wood);
      line(cart,[[x-.055,.60,side*.516],[x+.04,.73,side*.516]]);
    }
    // Long, slightly converging shafts meet the yoke below the ox's shoulders.
    rod(cart,[-.04,.5,side*.40],[1.30,.57,side*.32],.031,wood);
    rod(cart,[.4,.52,side*.38],[1.47,.62,side*.34],.016,dark);
  }
  for(let z=-.44;z<=.44;z+=.11)line(cart,[[-1.43,.578,z],[.055,.578,z]]);
  // The woven cover is a barrel with mostly upright lower sides and a rounded
  // crown, rather than a rectangular wagon box or stretched modern canvas.
  const x0=-1.48,x1=.12,y0=.85,r=.54;
  const hoodPoint=(x:number,a:number,offset=0):Point=>[x,y0+(r+offset)*Math.sin(a)+.11,Math.cos(a)*(r+offset)];
  const pts:Point[]=[],ids:number[]=[];
  for(let i=0;i<=16;i++)for(let j=0;j<=24;j++){
    const x=x0+(x1-x0)*i/16,a=Math.PI*j/24,p=hoodPoint(x,a);
    p[1]-=.018*Math.sin(Math.PI*i/16)*Math.sin(a);pts.push(p);
  }
  for(let i=0;i<16;i++)for(let j=0;j<24;j++){const a=i*25+j;ids.push(a,a+25,a+1,a+1,a+25,a+26);}
  surface(cart,pts,ids,mat,'barrel-woven-hood');
  for(const side of [-1,1]){
    surface(cart,[[x0,.73,side*r],[x1,.73,side*r],[x1,.96,side*r],[x0,.96,side*r]],[0,1,2,0,2,3],mat,'woven-hood-skirt');
    rod(cart,[x0,.75,side*.55],[x1,.75,side*.55],.017,matEdge);
  }
  // Bamboo hoops, bindings and fine reed weave survive close inspection.
  for(let i=0;i<7;i++){
    const x=x0+(x1-x0)*i/6;
    curveRod(cart,Array.from({length:17},(_,j)=>hoodPoint(x,j*Math.PI/16,.014)),.014,matEdge);
    for(const side of [-1,1]){
      rod(cart,[x,.61,side*.53],[x,.96,side*.55],.015,wood);
      for(let k=0;k<3;k++)line(cart,[[x-.022,.77+k*.017,side*.558],[x+.022,.77+k*.017,side*.558]]);
    }
  }
  const weave:number[]=[];
  for(let i=1;i<56;i++){
    const x=x0+(x1-x0)*i/56;
    for(let j=0;j<24;j++)weave.push(...hoodPoint(x,j*Math.PI/24,.002),...hoodPoint(x,(j+1)*Math.PI/24,.002));
  }
  for(let j=1;j<22;j++)for(let i=0;i<16;i++)weave.push(...hoodPoint(x0+(x1-x0)*i/16,j*Math.PI/22,.003),...hoodPoint(x0+(x1-x0)*(i+1)/16,j*Math.PI/22,.003));
  const wovenInk=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(weave,3)),createDryInk(.20));wovenInk.name='reed-weave-lines';cart.add(wovenInk);
  // Shaded interior and a partly rolled blind leave a real open mouth.
  box(cart,[.025,.29,.86],[x0+.03,.77,0],recess);
  for(const side of [-1,1])rod(cart,[x1,.59,side*.45],[x1,1.13,side*.45],.022,wood);
  rod(cart,[x1,1.13,-.45],[x1,1.13,.45],.024,wood);
  const roll=mesh(cart,new THREE.CylinderGeometry(.065,.065,.97,12),matEdge,[x1+.045,1.14,0]);roll.rotation.x=Math.PI/2;roll.name='rolled-front-blind';
  for(let i=0;i<20;i++)line(cart,[[x1+.11,1.105,-.45+i*.047],[x1+.11,1.17,-.45+i*.047]]);
  for(const z of [-.3,.3])line(cart,[[x1+.12,1.17,z],[x1+.14,.94,z],[x1+.13,.88,z+.025]]);
  if(variant%2===1){
    box(cart,[.018,.19,.91],[x1+.045,1.01,0],mat);
    for(let z=-.43;z<=.43;z+=.045)line(cart,[[x1+.06,.925,z],[x1+.06,1.1,z]]);
  }
  // Draft ox: heavy body, short neck/dewlap, broad muzzle, horns and hooves.
  const ox=new THREE.Group();ox.name='yoked-draft-ox';root.add(ox);
  oval(ox,[.49,.31,.265],[1.25,.77,0]);
  const shoulders=oval(ox,[.22,.34,.27],[1.57,.79,0]);shoulders.rotation.z=.14;
  const neck=oval(ox,[.26,.20,.19],[1.71,.87,0]);neck.rotation.z=-.24;
  const head=oval(ox,[.22,.19,.145],[1.92,.90,0]);head.rotation.z=-.22;
  oval(ox,[.155,.105,.15],[2.055,.815,0],hide).name='broad-ox-muzzle';
  oval(ox,[.12,.17,.11],[1.69,.63,0],hide).rotation.z=.3;
  for(const side of [-1,1]){
    const ear=oval(ox,[.13,.045,.075],[1.86,1.005,side*.18]);ear.rotation.y=side*.5;ear.rotation.z=-.18;
    curveRod(ox,[[1.86,1.035,side*.09],[1.80,1.17,side*.18],[1.77,1.27,side*.13],[1.82,1.30,side*.085]],.021,horn);
    oval(ox,[.017,.014,.008],[1.97,.96,side*.137],dark);
    oval(ox,[.013,.01,.008],[2.14,.84,side*.09],dark);
    for(const [i,x] of [1.0,1.53].entries()){
      const lean=(i===0?-.075:.035)*(variant%2?-.5:1),z=side*.17;
      oval(ox,[.095,.18,.085],[x,.51,z]);
      rod(ox,[x,.5,z],[x+lean,.26,z+side*.015],.045,hide);
      rod(ox,[x+lean,.26,z+side*.015],[x+lean*.7,.075,z+side*.025],.030,hide);
      box(ox,[.105,.08,.085],[x+lean*.7+.015,.04,z+side*.025],hoof).name='ox-hoof';
      line(ox,[[x+lean*.7+.07,.02,z+side*.025],[x+lean*.7+.07,.064,z+side*.025]]);
    }
    // Leather traces and a belly band read clearly against the warm grey hide.
    curveRod(ox,[[1.49,.96,side*.20],[1.52,.74,side*.284],[1.47,.52,side*.2]],.012,dark);
  }
  curveRod(ox,[[.82,.90,0],[.72,.68,.035],[.73,.41,.065],[.66,.28,.075]],.015,hide);
  oval(ox,[.035,.07,.027],[.66,.26,.075],dark);
  rod(ox,[1.50,.81,-.37],[1.50,.81,.37],.029,wood).name='wooden-yoke';
  for(const side of [-1,1])curveRod(ox,[[1.50,.80,side*.32],[1.43,.63,side*.33],[1.34,.56,side*.31]],.014,dark);
  root.userData.travelAxis='+X';root.userData.groundY=0;
  return root;
}
