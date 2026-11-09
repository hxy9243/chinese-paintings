import test from 'node:test';
import assert from 'node:assert/strict';
import {birds,frames,sample,sampleStepped,exposureTime,audit,HZ} from '../src/flock.js';
import {createReferenceHenRig as createHenRig,movementPose} from '../hen-study/src/motion.js';
import {createModel} from '../hen-study/src/model.js';
import {feedingAt,henPeckAt,HEN_PECK_PERIOD,CHICK_PECK_PERIOD} from '../hen-study/src/behavior.js';
sample(180);const report=audit();
test('three minutes of independent travel remain separated and physically bounded',()=>{
 assert.equal(birds.length,9);assert.ok(report.minGap>3.8);assert.ok(report.maxSpeed<47);assert.ok(report.maxStep<.4);
 for(const b of birds)assert.ok(report.travel[b.id]>550,b.id+' travels visibly');
 for(const f of frames)for(const a of f)assert.ok(Number.isFinite(a.x+a.y+a.speed));
 assert.ok(Object.values(report.offscreen).filter(v=>v>120).length>=3,'Several birds leave the paper entirely');
});
test('the visible flock stays active, with independent pecks, wing stretches and scratching',()=>{
 let quiet=0,maxQuiet=0,totalQuiet=0;
 for(let k=HZ;k<frames.length;k++){
  const visible=frames[k].filter((a,i)=>a.x+birds[i].radius>0&&a.x-birds[i].radius<286&&a.y+birds[i].radius>0&&a.y-birds[i].radius<570);
  if(visible.some(a=>a.speed>2||a.peck>.05||a.wing>.05||Math.abs(a.scratch)>.05))quiet=0;else{quiet++;totalQuiet++;}maxQuiet=Math.max(maxQuiet,quiet);
 }
 assert.ok(maxQuiet/HZ<.25,'no visible flock-wide hold');assert.ok(totalQuiet/frames.length<.01,'active for more than 99 percent of the preview');
 for(let i=0;i<birds.length;i++)for(const mode of ['peck','wing','scratch'])assert.ok(frames.some(f=>f[i].mode===mode),birds[i].id+' '+mode);
 const startTimes=birds.map((_,i)=>frames.findIndex(f=>f[i].mode==='peck'));assert.equal(new Set(startTimes).size,9,'pecks begin independently');
});
test('planted feet and toes stay fixed, while the other foot swings or scratches',()=>{
 assert.ok(report.contacts>10000);assert.equal(report.stanceSlip,0);
 for(let i=0;i<birds.length;i++){
  assert.ok(frames.some(f=>f[i].speed>12&&f[i].feet.some(p=>p.plant)&&f[i].feet.some(p=>p.lift>2)),birds[i].id+' has a supporting and swinging foot');
  for(let k=1;k<frames.length;k++){
   const a=frames[k][i],p=frames[k-1][i];assert.ok(a.feet.some(f=>f.plant),'support at '+k/HZ+' '+a.id);
   for(let j=0;j<2;j++)if(a.feet[j].plant&&p.feet[j].plant)assert.equal(a.feet[j].yaw,p.feet[j].yaw);
  }
 }
});
test('held poses are deterministic at 12 fps and the simulation continues beyond the preview',()=>{
 const target=sampleStepped(9.173);sample(198);sample(2);assert.deepEqual(sampleStepped(9.173),target);
 assert.deepEqual(sampleStepped(9.18),sampleStepped(9.24));assert.notDeepEqual(sampleStepped(9.24),sampleStepped(9.26));
 assert.notDeepEqual(sample(90),sample(0));assert.notDeepEqual(sample(180),sample(0));
 for(let t=0;t<180;t+=1/12){const f=sampleStepped(t);for(let i=0;i<f.length;i++)for(let j=i+1;j<f.length;j++)assert.ok(Math.hypot(f[i].x-f[j].x,f[i].y-f[j].y)>birds[i].radius+birds[j].radius+3.8);}
 assert.equal(exposureTime(1/12),1/12);
});
test('the hen has rigid geometry and connected bones throughout walking and actions',()=>{
 const rig=createHenRig();rig.update(sample(0)[0]);const first=rig.diagnostics().parts;
 const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));let groundedPecks=0;
 for(let t=0;t<180;t+=1/12){
  const pose=sample(t)[0];rig.update(pose);const d=rig.diagnostics();assert.deepEqual(d.parts,first,'all part geometry and scales remain fixed');
  for(let i=0;i<2;i++){const l=d.anchors['leg'+i];assert.ok(Math.abs(distance(l.hip,l.knee)-d.modelLegLengths[0])<1e-6);assert.ok(Math.abs(distance(l.knee,l.hock)-d.modelLegLengths[1])<1e-6,'tibia reaches hock at '+t);assert.ok(Math.abs(distance(l.hock,l.foot)-d.modelLegLengths[2])<1e-6,'shank reaches planted foot at '+t);}
  if(pose.peck>.999){assert.ok(d.beakHeight>=0&&d.beakHeight<1.2);groundedPecks++;}
 }
 assert.ok(groundedPecks>5);assert.ok(report.maxHenAngularAcceleration<=1.400001);
});
test('actions finish before travel resumes',()=>{
 for(let i=0;i<birds.length;i++)for(let k=1;k<frames.length;k++){
  const a=frames[k][i],p=frames[k-1][i];if(p.mode==='peck'&&a.mode!=='peck')assert.ok(p.peck<.001);
  if(p.mode==='wing'&&a.mode!=='wing')assert.ok(p.wing<.02);
 }
});
test('long playback bounds its cache and rewinding reconstructs the same trajectory',()=>{
 const expected=sample(198.125);sample(241);assert.ok(frames.length<=HZ*240+2);sample(2);assert.deepEqual(sample(198.125),expected);
});

test('the standalone walking study holds stance targets and keeps its feather geometry fixed',()=>{
 const rig=createHenRig();const before=rig.diagnostics().parts;let previous=movementPose(0,'Walk');
 for(let t=1/120;t<8;t+=1/120){const pose=movementPose(t,'Walk');rig.update(pose);assert.deepEqual(rig.diagnostics().parts,before);assert.ok(pose.feet.some(f=>f.plant));for(let i=0;i<2;i++)if(previous.feet[i].plant&&pose.feet[i].plant){assert.equal(previous.feet[i].x,pose.feet[i].x);assert.equal(previous.feet[i].y,pose.feet[i].y);}previous=pose;}
 assert.ok(before.some(p=>p.name==='Tail feather 3'));
});

test('both flanks retain matching pigment coordinates as the model turns',()=>{
 const model=createModel();
 for(const name of ['Rounded rib cage and abdomen','Continuous feathered neck','Small rounded skull']){
  const mesh=model.meshes.find(m=>m.name===name),uv=mesh.geometry.attributes.uv,p=mesh.geometry.attributes.position,pairs=new Map();
  for(let i=0;i<p.count;i++){
   const key=[p.getX(i),p.getY(i),Math.abs(p.getZ(i))].map(v=>Math.round(v*1e5)).join(',');
   if(pairs.has(key)){const j=pairs.get(key);assert.ok(Math.abs(uv.getX(i)-uv.getX(j))<1e-5,name+' horizontal ink');assert.ok(Math.abs(uv.getY(i)-uv.getY(j))<1e-5,name+' vertical ink');}else pairs.set(key,i);
  }
 }
});

test('varied feeding bouts lean down, hold that posture through the pecks and recover upright',()=>{
 const rig=createHenRig(),contactCounts=[];let largestStep=0;
 for(let phrase=0;phrase<3;phrase++){
  let contacts=0,inContact=false,previous=null,upright=0;
  for(let i=0;i<Math.round(HEN_PECK_PERIOD*12);i++){
   const pose=movementPose(phrase*HEN_PECK_PERIOD+i/12,'Peck');rig.update(pose);const d=rig.diagnostics();
   if(previous)largestStep=Math.max(largestStep,Math.hypot(...d.headPosition.map((v,k)=>v-previous.headPosition[k])));
   assert.ok(d.beakHeight>=0,'beak never passes through ground');
   if(pose.feedLower===1){assert.ok(d.bodyPitch>.45,'the whole body leans forward');assert.ok(d.bodyPosition[1]<50,'the breast settles toward the ground');}
   if(previous?.pose.feedLower===1&&pose.feedLower===1){assert.deepEqual(d.bodyPosition,previous.bodyPosition,'small strikes retain the feeding posture');assert.equal(d.bodyPitch,previous.bodyPitch);}
   if(d.beakHeight>90)upright++;
   if(pose.peck>.999){if(!inContact)contacts++;inContact=true;assert.ok(d.beakHeight<1.2);assert.ok(d.beakPosition[0]<-65);}else inContact=false;
   const n=d.neckAnchors,distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
   assert.equal(n.points.length,n.lengths.length+1);for(let j=0;j<n.lengths.length;j++)assert.ok(Math.abs(distance(n.points[j],n.points[j+1])-n.lengths[j])<1e-6,'neck segment keeps its length');assert.ok(distance(n.points.at(-1),n.end)<1e-6,'neck stays attached behind skull');previous=d;
  }
  assert.ok(upright>24,'upright observation between feeding bouts');contactCounts.push(contacts);
 }
 assert.deepEqual(contactCounts,[3,4,2],'feeding phrases have different contact counts');
 assert.ok(largestStep<27,'lowering has visible intermediate poses');assert.equal(henPeckAt(HEN_PECK_PERIOD),0);
});

test('walking alternates a world-space head hold with a quick forward thrust',()=>{
 const rig=createHenRig(),headAt=t=>{const p=movementPose(t,'Walk');rig.update(p);return rig.diagnostics().headPosition[0]+p.x;};
 const a=headAt(0),b=headAt(.25),c=headAt(7/12);
 assert.ok(Math.abs(b-a)<.01,'head stays fixed as the trunk advances during hold');
 assert.ok(Math.abs(c-b)>5,'head advances between holds');
});

test('neck bends without a sharp reverse elbow during feeding',()=>{
 const rig=createHenRig();let maxBend=0;
 for(let i=0;i<=120;i++){
  const p=movementPose(0,'Still');p.peck=i/120;rig.update(p);const d=rig.diagnostics();
  for(let j=1;j<d.neckAnchors.points.length-1;j++){
   const points=d.neckAnchors.points,a=points[j].map((x,k)=>x-points[j-1][k]),b=points[j+1].map((x,k)=>x-points[j][k]);
   const dot=a.reduce((sum,v,k)=>sum+v*b[k],0)/(Math.hypot(...a)*Math.hypot(...b));maxBend=Math.max(maxBend,Math.acos(Math.max(-1,Math.min(1,dot))));
  }
 }
 assert.ok(maxBend<Math.PI/2,'no sharp reverse elbow in the cervical chain');
});


test('hen and chick bouts lower once, make several low pecks, then recover once',()=>{
 for(const kind of ['hen','chick'])for(let variant=0;variant<3;variant++){
  const period=kind==='hen'?HEN_PECK_PERIOD:CHICK_PECK_PERIOD;
  let previous=feedingAt(0,kind,variant),descents=0,recoveries=0,contacts=0,firstContact=null,lastContact=0,lowHolds=0;
  for(let i=1;i<=Math.floor(period*120);i++){
   const t=i/120,p=feedingAt(t,kind,variant);
   if(previous.feedLower===0&&p.feedLower>0)descents++;
   if(previous.feedLower>0&&p.feedLower===0)recoveries++;
   if(p.feedStrike>.999&&previous.feedStrike<=.999){contacts++;firstContact??=t;lastContact=t;}
   if(p.feedStrike>0)assert.equal(p.feedLower,1,'strike happens after lowering');
   if(p.feedLower===1&&p.feedStrike===0)lowHolds++;
   previous=p;
  }
  assert.equal(descents,1);assert.equal(recoveries,1);assert.equal(contacts,[3,4,2][variant]);
  assert.ok(lowHolds>45,'visible inspection holds between short strikes');
  for(let t=firstContact;t<=lastContact;t+=1/120)assert.equal(feedingAt(t,kind,variant).feedLower,1,'head never returns upright between pecks');
 }
});

test('hen lowers without reversal and pecks within a small near-ground range',()=>{
 const rig=createHenRig();let previousHeight=Infinity,lowBody=null;
 for(let i=0;i<=140;i++){
  const p=movementPose(0,'Still');Object.assign(p,feedingAt(i/120));rig.update(p);const d=rig.diagnostics();
  assert.ok(d.headPosition[1]<=previousHeight+1e-6,'lowering has no upward kick or neck roll');previousHeight=d.headPosition[1];
 }
 for(let i=140;i<400;i++){
  const p=movementPose(0,'Still'),f=feedingAt(i/120);Object.assign(p,f);rig.update(p);const d=rig.diagnostics();
  if(f.feedLower===1){assert.ok(d.beakHeight>=0&&d.beakHeight<6,'short pecks stay near the floor');lowBody??=d.bodyPosition;assert.deepEqual(d.bodyPosition,lowBody,'small strikes do not bounce the lowered torso');}
 }
});

test('feeding tips the torso and attached tail together while the feet remain planted',()=>{
 const rig=createHenRig(),poses=[movementPose(0,'Peck'),movementPose(1.5,'Peck')],snap=[];
 for(const pose of poses){rig.update(pose);const d=rig.diagnostics();snap.push({d,tail:rig.model.parts.tailFront.getWorldQuaternion(rig.root.quaternion.clone())});}
 assert.ok(snap[1].d.bodyPosition[1]<snap[0].d.bodyPosition[1]-10);
 assert.ok(snap[1].d.bodyPosition[0]<snap[0].d.bodyPosition[0]-4);
 assert.ok(snap[0].tail.angleTo(snap[1].tail)>.45,'tail follows the body lean');
 for(let i=0;i<2;i++){assert.deepEqual(snap[0].d.anchors['leg'+i].foot,snap[1].d.anchors['leg'+i].foot);assert.ok(snap[1].d.anchors['leg'+i].hip[1]<snap[0].d.anchors['leg'+i].hip[1]-.12,'legs bend beneath the lowered hips');}
 const pts=snap[1].d.neckAnchors.points;
 for(let i=1;i<pts.length;i++)assert.ok(pts[i][0]<pts[i-1][0],'feeding neck continues forward without curling back under the head');
});
