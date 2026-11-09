import {henFootHome} from '../hen-study/src/contact.js';
import {feedingAt,HEN_PECK_PERIOD,CHICK_PECK_PERIOD} from '../hen-study/src/behavior.js';
// Absolute-time, fixed-step flock in a world larger than the sheet of paper.
export const WIDTH=286, HEIGHT=570, DURATION=90, HZ=120;
export const birds=[
 {id:'mother-hen',name:'Mother hen',kind:'hen',home:[177,122],radius:108,mass:8,maxSpeed:23,acceleration:30,seed:71},
 {id:'upper-black',name:'01 · The eager one',kind:'black',home:[85,238],radius:30,mass:1,maxSpeed:43,acceleration:75,seed:3},
 {id:'edge-black',name:'02 · The explorer',kind:'black',home:[238,260],radius:31,mass:1,maxSpeed:39,acceleration:75,seed:19},
 {id:'middle-black',name:'03 · The forager',kind:'black',home:[146,303],radius:29,mass:1,maxSpeed:35,acceleration:70,seed:8},
 {id:'middle-yellow',name:'04 · Golden chick',kind:'yellow',home:[222,355],radius:29,mass:1,maxSpeed:44,acceleration:80,seed:12},
 {id:'right-black',name:'05 · The lookout',kind:'black',home:[79,375],radius:34,mass:1,maxSpeed:36,acceleration:70,seed:37},
 {id:'lower-yellow',name:'06 · Golden follower',kind:'yellow',home:[151,432],radius:28,mass:1,maxSpeed:41,acceleration:75,seed:47},
 {id:'left-black',name:'07 · The curious one',kind:'black',home:[53,487],radius:29,mass:1,maxSpeed:38,acceleration:75,seed:29},
 {id:'bottom-black',name:'08 · The latecomer',kind:'black',home:[231,499],radius:28,mass:1,maxSpeed:34,acceleration:70,seed:53},
];
const inside=[[110,240],[226,263],[158,310],[86,350],[228,365],[137,405],[57,453],[220,474],[132,516]];
const outside=[[365,245],[380,355],[370,465],[167,650],[-80,440],[-80,530]];
const henRoute=[[177,180],[173,102],[188,284],[175,150],[390,260],[176,180],[195,360],[172,110]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v,0,1);return v*v*v*(v*(v*6-15)+10);};
const rand=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const openingHeading=id=>id==='left-black'?Math.PI/2:-Math.PI/2;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const obstacles=[{x:0,y:0,w:47,h:321},{x:249,y:537,w:37,h:33}];
function bounds(a){
 a.x=clamp(a.x,-200,500);a.y=clamp(a.y,-170,740);
 for(const o of obstacles){const x=clamp(a.x,o.x,o.x+o.w),y=clamp(a.y,o.y,o.y+o.h),dx=a.x-x,dy=a.y-y,d=Math.hypot(dx,dy);if(d<a.radius+4&&d>0){const q=(a.radius+4-d)/d;a.x+=dx*q;a.y+=dy*q;}}
}
// Conservative full-body envelopes, including tail and swinging feet, remain
// active outside the viewport too. Birds never teleport or respawn at an edge.
function separate(list,iterations=16){
 for(let k=0;k<iterations;k++){
  for(const a of list)bounds(a);
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
   const a=list[i],b=list[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),minimum=a.radius+b.radius+4;
   if(d<minimum){const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0,overlap=minimum-d,wa=1/a.mass,wb=1/b.mass;
    a.x-=nx*overlap*wa/(wa+wb);a.y-=ny*overlap*wa/(wa+wb);b.x+=nx*overlap*wb/(wa+wb);b.y+=ny*overlap*wb/(wa+wb);
    const closing=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(closing>0){a.vx-=nx*closing*wa/(wa+wb);a.vy-=ny*closing*wa/(wa+wb);b.vx+=nx*closing*wb/(wa+wb);b.vy+=ny*closing*wb/(wa+wb);}
   }
  }
 }
}
function chooseGoal(a,list,t){
 const candidates=a.kind==='hen'?[henRoute[a.trip%henRoute.length]]:a.trip%4===3?outside:inside;
 let best=candidates[0],score=-Infinity;
 for(let k=0;k<candidates.length;k++){
  const p=candidates[k],d=Math.hypot(p[0]-a.x,p[1]-a.y),clearance=Math.min(...list.filter(b=>b!==a).map(b=>Math.hypot(p[0]-b.x,p[1]-b.y)-a.radius-b.radius));
  const s=rand(a.seed*71+a.trip*113+k*13)*80+Math.min(240,d)*.3+Math.min(60,clearance)*1.4-(d<110?150:0);
  if(s>score){score=s;best=p;}
 }
 a.goal=[...best];a.trip++;a.mode='walk';a.until=t+(a.kind==='hen'?12:5.8)+rand(a.seed+a.trip)*2.5;
}
function initial(){return birds.map((b,i)=>({...b,x:b.home[0],y:b.home[1],vx:0,vy:0,goal:[...b.home],mode:'look',until:i===0?1.2:.05+i*.11,trip:0,distance:0,heading:openingHeading(b.id),headHeading:openingHeading(b.id),angularSpeed:0,phase:0,peck:0,feedLower:0,feedStrike:0,feedStage:'watch',wing:0,scratch:0,actionStart:0,actionDuration:0,peckCount:1,nextFoot:i%2,stepDistance:0,feet:[]}));}
export function footHome(a,side){if(a.kind==='hen')return henFootHome(a,side===0?-1:1);const spread=(a.kind==='hen'?9:4)*(side===0?-1:1);return{x:a.x+Math.cos(a.heading)*spread,y:a.y+(a.kind==='hen'?66:19)-Math.sin(a.heading)*spread*.42};}
function resetFeet(a){a.feet=[0,1].map(i=>({...footHome(a,i),yaw:a.heading,lift:0,plant:1,swing:null}));}
// Event-driven alternating steps: land the current foot before lifting the
// other. Both position and toe direction are locked throughout a stance.
function stepFeet(a,dt){
 const hen=a.kind==='hen',speed=Math.hypot(a.vx,a.vy),stride=hen?23:16;
 const travel=(speed+Math.abs(a.angularSpeed)*(hen?10:4))*dt;a.phase+=travel/stride;a.stepDistance+=travel;
 let swinging=false;
 for(const f of a.feet)if(f.swing){
  const s=f.swing;s.time=Math.min(s.duration,s.time+dt);const u=s.time/s.duration,q=smooth(u);
  f.x=s.x+(s.end.x-s.x)*q;f.y=s.y+(s.end.y-s.y)*q;f.yaw=s.yaw+angleDelta(s.yaw,s.end.yaw)*q;
  f.lift=Math.sin(Math.PI*u)**2*s.height;f.plant=0;
  if(u===1){f.x=s.end.x;f.y=s.end.y;f.lift=0;f.plant=1;f.swing=null;}else swinging=true;
 }
 if(swinging||a.mode==='scratch')return;
 const moving=speed>1||Math.abs(a.angularSpeed)>.08;
 const errors=a.feet.map((f,i)=>dist(f,footHome(a,i)));
 let i=a.nextFoot;
 if(!moving&&errors[i]<.3)i=1-i;
 const turnError=Math.abs(angleDelta(a.feet[i].yaw,a.heading));
 if((moving&&(a.stepDistance>stride*.42||errors[i]>stride*.30||turnError>.24))||(!moving&&(errors[i]>.3||turnError>.015))){
  const f=a.feet[i],duration=moving?clamp(stride/Math.max(speed*2,1)*.78,hen?.24:.13,hen?.42:.28):hen?.30:.20;
  const h=footHome(a,i),lead=moving?duration*.75:0;
  f.swing={x:f.x,y:f.y,yaw:f.yaw,time:0,duration,height:moving?(hen?3.6:4.6):1.7,end:{x:h.x+a.vx*lead,y:h.y+a.vy*lead,yaw:a.heading+a.angularSpeed*duration*.5}};
  f.plant=0;a.nextFoot=1-i;a.stepDistance=0;
 }
}
function actionValues(a,t){
 const elapsed=t-a.actionStart,u=elapsed/(a.actionDuration||1);
 const feeding=a.mode==='peck'?feedingAt(elapsed,a.kind==='hen'?'hen':'chick',(a.trip+a.seed)%3):{peck:0,feedLower:0,feedStrike:0,feedStage:'watch'};
 Object.assign(a,feeding);
 a.wing=a.mode==='wing'?Math.sin(Math.PI*clamp(u,0,1))*(.68+.32*Math.sin(u*Math.PI*6)**2):0;
 a.scratch=a.mode==='scratch'?Math.sin(Math.PI*clamp(u,0,1))*Math.sin(u*Math.PI*6):0;
}
function startAction(a,t){
 // Each bird's schedule follows its own arrivals and seeded choices.
 const choice=(a.trip+a.seed)%7;
 a.mode=choice===0||choice===4?'wing':choice===2?'scratch':choice===5?'look':'peck';
 a.actionStart=t;
 a.actionDuration=a.mode==='peck'?(a.kind==='hen'?HEN_PECK_PERIOD:CHICK_PECK_PERIOD):a.mode==='wing'?1.8+rand(a.seed+a.trip):a.mode==='scratch'?1.7:.65+rand(a.seed+a.trip)*.8;
 a.until=t+a.actionDuration;
}
function snapshot(list){return list.map(a=>({id:a.id,x:a.x,y:a.y,vx:a.vx,vy:a.vy,speed:Math.hypot(a.vx,a.vy),distance:a.distance,heading:a.heading,headHeading:a.headHeading,angularSpeed:a.angularSpeed,phase:a.phase,mode:a.mode,peck:a.peck,feedLower:a.feedLower,feedStrike:a.feedStrike,feedStage:a.feedStage,wing:a.wing,scratch:a.scratch,actionTime:a.actionStart,feet:a.feet.map((f,i)=>{const scratch=i===0?a.scratch:0,reach=a.kind==='hen'?6:4;return{x:f.x-Math.sin(a.heading)*scratch*reach,y:f.y-Math.cos(a.heading)*scratch*reach*.42,yaw:f.yaw,lift:f.lift+Math.abs(scratch)*1.6,plant:Math.abs(scratch)>.000001?0:f.plant};})}));}
function* simulate(){
 const list=initial();for(const a of list)resetFeet(a);const dt=1/HZ;yield snapshot(list);
 for(let frame=1;true;frame++){
  const t=frame/HZ;
  for(const a of list){
   if(a.mode==='walk'&&(Math.hypot(a.goal[0]-a.x,a.goal[1]-a.y)<7||t>a.until)){a.mode='settle';a.until=t+.25+rand(a.seed+a.trip)*.3;}
   else if(a.mode==='settle'&&t>a.until&&Math.hypot(a.vx,a.vy)<1.2&&a.feet.every(f=>f.plant))startAction(a,t);
   else if(['peck','wing','scratch','look'].includes(a.mode)&&t>a.until)chooseGoal(a,list,t);
   actionValues(a,t);
   let waypoint=a.goal;
   // Route around the bottom of the tall inscription instead of pushing into it.
   const margin=a.radius+14;
   if(a.x<47+margin&&a.y>321&&a.goal[0]>47&&a.goal[1]<321+margin)waypoint=[47+margin+8,321+margin+8];
   const dx=waypoint[0]-a.x,dy=waypoint[1]-a.y,d=Math.hypot(dx,dy),moving=a.mode==='walk',arrive=Math.min(a.maxSpeed,Math.sqrt(2*a.acceleration*d)*.65,d*2);
   let tx=moving&&d>.015?dx/d*arrive:0,ty=moving&&d>.015?dy/d*arrive:0;
   for(const b of list)if(a!==b&&moving){
    const rx=b.x-a.x,ry=b.y-a.y,rvx=a.vx-b.vx,rvy=a.vy-b.vy,min=a.radius+b.radius+13,dd=Math.hypot(rx,ry);
    const closest=clamp((rx*rvx+ry*rvy)/(rvx*rvx+rvy*rvy+1),0,1.3),future=Math.hypot(rx-rvx*closest,ry-rvy*closest);
    if(dd<min+30){const pressure=clamp((min+30-dd)/30,0,1);tx-=rx/dd*pressure*28;ty-=ry/dd*pressure*28;}
    if(future<min&&dd<min+85){const side=clamp((min-future)/min,0,1),n=Math.hypot(tx,ty)||1,ox=tx,oy=ty;tx+=-oy/n*side*28;ty+=ox/n*side*28;}
   }
   // Steer around the inscription and seal before their solid boundaries.
   for(const o of obstacles)if(moving){const ox=clamp(a.x,o.x,o.x+o.w),oy=clamp(a.y,o.y,o.y+o.h),rx=a.x-ox,ry=a.y-oy,dd=Math.hypot(rx,ry),gap=dd-a.radius-4;if(gap<12&&dd>0){const push=clamp((12-gap)/12,0,1)*a.maxSpeed;tx+=rx/dd*push;ty+=ry/dd*push;}}
   const desired=Math.hypot(tx,ty);if(desired>a.maxSpeed){tx*=a.maxSpeed/desired;ty*=a.maxSpeed/desired;}
   let target=desired>1.2?Math.atan2(tx,ty):a.heading;
   // Pecks and rests keep their orientation. An action always finishes before
   // travelling resumes; the hen no longer chatters between action states.
   const hen=a.kind==='hen',speed=Math.hypot(a.vx,a.vy),limit=Math.min(hen?.8:2.3,a.acceleration*.65/Math.max(1,speed));
   const delta=angleDelta(a.heading,target),desiredTurn=clamp(delta*(hen?2.5:3.4),-limit,limit),angularAccel=hen?1.4:5;
   a.angularSpeed+=clamp(desiredTurn-a.angularSpeed,-angularAccel*dt,angularAccel*dt);
   const rotation=a.angularSpeed*dt;a.heading+=rotation;
   a.headHeading+=angleDelta(a.headHeading,a.heading+clamp(delta,-.18,.18))*Math.min(1,dt*(hen?4:6));
   const forward=Math.max(0,Math.cos(angleDelta(a.heading,Math.atan2(tx,ty))));
   let locomotion=Math.hypot(tx,ty)*forward;
   for(const b of list)if(a!==b){const rx=b.x-a.x,ry=b.y-a.y,along=rx*Math.sin(a.heading)+ry*Math.cos(a.heading),across=Math.abs(rx*Math.cos(a.heading)-ry*Math.sin(a.heading)),envelope=a.radius+b.radius+5;
    if(along>0&&across<envelope){const gap=along-Math.sqrt(envelope*envelope-across*across);locomotion=Math.min(locomotion,Math.max(moving?1.5:0,Math.sqrt(2*a.acceleration*Math.max(0,gap-2))*.65));}
   }
   tx=Math.sin(a.heading)*locomotion;ty=Math.cos(a.heading)*locomotion;
   const previousVx=a.vx;a.vx=a.vx*Math.cos(rotation)+a.vy*Math.sin(rotation);a.vy=a.vy*Math.cos(rotation)-previousVx*Math.sin(rotation);
   let ax=(tx-a.vx)*(hen?3.2:4.5),ay=(ty-a.vy)*(hen?3.2:4.5),force=Math.hypot(ax,ay);if(force>a.acceleration){ax*=a.acceleration/force;ay*=a.acceleration/force;}
   a.vx+=ax*dt;a.vy+=ay*dt;a.oldX=a.x;a.oldY=a.y;a.x+=a.vx*dt;a.y+=a.vy*dt;

  }
  separate(list);
  for(const a of list){
   a.vx=(a.x-a.oldX)/dt;a.vy=(a.y-a.oldY)/dt;a.distance+=Math.hypot(a.x-a.oldX,a.y-a.oldY);
   stepFeet(a,dt);
  }
  yield snapshot(list);
 }
}
export const frames=[];let simulation=simulate(),frameOffset=0;
function ensure(t){
 // Retain four minutes of exact samples. Rewind reconstructs the same seeded
 // simulation, so a gallery tab can run indefinitely without unbounded memory.
 if(t*HZ<frameOffset){simulation=simulate();frames.length=0;frameOffset=0;}
 const count=Math.ceil(t*HZ)+2;while(frameOffset+frames.length<count){frames.push(simulation.next().value);if(frames.length>HZ*240+2){frames.splice(0,HZ*120);frameOffset+=HZ*120;}}
}
ensure(DURATION);
export const STEP_FPS=12;
export const exposureTime=t=>Math.floor(Math.max(0,t)*STEP_FPS+1e-8)/STEP_FPS;
export const sampleStepped=t=>sample(exposureTime(t));
export function sample(t){
 t=Math.max(0,t);ensure(t);const k=Math.min(frames.length-2,Math.floor(t*HZ)-frameOffset),u=t*HZ-frameOffset-k;
 return frames[k].map((a,i)=>{const b=frames[k+1][i],s={...a,time:t};for(const key of ['x','y','vx','vy','speed','distance','phase','peck','feedLower','feedStrike','wing','scratch','heading','headHeading','angularSpeed'])s[key]=a[key]+(b[key]-a[key])*u;
  s.feet=a.feet.map((f,j)=>({x:f.x+(b.feet[j].x-f.x)*u,y:f.y+(b.feet[j].y-f.y)*u,yaw:f.yaw+(b.feet[j].yaw-f.yaw)*u,lift:f.lift+(b.feet[j].lift-f.lift)*u,plant:f.plant&&b.feet[j].plant}));return s;});
}
export function audit(){
 let minGap=Infinity,maxSpeed=0,maxStep=0,stanceSlip=0,contacts=0,maxAngularSpeed=0,maxHenAngularAcceleration=0,maxPeckStep=0;
 const travel=Object.fromEntries(birds.map(b=>[b.id,0])),offscreen=Object.fromEntries(birds.map(b=>[b.id,0]));
 for(let k=0;k<frames.length;k++){
  const list=frames[k];for(let i=0;i<list.length;i++){
   const a=list[i],r=birds[i].radius;maxSpeed=Math.max(maxSpeed,a.speed);maxAngularSpeed=Math.max(maxAngularSpeed,Math.abs(a.angularSpeed));
   if(a.x+r<0||a.x-r>WIDTH||a.y+r<0||a.y-r>HEIGHT)offscreen[a.id]++;
   if(k){const p=frames[k-1][i],d=dist(a,p);travel[a.id]+=d;maxStep=Math.max(maxStep,d);maxPeckStep=Math.max(maxPeckStep,Math.abs(a.peck-p.peck));if(i===0)maxHenAngularAcceleration=Math.max(maxHenAngularAcceleration,Math.abs(a.angularSpeed-p.angularSpeed)*HZ);for(let f=0;f<2;f++)if(a.feet[f].plant&&p.feet[f].plant){stanceSlip=Math.max(stanceSlip,dist(a.feet[f],p.feet[f]));contacts++;}}
   for(let j=i+1;j<list.length;j++)minGap=Math.min(minGap,dist(a,list[j])-birds[i].radius-birds[j].radius);
  }
 }
 return{frames:frames.length,hz:HZ,duration:(frames.length-2)/HZ,startTime:frameOffset/HZ,minGap,maxSpeed,maxStep,stanceSlip,contacts,maxAngularSpeed,maxHenAngularAcceleration,maxPeckStep,travel,offscreen};
}
