import * as THREE from 'three';
import {swimmerOrientation} from './water-space.js';
import {createFishRhythm} from './fish-rhythm.js';

const RATE=60,DT=1/RATE,STRIDE=17;
const hash=n=>{const v=Math.sin(n*127.13+71.7)*43758.5453;return v-Math.floor(v);};
const clamp=THREE.MathUtils.clamp;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const desiredQ=new THREE.Quaternion(),previousQ=new THREE.Quaternion();
const catmull=(a,b,c,d,t)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
export const SWIM_LIMITS={fishTurnRate:.25,fishTurnAcceleration:.10,shrimpTurnRate:.22,shrimpTurnAcceleration:.085,depthTilt:.075,bank:.085,returnX:1330,returnY:830};

// The picture is a window onto a larger, shallow sheet of water. The steering
// history is cached at a fixed step so an absolute timestamp remains repeatable.
export function createSwimming(definitions,seed=4317){
  const specs=definitions.map((a,i)=>{
    const s=seed+i*37.17,same=definitions.map((d,j)=>d.species===a.species?j:-1).filter(j=>j>=0),local=same.indexOf(i);
    return{...a,seed:s,rhythm:a.species==='fish'?createFishRhythm(s):null,buddy:same[local%2?local-1:local+1]??-1,
      period:24+hash(s+2)*16,scatterAt:5+hash(s+3)*9,pathInterval:24+hash(s+4)*15,
      cruise:a.species==='fish'?46+hash(s+5)*16:27+hash(s+5)*12,
      halfLength:a.size*(a.species==='fish'?142:106),halfWidth:a.size*(a.species==='fish'?52:48),
      centerOffset:a.size*(a.species==='fish'?18:53)};
  });
  const first=new Float64Array(specs.length*STRIDE),cache=[first],events=[];let generatedSteps=0;
  function orient(state,a){
    swimmerOrientation(state[a+15],state[a+16],state[a+11],desiredQ);
    state.set(desiredQ.toArray(),a+7);
  }
  specs.forEach((s,i)=>{
    const a=i*STRIDE,heading=Math.atan2(s.velocity[1],s.velocity[0]);
    first.set([...s.start,...s.velocity,s.phase,0,0,0,1,0,1,s.rhythm?mood(s,0).effort:0,0,heading,Math.atan2(s.velocity[2],Math.hypot(...s.velocity.slice(0,2)))],a);orient(first,a);
  });
  function point(spec,k){
    if(k===0)return spec.start;
    if(k===1)return spec.start.map((v,j)=>j===2?0:clamp(v+spec.velocity[j]*spec.pathInterval*.85,j===0?-1300:-720,j===0?1300:720));
    if(k<0)return spec.start.map((v,j)=>v+spec.velocity[j]*spec.pathInterval*k*.70);
    const h=spec.seed+k*71.31;return[(hash(h)-.5)*2700,(hash(h+13)-.5)*1420,0];
  }
  function personalTarget(spec,t){
    const u=(t+8)/spec.pathInterval,k=Math.floor(u),f=u-k,a=point(spec,k-1),b=point(spec,k),c=point(spec,k+1),d=point(spec,k+2);
    return[0,1].map(j=>catmull(a[j],b[j],c[j],d[j],f));
  }
  function mood(spec,t){
    const u=((t+spec.period*.45-spec.scatterAt)%spec.period+spec.period)%spec.period/spec.period;
    const rhythm=spec.rhythm?.(t),entry=spec.entry?1-smooth(5,9,t):0;
    return{gather:1-smooth(.38,.52,u)*(1-smooth(.76,.94,u)),
      pace:rhythm?Math.max(rhythm.pace,entry):1,
      effort:rhythm?Math.max(rhythm.effort,entry):smooth(.15,.80,.5+.5*Math.sin(t*Math.PI*2/(7+hash(spec.seed+7)*4)+spec.seed))};
  }
  function support(spec,dx,dy,heading){
    const c=Math.cos(heading),s=Math.sin(heading);
    return Math.hypot(spec.halfLength*(dx*c+dy*s),spec.halfWidth*(-dx*s+dy*c));
  }
  function step(previous,t){
    const next=new Float64Array(previous),count=specs.length;let current=0;
    for(const e of events)if(e.time<=t&&e.kind==='current')current=e.value;
    for(let i=0;i<count;i++){
      const spec=specs[i],a=i*STRIDE,x=previous[a],y=previous[a+1],z=previous[a+2],heading=previous[a+15],{gather,effort,pace}=mood(spec,t),fish=spec.species==='fish';
      const dirX=Math.cos(heading),dirY=Math.sin(heading),target=personalTarget(spec,t);
      // A distant return bend takes place outside the paper. No wrapping or
      // position reset is used when a swimmer crosses the picture edge.
      const predictedX=x+previous[a+3]*5,predictedY=y+previous[a+4]*5;
      const returning=Math.max(smooth(1100,SWIM_LIMITS.returnX,Math.abs(predictedX)),smooth(670,SWIM_LIMITS.returnY,Math.abs(predictedY)));
      target[0]=target[0]*(1-returning)+clamp(-x*.25,-480,480)*returning;
      target[1]=target[1]*(1-returning)+clamp(-y*.25,-260,260)*returning;
      if(spec.buddy>=0){
        const b=spec.buddy*STRIDE,distance=Math.hypot(previous[b]-x,previous[b+1]-y);
        const attraction=gather*.09*smooth(350,500,distance)*(1-smooth(800,1050,distance));
        target[0]=target[0]*(1-attraction)+(previous[b]+previous[b+3]*4)*attraction;
        target[1]=target[1]*(1-attraction)+(previous[b+1]+previous[b+4]*4)*attraction;
      }
      const distance=Math.hypot(target[0]-x,target[1]-y)||1;
      let wantX=(target[0]-x)/distance,wantY=(target[1]-y)/distance;
      const centerX=x-dirX*spec.centerOffset,centerY=y-dirY*spec.centerOffset;
      let neighbours=0,avx=0,avy=0,caution=0;
      for(let j=0;j<count;j++)if(i!==j){
        const other=specs[j],b=j*STRIDE,otherHeading=previous[b+15],ox=Math.cos(otherHeading),oy=Math.sin(otherHeading);
        const rx=previous[b]-ox*other.centerOffset-centerX,ry=previous[b+1]-oy*other.centerOffset-centerY,d=Math.hypot(rx,ry)||.01;
        const nx=rx/d,ny=ry/d,min=support(spec,nx,ny,heading)+support(other,nx,ny,otherHeading)+180;
        if(d<min){const repel=(1-d/min)**2*5;wantX-=nx*repel;wantY-=ny*repel;}
        const rvx=previous[b+3]-previous[a+3],rvy=previous[b+4]-previous[a+4],rv2=rvx*rvx+rvy*rvy;
        const encounter=clamp(-(rx*rvx+ry*rvy)/(rv2||1),0,18),px=rx+rvx*encounter,py=ry+rvy*encounter,pd=Math.hypot(px,py);
        if(pd<min&&encounter>0&&d<min+850){
          const cross=dirX*py-dirY*px,side=Math.abs(cross)<30?1:Math.sign(cross);
          const avoidance=(1-pd/min)*(1-encounter/24)*3.0;
          wantX+=dirY*side*avoidance;wantY-=dirX*side*avoidance;
          if(rx*dirX+ry*dirY>0)caution=Math.max(caution,(1-smooth(.55,.95,pd/min))*(1-smooth(4,12,encounter)));
        }
        if(other.species===spec.species&&d<430){neighbours++;avx+=previous[b+3];avy+=previous[b+4];}
      }
      if(neighbours){wantX+=avx/neighbours/spec.cruise*gather*.10;wantY+=avy/neighbours/spec.cruise*gather*.10;}
      wantX+=Math.sin(current*Math.PI/180)*.17;
      for(const e of events)if(e.kind==='stir'&&t>=e.time&&t<e.time+4.8){
        const rx=x-e.x,ry=y-e.y,rr=Math.hypot(rx,ry)+30,strength=2.8*Math.exp(-(t-e.time)*.55)*Math.exp(-rr/330)/rr;
        wantX+=rx*strength;wantY+=ry*strength;
      }
      // Wider animals start avoiding one another earlier. Once outside the
      // picture, let the broad return bend take priority over that avoidance
      // so a neighbour cannot keep pushing a swimmer farther out of view.
      if(returning>0){
        const weight=returning*returning,magnitude=Math.max(1,Math.hypot(wantX,wantY));
        wantX=wantX*(1-weight)+(target[0]-x)/distance*weight*magnitude;
        wantY=wantY*(1-weight)+(target[1]-y)/distance*weight*magnitude;
      }
      const error=wrap(Math.atan2(wantY,wantX)-heading),maxTurn=spec.species==='fish'?SWIM_LIMITS.fishTurnRate:SWIM_LIMITS.shrimpTurnRate;
      const oldSpeed=Math.hypot(previous[a+3],previous[a+4]),steering=fish?.08+.92*smooth(3,30,oldSpeed):1;
      const wantedTurn=clamp(error*.40,-maxTurn,maxTurn)*steering,maxChange=(fish?SWIM_LIMITS.fishTurnAcceleration:SWIM_LIMITS.shrimpTurnAcceleration)*DT;
      const turn=previous[a+14]+clamp(wantedTurn-previous[a+14],-maxChange,maxChange),newHeading=heading+turn*DT;
      const cruise=spec.cruise*(fish?pace*(.91+.055*Math.sin(t*.13+spec.seed)):.72+.27*effort);
      const targetSpeed=Math.max(fish?2.5:20.5,cruise*(1-.48*caution*(1-returning)));
      const speed=oldSpeed+clamp(targetSpeed-oldSpeed,-(fish?11:7)*DT,(fish?10:8)*DT);
      const depthTarget=spec.start[2]*.45+17*Math.sin(t*.095+spec.seed);
      const vz=previous[a+5]+clamp((depthTarget-z)*.12-previous[a+5]*.75,-2.5,2.5)*DT;
      const vx=Math.cos(newHeading)*speed,vy=Math.sin(newHeading)*speed;
      next.set([x+vx*DT,y+vy*DT,z+vz*DT,vx,vy,vz],a);next[a+15]=newHeading;next[a+14]=turn;
      const rate=fish?.12+effort*(.65+speed/55*1.45):.15+.95*effort;next[a+6]=previous[a+6]+DT*rate;
      const bank=clamp(-turn*.17,-SWIM_LIMITS.bank,SWIM_LIMITS.bank);next[a+11]=previous[a+11]+(bank-previous[a+11])*DT*1.4;
      const tilt=clamp(Math.atan2(vz,speed)+Math.sin(t*.09+spec.seed)*.018,-SWIM_LIMITS.depthTilt,SWIM_LIMITS.depthTilt);
      next[a+16]=previous[a+16]+(tilt-previous[a+16])*DT*1.2;orient(next,a);next[a+12]=gather;next[a+13]=effort;
    }
    return next;
  }
  function ensure(frame){while(cache.length<=frame){cache.push(step(cache.at(-1),(cache.length-1)*DT));generatedSteps++;}}
  function sample(t){
    const frame=Math.max(0,t)*RATE,index=Math.floor(frame),fraction=frame-index;ensure(index+1);
    const a=cache[index],b=cache[index+1],result=[];
    for(let i=0;i<specs.length;i++){
      const at=i*STRIDE,lerp=j=>a[at+j]+(b[at+j]-a[at+j])*fraction;
      previousQ.fromArray(a,at+7);desiredQ.fromArray(b,at+7);previousQ.slerp(desiredQ,fraction);
      result.push({position:[lerp(0),lerp(1),lerp(2)],velocity:[lerp(3),lerp(4),lerp(5)],phase:lerp(6),quaternion:previousQ.toArray(),
        bank:lerp(11),gather:lerp(12),effort:lerp(13),turnRate:lerp(14),heading:lerp(15),depthTilt:lerp(16)});
    }
    return result;
  }
  function addEvent(e){events.push(e);events.sort((a,b)=>a.time-b.time);cache.length=Math.min(cache.length,Math.max(1,Math.floor(e.time*RATE)+1));}
  return{sample,setCurrent(value,time){addEvent({kind:'current',time,value});},stir(position,time){addEvent({kind:'stir',time,x:position[0],y:position[1],z:position[2]});},
    describe:()=>({seed,stepHz:RATE,cachedSeconds:(cache.length-1)/RATE,generatedSteps,limits:SWIM_LIMITS,events:[...events]})};
}
