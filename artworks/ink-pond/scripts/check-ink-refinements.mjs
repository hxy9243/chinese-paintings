import assert from 'node:assert/strict';
import {fishBodyInk,paperFields} from '../src/ink-fields.js';
import {createPond} from '../src/pond.js';

let back=0,belly=0,n=0;
for(let seed=0;seed<4;seed++)for(let i=0;i<=100;i++){
  const t=i/100,s=20+seed*31;
  back+=fishBodyInk(t,0,s);belly+=fishBodyInk(t,Math.PI,s);n++;
  assert.ok(Math.abs(fishBodyInk(t,0,s)-fishBodyInk(t,2*Math.PI,s))<1e-10,'Paint must close around the 3D UV seam');
}
assert.ok(back/n>.75&&belly/n<.015,'The back must carry ink and the belly reserve paper');
const clouds=[],spots=[];
for(let y=0;y<=100;y++)for(let x=0;x<=100;x++){const p=paperFields(x/100,y/100);clouds.push(p.cloud);spots.push(p.foxing);assert.deepEqual(p,paperFields(x/100,y/100));}
assert.ok(Math.max(...clouds)-Math.min(...clouds)>.35,'Paper needs broad visible variation');
assert.ok(spots.some(v=>v>.2)&&spots.filter(v=>v>.2).length<spots.length*.12,'Foxing should remain sparse');

function center(mesh,fraction){
  const {rows,columns}=mesh.geometry.userData.paintLattice,p=mesh.geometry.attributes.position.array,row=Math.round(fraction*(rows-1)),v=[0,0,0];
  for(let c=0;c<columns-1;c++)for(let k=0;k<3;k++)v[k]+=p[(row*columns+c)*3+k]/(columns-1);return v;
}
const sub=(a,b)=>a.map((v,i)=>v-b[i]),length=v=>Math.hypot(...v);
const pond=createPond({fish:0,shrimp:1}),shrimp=pond.animals.find(a=>a.definition.id==='shrimp-1'),claws=[],fingers=[];
shrimp.model.root.traverse(mesh=>{const tag=mesh.userData.waterAppendage;if(tag?.kind==='claw')claws.push(mesh);if(tag?.kind==='finger'&&tag.limb.kind==='claw')fingers.push(mesh);});
const samples=claws.map(()=>({tips:[],angles:[],lengths:[[],[],[]]}));let maxFingerGap=0;
for(let frame=0;frame<=288;frame++){
  pond.update(frame/8);
  claws.forEach((mesh,i)=>{
    const p=[0,1/3,2/3,1].map(f=>center(mesh,f)),segments=p.slice(1).map((v,j)=>sub(v,p[j])),s=samples[i];
    s.tips.push(p[3]);segments.forEach((v,j)=>s.lengths[j].push(length(v)));
    s.angles.push(Math.acos(Math.max(-1,Math.min(1,segments[0].reduce((sum,v,k)=>sum+v*segments[1][k],0)/(length(segments[0])*length(segments[1]))))));
    for(const finger of fingers.filter(f=>f.userData.waterAppendage.limb.side===mesh.userData.waterAppendage.side))maxFingerGap=Math.max(maxFingerGap,length(sub(center(finger,0),p[3])));
  });
}
const motion=samples.map(s=>({tipTravel:Math.hypot(...[0,1,2].map(k=>Math.max(...s.tips.map(p=>p[k]))-Math.min(...s.tips.map(p=>p[k])))),elbowRangeDegrees:(Math.max(...s.angles)-Math.min(...s.angles))*180/Math.PI,lengthVariation:s.lengths.map(a=>(Math.max(...a)-Math.min(...a))/(a.reduce((s,v)=>s+v,0)/a.length))}));
pond.dispose();
assert.ok(motion.every(m=>m.tipTravel>70&&m.elbowRangeDegrees>25),'Both claws need visible sweeps and substantial bends');
assert.ok(motion.every(m=>m.lengthVariation.every(v=>v<.035)),'Large bends must preserve rigid limb lengths');
assert.ok(maxFingerGap<.01,'Pincers must remain attached to the wrist');
console.log(JSON.stringify({pass:true,backDeposit:back/n,bellyDeposit:belly/n,paperCloudRange:[Math.min(...clouds),Math.max(...clouds)],foxingFraction:spots.filter(v=>v>.2).length/spots.length,motion,maxFingerGap},null,2));
