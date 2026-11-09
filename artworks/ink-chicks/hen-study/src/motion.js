import * as THREE from 'three';
import {createModel,ANATOMY,bendJoint} from './model.js';
import {createLeg,LEG_LENGTHS,LEG_RADII,HIP_HEIGHT} from './legs.js';
export {LEG_LENGTHS,LEG_RADII} from './legs.js';
import {feedingAt} from './behavior.js';
import {HEN_SCALE,GROUND_OFFSET,GROUND_DEPTH,henFootHome} from './contact.js';
export {HEN_SCALE,GROUND_OFFSET,GROUND_DEPTH,henFootHome} from './contact.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*v*(v*(v*6-15)+10);};
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
// A hold/thrust cycle: gradual retraction relative to the moving trunk holds
// the head approximately still in world space, followed by a quick reset.
export function walkingHeadOffset(phase,strideDistance){
 const q=((phase*2)%1+1)%1,hold=.72;
 return q<hold?strideDistance*(q-hold/2):strideDistance*(hold/2-hold*smooth((q-hold)/(1-hold)));
}
export function createReferenceHenRig(referenceTexture=null){
 const model=createModel({referenceTexture}),root=new THREE.Group();root.name='Mother hen — anatomical articulated rig';root.add(model.root);model.root.scale.setScalar(HEN_SCALE);
 const legs=[];
 for(const [i,name]of ['far foot','near foot'].entries()){
  model.parts[name].visible=false;const side=i===0?-1:1,leg=createLeg(side,model.materials);model.root.add(leg.group);legs.push({...leg,side});
 }
 const marker=new THREE.Object3D();marker.position.fromArray(ANATOMY.beakTip);model.parts.head.add(marker);
 let lastPose=null,anchors={},neckAnchors={},mode='ink';
 function setMode(value){mode=value;model.setMode(value);for(const leg of legs)leg.setMode(value);}
 function update(pose){
  lastPose=pose;const heading=pose.heading??-Math.PI/2,theta=heading+Math.PI/2;root.rotation.y=theta;
  const peck=clamp(pose.peck??0),wing=clamp(pose.wing??0),run=clamp((pose.speed??0)/23),cycle=(pose.phase??0)*Math.PI*2;
  const bob=run*.012*(1-Math.cos(cycle*2)),roll=run*.012*Math.sin(cycle),body=model.parts.body;
  body.position.fromArray(ANATOMY.body);body.position.y+=bob;body.rotation.set(roll,0,run*.008*Math.sin(cycle));
  const lower=clamp(pose.feedLower??peck/.90),strike=clamp(pose.feedStrike??(peck-.90)/.10);
  model.setPosture(lower);
  const look=pose.mode==='look'?.13*Math.sin(((pose.time??0)-(pose.actionTime??0))*1.8):0;
  const yaw=(clamp(delta(heading,pose.headHeading??heading),-.18,.18)+look)*(1-lower);
  const base=V(...ANATOMY.neckRoot).add(V(0,bob,0));
  if(lower>0)neckAnchors=model.setFeedingNeck(lower,strike,yaw,base);
  else{
   const strideDistance=(pose.strideLength??23)/2/HEN_SCALE*clamp((pose.speed??0)/5);
   const headTarget=V(...ANATOMY.head);headTarget.x+=walkingHeadOffset(pose.phase??0,strideDistance);
   neckAnchors=model.setNeck(headTarget,0,yaw,base);
  }
  for(const [name,side]of [['wing',1],['far wing',-1]]){
   const w=model.parts[name];w.rotation.set(-side*wing*.45,-side*wing*.95,wing*.10);
   w.children.filter(m=>m.name.includes('primary')).forEach((m,i)=>{m.rotation.z=-1.84+i*.06+wing*(i-2)*.06;});
  }
  model.parts.tailFront.rotation.set(wing*.018,0,run*.012*Math.sin(cycle+.5));
  const inverse=new THREE.Quaternion().setFromAxisAngle(V(0,1,0),-theta);anchors={};
  for(let i=0;i<2;i++){
   const l=legs[i],f=pose.feet?.[i]??{...henFootHome({...pose,heading},l.side),lift:0,yaw:heading};
   const at=V(f.x-pose.x,(f.lift??0)/Math.sqrt(1-GROUND_DEPTH**2)+.8,(f.y-(pose.y+GROUND_OFFSET))/GROUND_DEPTH).applyQuaternion(inverse).divideScalar(HEN_SCALE);
   // Rotate through the feather-hidden femur before solving the visible hock.
   // This preserves all three physical lengths during long planted strides.
   const hip=model.posturePoint(V(.15,HIP_HEIGHT+bob,l.side*.25)),knee=V();
   const kneeAt=angle=>hip.clone().add(V(-Math.cos(angle)*LEG_LENGTHS[0],-Math.sin(angle)*LEG_LENGTHS[0],0));
   let angle=.56+.10*Math.tanh((at.x-.06)*3);
   if(kneeAt(angle).distanceTo(at)>LEG_LENGTHS[1]+LEG_LENGTHS[2]-.012){
    let low=angle,high=1.56;
    for(let j=0;j<28;j++){const mid=(low+high)/2;if(kneeAt(mid).distanceTo(at)>LEG_LENGTHS[1]+LEG_LENGTHS[2]-.012)low=mid;else high=mid;}angle=high;
   }
   knee.copy(kneeAt(angle));const hock=bendJoint(knee,at,LEG_LENGTHS[1],LEG_LENGTHS[2],V(1,0,0));
   l.update(hip,knee,hock,at,delta(heading,f.yaw??heading),(f.lift??0)/HEN_SCALE);
   anchors['leg'+i]={hip:hip.toArray(),knee:knee.toArray(),hock:hock.toArray(),foot:at.toArray(),reach:hip.distanceTo(at)};
  }
  root.updateMatrixWorld(true);
 }
 function diagnostics(){const parts=[];root.traverse(o=>{if(o.isMesh)parts.push({name:o.name,vertices:o.geometry.attributes.position.count,scale:o.scale.toArray(),geometry:o.geometry.uuid});});return{parts,anchors:structuredClone(anchors),neckAnchors,legLengths:LEG_LENGTHS.map(l=>l*HEN_SCALE),modelLegLengths:LEG_LENGTHS,beakHeight:marker.getWorldPosition(V()).y,beakPosition:marker.getWorldPosition(V()).toArray(),headPosition:model.parts.head.getWorldPosition(V()).toArray(),bodyPosition:model.parts.body.getWorldPosition(V()).toArray(),bodyPitch:model.parts.posture.rotation.z,legRadii:LEG_RADII,pose:lastPose,model:'anatomical-hen-v14',mode};}
 setMode('ink');return{root,model,update,setMode,diagnostics};
}
export const HEN_VIEWS=[['Left',-90],['Front left',-45],['Front',0],['Front right',45],['Right',90],['Back right',135],['Back',180],['Back left',225]];
export const HEN_ACTIONS=['Still','Walk','Peck','Wings','Scratch','Look'];
export function movementPose(time,action='Walk',heading=-Math.PI/2){
 const t=Math.floor(Math.max(0,time)*12+1e-8)/12,walking=action==='Walk',speed=walking?18:0,period=1.18;
 const position=s=>({x:Math.sin(heading)*speed*s,y:Math.cos(heading)*speed*s*GROUND_DEPTH,heading});
 const p={id:'mother-hen',...position(t),time:t,speed,strideLength:speed*period,phase:t/period,heading,headHeading:heading,mode:action.toLowerCase(),peck:0,wing:0,scratch:0,actionTime:0};
 const u=(t%2.4)/2.4;
 if(action==='Peck')Object.assign(p,feedingAt(t));
 if(action==='Wings')p.wing=Math.sin(Math.PI*u)**2*(.72+.28*Math.sin(u*Math.PI*4)**2);
 if(action==='Scratch')p.scratch=Math.sin(Math.PI*u)**2*Math.sin(u*Math.PI*6);
 p.feet=[-1,1].map((side,i)=>{
  if(!walking){const f={...henFootHome(p,side),yaw:heading,plant:1,lift:0};if(i===0&&action==='Scratch'){f.x-=Math.sin(heading)*p.scratch*6;f.y-=Math.cos(heading)*p.scratch*6*GROUND_DEPTH;f.lift=Math.abs(p.scratch)*1.6;f.plant=Math.abs(p.scratch)<1e-7?1:0;}return f;}
  const phase=t/period+i*.5,cycle=Math.floor(phase),f=phase-cycle,start=(cycle-i*.5)*period;
  const a=henFootHome(position(start+.33*period),side),b=henFootHome(position(start+1.33*period),side),s=clamp((f-.66)/.34),q=smooth(s);
  return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q,lift:Math.sin(s*Math.PI)**2*3.6,plant:f<=.66?1:0,yaw:heading};
 });
 return p;
}
