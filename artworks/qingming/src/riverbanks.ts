import * as THREE from "three";
import {
  BRIDGE,
  GROUND_Y,
  bridgeHeight,
  shoreDepth,
  type BankSide,
} from "./passageLayout";
import { scrollPoint } from "./scrollLayout";
import { paintMaterial, createDryInk } from "./paintMaterial";

// Keep the complete rock/earth toe within 0.09 of the navigation shoreline.
// The moored hulls retain their existing 0.12 minimum envelope clearance.
const earth = paintMaterial(0xb09a6d, true);
// A narrow damp wash loses pigment at the waterline; the upper bank remains solid.
earth.fragmentShader = earth.fragmentShader.replace(
  "gl_FragColor=vec4(result,alpha);",
  `
  result*=1.-(1.-smoothstep(-.03,.19,point.y))*.055;
  alpha*=smoothstep(-.09,.045,point.y);
  gl_FragColor=vec4(result,alpha);`,
);
earth.depthWrite=true;
const stone = [0xa18e68, 0xab9871].map((c) => paintMaterial(c));
const greys = [0xb8b9ae, 0xc7c5b9].map((c) => paintMaterial(c));

/** The geometry and water shader share the same continuous bank curve. */
export function bankEdgeDepth(side: BankSide, s: number) { return shoreDepth(side,s); }
export function bankSection(side: BankSide, s: number, t: number) {
  const direction = side === "far" ? 1 : -1;
  // Angular erosion folds and small notches belong to the exposed earth lip.
  // The toe remains inside the shared navigation envelope.
  const saw=(x:number)=>1-4*Math.abs((x-Math.floor(x))-.5);
  const rough=(saw(s*1.47)*.065+saw(s*3.73)*.026)*(1-t);
  // Ease both ends of the cross-section into a rounded lip and submerged toe.
  const drop = 0.5 - 0.5 * Math.cos(Math.PI * t);
  return {
    s,
    d: bankEdgeDepth(side, s) + direction * (-0.55 + 0.575 * t + rough),
    y: THREE.MathUtils.lerp(GROUND_Y + 0.004, -0.14, drop),
  };
}
export function buildBankFace(side: BankSide) {
  const group=new THREE.Group();group.name=`${side}-raised-bank`;
  const positions:number[]=[],indices:number[]=[],seams:number[]=[],hatching:number[]=[],lipLines:number[]=[];
  const start=-61,end=41,count=1020,rows=17;
  const world=(s:number,t:number,lift=0)=>{const p=bankSection(side,s,t),v=scrollPoint(p.s,p.d);return new THREE.Vector3(v.x,p.y+lift,v.z);};
  const stroke=(a:THREE.Vector3,b:THREE.Vector3,out=seams)=>out.push(...a.toArray(),...b.toArray());
  const hash=(n:number)=>{const v=Math.sin(n*91.17+(side==="far"?21.3:7.8))*14827.19;return v-Math.floor(v);};
  for(let i=0;i<=count;i++)for(let j=0;j<rows;j++)positions.push(...world(start+(end-start)*i/count,j/(rows-1)).toArray());
  for(let i=0;i<count;i++)for(let j=0;j<rows-1;j++){const a=i*rows+j,b=a+rows;indices.push(a,b,a+1,b,b+1,a+1);}
  const geo=new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,earth);mesh.name="eroded-earth-face";group.add(mesh);
  // Long broken strata are embedded in the soil: no repeating bead outlines.
  const rocks:number[][]=[[],[]];
  for(let layer=0;layer<2;layer++)for(let i=0,s=start+layer*.72;s<end-.1;i++){
    const len=.85+hash(i+layer*90)*1.65,t0=.12+layer*.25+hash(i+4)*.10,t1=Math.min(.93,t0+.28+hash(i+32)*.14);
    if(Math.sin(s*.67)+Math.sin(s*1.2) > -.6){
      const c:[number,number][]=[[s,t0+.03],[s+len*.27,t0],[s+len*.75,t0+.08],[s+len,t0+.15],[s+len*.84,t1-.025],[s+len*.42,t1],[s+len*.08,t1-.09]];
      const verts=c.map(([ss,t])=>world(ss,t,.012+hash(i+14)*.017)),middle=world(s+len*.5,(t0+t1)*.5,.038);
      for(let j=0;j<verts.length;j++){
        rocks[layer].push(...middle.toArray(),...verts[j].toArray(),...verts[(j+1)%verts.length].toArray());
        if(j>=3&&j<6&&i%3!==1)stroke(verts[j].clone().add(new THREE.Vector3(0,.005,0)),verts[(j+1)%verts.length].clone().add(new THREE.Vector3(0,.005,0)));
      }
      if(i%2===0){stroke(verts[0],middle);stroke(middle,verts[4]);}
      for(let q=0;q<4;q++)stroke(world(s+len*(.2+q*.11),t0+.04,.047),world(s+len*(.34+q*.11),t1-.03,.048),hatching);
    }
    s+=len*(.65+hash(i+6)*.45);
  }
  rocks.forEach((p,i)=>{if(!p.length)return;const g=new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();const m=new THREE.Mesh(g,stone[i]);m.name="overlapping-angular-bank-strata";group.add(m);});
  for(let i=0,s=start;s<end;i++,s+=.14+hash(i+700)*.18){
    const b=s+.12+hash(i+700)*.20;
    if(i%7!==0){stroke(world(s,.025,.009),world((s+b)*.5,.08,.011),lipLines);stroke(world((s+b)*.5,.08,.011),world(b,.02,.009),lipLines);}
    const t0=.11+hash(i+1000)*.23,t1=.55+hash(i+1200)*.33;
    for(let q=0;q<3;q++){
      const ss=s+q*.031,zig=(i%2?1:-1)*(.075+hash(i)*.14);
      stroke(world(ss,t0,.009),world(ss+zig,(t0+t1)*.5,.013),hatching);
      if((i+q)%4!==0)stroke(world(ss+zig,(t0+t1)*.5,.013),world(ss+zig*.55,t1,.009),hatching);
    }
  }
  const add=(p:number[],opacity:number,name:string)=>{if(!p.length)return;const m=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(p,3)),createDryInk(opacity));m.name=name;group.add(m);};
  add(seams,.68,"fractured-rock-plate-outlines");add(hatching,.78,"broken-bank-strata-hatching");add(lipLines,.95,"zigzag-eroded-bank-lip");
  return group;
}
const mortarInk = createDryInk(0.25);
export function buildBridgeFoundations() {
  const group = new THREE.Group();
  group.name = "pale-brick-abutments";
  const half = BRIDGE.length / 2,
    width = BRIDGE.width + 0.32;
  for (const side of [-1, 1])
    for (let bay = 0; bay < 6; bay++) {
      const x = side * (half + 0.25 - bay * 0.3);
      // A stepped masonry shoulder follows the rising timber springing, rather
      // than disappearing below the land at the extreme ends of the bridge.
      const top = bridgeHeight(Math.abs(x) + 0.15) - 0.17;
      const rows = Math.max(1, Math.floor((top + 0.12) / 0.135));
      for (let row = 0; row < rows; row++) {
        let z = -width / 2;
        for (let col = 0; z < width / 2 - 0.001; col++) {
          const length = Math.min(
            col === 0 && row % 2 ? 0.23 : 0.46,
            width / 2 - z,
          );
          const brick = new THREE.Mesh(
            new THREE.BoxGeometry(0.294, 0.125, length - 0.009),
            greys[(row + col + bay) % 2],
          );
          brick.position.set(x, -0.12 + row * 0.135 + 0.0625, z + length / 2);
          group.add(brick);
          const joints = new THREE.LineSegments(
            new THREE.EdgesGeometry(brick.geometry),
            mortarInk,
          );
          joints.position.copy(brick.position);
          group.add(joints);
          z += length;
        }
      }
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.045, width + 0.035),
        greys[1],
      );
      cap.position.set(x, -0.12 + rows * 0.135 + 0.012, 0);
      group.add(cap);
    }
  return group;
}
