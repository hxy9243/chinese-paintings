import {waterToWorld} from './water-space.js';

export const RIPPLE_STYLE=Object.freeze({initialDiameterRatio:.8,duration:5.6,speed:43,interval:7.4,echoDelay:.72,echoStrength:.43,maxRings:6});
const hash=n=>{const v=Math.sin(n*127.13+71.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

// Absolute-time rings, including their birth locations. Sampling old swimming
// states keeps a water mark in place after the animal that caused it moves on,
// and reproduces the same marks after seeking or changing the input history.
export function createRipples(definitions,seed,sampleSwimming){
  const shrimp=definitions.filter(a=>a.species==='shrimp');
  const bodyLength=shrimp.length?shrimp.reduce((sum,a)=>sum+a.size*212,0)/shrimp.length:.69*212;
  const radius=bodyLength*RIPPLE_STYLE.initialDiameterRatio*.5,clicks=[];
  function automatic(index){
    const born=index*RIPPLE_STYLE.interval+.35+hash(seed+index*17)*.75;
    const states=sampleSwimming(born),species=index%2?'fish':'shrimp';
    const eligible=definitions.map((a,i)=>a.species===species&&Math.abs(states[i].position[0])<790&&Math.abs(states[i].position[1])<420?i:-1).filter(i=>i>=0);
    if(!eligible.length)return{born,center:waterToWorld([(hash(seed+index*13)-.5)*1100,(hash(seed+index*19)-.5)*650]).slice(0,2),source:'water'};
    const at=eligible[Math.floor(hash(seed+index*23)*eligible.length)],animal=definitions[at],state=states[at];
    const offset=animal.size*(species==='fish'?18:53);
    const center=waterToWorld([state.position[0]-Math.cos(state.heading)*offset,state.position[1]-Math.sin(state.heading)*offset]);
    const angle=hash(seed+index*29)*Math.PI*2,drift=radius*(.9+hash(seed+index*31)*.35);
    return{born,center:[center[0]+Math.cos(angle)*drift,center[1]+Math.sin(angle)*drift],source:animal.id};
  }
  function sample(time){
    const events=clicks.filter(e=>time>=e.born&&time<e.born+RIPPLE_STYLE.duration+RIPPLE_STYLE.echoDelay);
    const last=Math.floor(time/RIPPLE_STYLE.interval);
    for(let index=Math.max(0,last-1);index<=last;index++){
      // Avoid requesting a future swimming state while drawing the present.
      const born=index*RIPPLE_STYLE.interval+.35+hash(seed+index*17)*.75;
      if(born<=time&&time<born+RIPPLE_STYLE.duration+RIPPLE_STYLE.echoDelay)events.push(automatic(index));
    }
    const rings=[];
    for(const event of events.sort((a,b)=>b.born-a.born).slice(0,3))for(let echo=0;echo<2;echo++){
      const age=time-event.born-echo*RIPPLE_STYLE.echoDelay;
      if(age<0||age>=RIPPLE_STYLE.duration)continue;
      const strength=smooth(0,.22,age)*(1-smooth(2.8,RIPPLE_STYLE.duration,age))*Math.exp(-age*.19)*(echo?RIPPLE_STYLE.echoStrength:1);
      rings.push({...event,echo,age,radius:radius+age*RIPPLE_STYLE.speed,strength});
    }
    return rings;
  }
  return{sample,stir(position,time){clicks.push({born:time,center:position.slice(0,2),source:'touch'});},
    describe(time){return{initialDiameterRatio:RIPPLE_STYLE.initialDiameterRatio,initialDiameter:radius*2,shrimpBodyLength:bodyLength,plane:'world XY',rings:sample(time),...RIPPLE_STYLE};}};
}
