import {waterToWorld} from './water-space.js';

export const RAIN_STYLE=Object.freeze({defaultIntensity:.68,candidatesPerSecond:10,fallTime:.42,fallHeight:130,duration:2.2,echoDelay:.18,echoStrength:.34,maxRings:56});
const hash=n=>{let x=Math.imul(n|0,374761393);x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967296;};
const smooth=(a,b,x)=>{const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);};

// Fixed rain events, sampled only in a short window around absolute time.
// Negative birth times make the opening picture a pond already in light rain.
// No growing particle history, frame-based RNG or swimming-state look-ahead.
export function createRain(seed=4317,intensity=RAIN_STYLE.defaultIntensity){
  let rainSeed=seed,strength=intensity;
  function sample(time){
    if(strength<=0)return[];
    const rings=[],rate=RAIN_STYLE.candidatesPerSecond;
    const first=Math.floor((time-RAIN_STYLE.duration-RAIN_STYLE.echoDelay)*rate)-1,last=Math.ceil((time+RAIN_STYLE.fallTime)*rate);
    for(let index=last;index>=first;index--){
      const key=rainSeed+index*97;if(hash(key+1)>=strength)continue;
      const born=(index+.16+.68*hash(key+11))/rate,age=time-born;
      const center=waterToWorld([(hash(key+23)-.5)*1840,(hash(key+31)-.5)*1160]).slice(0,2);
      const weight=.65+.35*hash(key+41),size=.78+.44*hash(key+47),speed=42+22*hash(key+53);
      if(age<0&&age>=-RAIN_STYLE.fallTime){
        const progress=1+age/RAIN_STYLE.fallTime;
        rings.push({source:'rain',born,center,age,drop:true,radius:0,strength:weight*Math.sin(Math.PI*progress),height:RAIN_STYLE.fallHeight*(1-progress*progress),length:22+18*progress,width:1.05*size});
      }
      for(let echo=0;echo<2;echo++){
        const elapsed=age-echo*RAIN_STYLE.echoDelay;
        if(elapsed<0||elapsed>=RAIN_STYLE.duration)continue;
        const fade=smooth(0,.055,elapsed)*(1-smooth(.85,RAIN_STYLE.duration,elapsed))*Math.exp(-elapsed*.4);
        rings.push({source:'rain',born,center,age:elapsed,echo,radius:4*size+elapsed*speed,strength:weight*fade*(echo?RAIN_STYLE.echoStrength:1),width:(2.35+elapsed*.38)*size});
      }
    }
    return rings.slice(0,RAIN_STYLE.maxRings);
  }
  return{sample,setSeed(value){rainSeed=value;},setIntensity(value){strength=Math.max(0,Math.min(1,Number(value)||0));},
    describe(time){const marks=sample(time);return{intensity:strength,dropsPerSecond:strength*RAIN_STYLE.candidatesPerSecond,activeRings:marks.filter(r=>!r.drop).length,fallingDrops:marks.filter(r=>r.drop).length,plane:'world XY',seed:rainSeed,...RAIN_STYLE};}};
}
