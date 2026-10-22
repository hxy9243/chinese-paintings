import * as THREE from "three";
import {paintMaterial,createDryInk} from "./paintMaterial";
import type {DetailLevel} from "../../../packages/scene-kit/lod";
import type {TreeForm} from "./referenceAssets";

// The supplied crossroads crop shows pollarded deciduous trees: scarred trunks,
// angular boughs, and long fans of fine shoots. These are not pine needle crowns.
const bark=paintMaterial(0x827454),heart=paintMaterial(0x554b37);
const budColors=[0x666548,0x8a8156].map(c=>paintMaterial(c));
const twigInk=createDryInk(.72),scarInk=createDryInk(.85);
type V=THREE.Vector3;
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);

export function buildScrollTree(form:TreeForm,seed:number,detail:DetailLevel=2,landmark=false,budding=false){
  const root=new THREE.Group();root.name=landmark?"great-pollarded-riverbank-tree":"reference-deciduous-tree";
  const old=form==="spreading"||form==="pollard", young=form==="sapling";
  const radius=landmark?.28:old?.19:.065, height=landmark?2.25:old?1.95:1.7;
  const wood:number[]=[],twigs:number[]=[],scars:number[]=[],buds:number[][]=[[],[]];
  const hash=(n:number)=>{const f=Math.sin(n*78.233+seed*12.37)*43758.5453;return f-Math.floor(f);};
  const quad=(a:V,b:V,c:V,d:V)=>wood.push(...a.toArray(),...b.toArray(),...c.toArray(),...a.toArray(),...c.toArray(),...d.toArray());
  const branch=(points:V[],r:number,end=.08)=>{
    const curve=new THREE.CatmullRomCurve3(points,false,"centripetal");
    const steps=r>.06?12:r>.015?7:4;
    const sides=r>.06?8:5;
    if(r>=.006){
      let previous:V[]=[];
      for(let j=0;j<=steps;j++){
        const t=j/steps,p=curve.getPoint(t),tangent=curve.getTangent(t);
        const n=V(0,0,1).cross(tangent).normalize(),b=tangent.clone().cross(n);
        const rr=r*(end+(1-end)*Math.pow(1-t,.84));
        const ring=Array.from({length:sides},(_,i)=>{
          const a=i*Math.PI*2/sides,k=1+.16*Math.sin(i*4.2+t*19+seed);
          return p.clone().addScaledVector(n,Math.cos(a)*rr*k).addScaledVector(b,Math.sin(a)*rr*k);
        });
        if(j)for(let i=0;i<sides;i++)quad(previous[i],ring[i],ring[(i+1)%sides],previous[(i+1)%sides]);
        previous=ring;
      }
    }
    if(r<.018)for(let j=0;j<steps;j++)twigs.push(...curve.getPoint(j/steps).toArray(),...curve.getPoint((j+1)/steps).toArray());
    if(r>.04)for(let k=0;k<(detail===0?3:7);k++)for(let j=0;j<12;j++){
      for(const t of [j/12,(j+1)/12]){
        const p=curve.getPoint(t),a=k*2.399+Math.sin(t*22+k)*.17,rr=r*(end+(1-end)*Math.pow(1-t,.84))*1.18;
        p.x+=Math.cos(a)*rr;p.z+=Math.sin(a)*rr;scars.push(...p.toArray());
      }
    }
    return curve;
  };
  const trunk=branch([
    V(0,0,0),V(-radius*.3,height*.15,.03),V(-radius*.8,height*.3,-.02),
    V(radius*.25,height*.45,.035),V(-radius*.25,height*.61,-.03),V(.07,height*.81,.015),V(-.03,height,0)
  ],radius,.23);
  if(old){
    for(let j=0;j<4;j++){
      const a=j*2.399+seed;
      branch([V(0,.26,0),V(Math.cos(a)*radius,.075,Math.sin(a)*radius),V(Math.cos(a)*radius*1.55,.005,Math.sin(a)*radius*1.55)],radius*.34,.025);
    }
    // Pollard scars and knots are solid, irregular volumes on the trunk.
    for(let j=0;j<(detail===0?8:23);j++){
      const t=.14+hash(j)*.67,c=trunk.getPoint(t),a=j*2.399+seed,r=radius*(.23+.77*Math.pow(1-t,.84));
      const knot=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),j%3===0?heart:bark);
      knot.position.copy(c).add(V(Math.cos(a)*r*.88,0,Math.sin(a)*r*.88));
      knot.scale.set(.035+hash(j+2)*.04,.055+hash(j+4)*.075,.026+hash(j+7)*.03);knot.rotation.y=-a;root.add(knot);
    }
  }
  const heads=young?4:old?7:5;
  let shootCount=0;
  for(let j=0;j<heads;j++){
    const t=.27+j/(heads-1)*.57,base=trunk.getPoint(t),a=j*2.399+seed*.18;
    const reach=(old?1.12:.55)*(1-.38*t),side=j%2?1:-1;
    const head=V(Math.cos(a)*reach+side*.28,height*(.55+j/(heads-1)*.5),Math.sin(a)*reach*.72);
    const elbow=base.clone().lerp(head,.47);elbow.y-=old?.12:0;
    branch([base,elbow,head.clone().add(V(-side*.11,-.12,.06)),head],radius*(old?.51:.35)*(1-t*.4),.24);
    if(old){const knob=new THREE.Mesh(new THREE.IcosahedronGeometry(.06,1),bark);knob.position.copy(head);knob.scale.set(1.2,.9,1);root.add(knob);}
    const count=detail===2?13:detail===1?10:7;
    for(let k=0;k<count;k++){
      const phase=a+(k/(count-1)-.5)*2.1;
      const spread=.38+hash(j*91+k)*1.05,up=.42+hash(j*71+k+8)*.88;
      const tip=head.clone().add(V(Math.cos(phase)*spread,up,Math.sin(phase)*spread*.8));
      const mid=head.clone().lerp(tip,.48).add(V(side*.06,-.09,.015));
      const shoot=branch([head.clone().add(V(.018*(k%3),0,.014*(k%4))),mid,tip],young?.008:.012,.018);shootCount++;
      const forks=detail===0?2:4;
      for(let q=0;q<forks;q++){
        const u=.3+q*.15,b=shoot.getPoint(u),sign=q%2?1:-1;
        const direction=phase+sign*(.4+hash(k+q)*.45),length=.19+hash(j*21+k*5+q)*.29;
        const end=b.clone().add(V(Math.cos(direction)*length,.15+length*.55,Math.sin(direction)*length*.7));
        const fork=branch([b,b.clone().lerp(end,.5).add(V(0,-.025,0)),end],.0042,.015);
        if(detail>0)for(let n=0;n<3;n++){
          const b2=fork.getPoint(.42+n*.2),end2=b2.clone().add(V(Math.cos(direction+n*.7)*.1,.095,Math.sin(direction+n*.7)*.07));
          branch([b2,end2],.002,.01);
        }
        // Sparse broad leaf buds, not opaque foliage balls or needle sprays.
        if(budding&&(k+q+j)%4===0){
          for(let leaf=0;leaf<2;leaf++){
            const c=end.clone().add(V(leaf*.015,-leaf*.025,0)),long=V(Math.cos(direction)*.035,.045,Math.sin(direction)*.035),across=V(-Math.sin(direction)*.016,0,Math.cos(direction)*.016);
            buds[(j+k)%2].push(...c.toArray(),...c.clone().addScaledVector(long,.5).add(across).toArray(),...c.clone().add(long).toArray(),...c.toArray(),...c.clone().add(long).toArray(),...c.clone().addScaledVector(long,.5).sub(across).toArray());
          }
        }
      }
    }
  }
  const geo=(positions:number[])=>new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  const body=geo(wood);body.computeVertexNormals();const mesh=new THREE.Mesh(body,bark);mesh.name="gnarled-deciduous-branches";root.add(mesh);
  for(const [positions,material,name] of [[twigs,twigInk,"fine-pollard-shoots"],[scars,scarInk,"broken-bark-furrows"]] as const){
    const lines=new THREE.LineSegments(geo(positions),material);lines.name=name;root.add(lines);
  }
  buds.forEach((positions,i)=>{if(positions.length){const g=geo(positions);g.computeVertexNormals();const m=new THREE.Mesh(g,budColors[i]);m.name="sparse-broad-leaf-buds";root.add(m);}});
  root.userData={treeForm:form,botanicalForm:"pollarded-deciduous",shootCount,budding};
  return root;
}
