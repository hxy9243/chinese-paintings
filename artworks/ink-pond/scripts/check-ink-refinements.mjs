import assert from 'node:assert/strict';
import {fishBodyInk,paperFields} from '../src/ink-fields.js';
import {createPond} from '../src/pond.js';

let back=0,belly=0,side=0,shoulder=0,n=0,loaded=0,totalAngles=0;
for(let seed=0;seed<4;seed++)for(let i=0;i<=100;i++){
  const t=i/100,s=20+seed*31;
  back+=fishBodyInk(t,0,s);belly+=fishBodyInk(t,Math.PI,s);side+=fishBodyInk(t,Math.PI/2,s);shoulder+=fishBodyInk(t,Math.PI/4,s);n++;
  for(let angle=0;angle<72;angle++){if(fishBodyInk(t,angle/72*Math.PI*2,s)>.55)loaded++;totalAngles++;}
  assert.ok(Math.abs(fishBodyInk(t,0,s)-fishBodyInk(t,2*Math.PI,s))<1e-10,'Paint must close around the 3D UV seam');
}
assert.ok(back/n>.75&&belly/n>.10&&belly/n<.23,'A dark spine must sit above a visible dilute belly wash');
assert.ok(side/n<.26&&shoulder/n<.30&&loaded/totalAngles<.16,'The loaded back must remain a narrow strip');
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
const shrimpModels=pond.animals.filter(a=>a.definition.species==='shrimp'),density=shrimpModels.map(a=>a.definition.ink);
assert.ok(Math.max(...density)/Math.min(...density)>4.5,'Shrimp washes should range from very pale to loaded ink');
for(const animal of shrimpModels)animal.model.root.traverse(mesh=>{if(mesh.userData.inkGlyph)assert.ok(mesh.userData.paintOpacity>=.9,'Pale shrimp must retain dark eye marks');});
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
console.log(JSON.stringify({pass:true,backDeposit:back/n,bellyDeposit:belly/n,sideDeposit:side/n,darkStripFraction:loaded/totalAngles,shrimpDensities:density,paperCloudRange:[Math.min(...clouds),Math.max(...clouds)],foxingFraction:spots.filter(v=>v>.2).length/spots.length,motion,maxFingerGap},null,2));
