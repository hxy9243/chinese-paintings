const hash=n=>{const v=Math.sin(n*127.13+71.7)*43758.5453;return v-Math.floor(v);};
const smooth=(a,b,x)=>{const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);};

// Unequal, individually offset bouts: a few strokes, an unpowered glide,
// a short quiet drift, then a gradual return to swimming. Absolute time keeps
// the same rhythm when the painting is paused or sought backwards.
export function createFishRhythm(seed){
  const bouts=[];let end=0;
  function extend(){
    const key=seed+bouts.length*93.71;
    const swim=4.5+hash(key+11)*4,coast=3.5+hash(key+17)*2.5,rest=2.8+hash(key+23)*3.2,wake=2+hash(key+29)*1.2;
    bouts.push({start:end,swim,coast,rest,wake});end+=swim+coast+rest+wake;
  }
  const offset=hash(seed+41)*22;
  return time=>{
    const t=Math.max(0,time)+offset;while(end<=t)extend();
    let lo=0,hi=bouts.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(bouts[mid].start<=t)lo=mid;else hi=mid-1;}
    const b=bouts[lo],u=t-b.start;
    if(u<b.swim){
      const middle=smooth(0,.8,u)*(1-smooth(b.swim-2.4,b.swim-1.8,u));
      const strokes=1-.12*middle*(.5+.5*Math.sin(time*1.3+seed));
      return{effort:strokes*(1-smooth(b.swim-1.8,b.swim,u)),pace:1};
    }
    if(u<b.swim+b.coast)return{effort:0,pace:.06+.94*(1-smooth(0,b.coast,u-b.swim))};
    if(u<b.swim+b.coast+b.rest)return{effort:0,pace:.06};
    const wake=smooth(0,b.wake,u-b.swim-b.coast-b.rest);
    return{effort:wake,pace:.06+.94*wake};
  };
}
