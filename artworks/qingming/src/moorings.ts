import { shoreDepth, SHORELINES, type BankSide } from "./passageLayout";

// Traced long freighters below the far shops and shorter working boats at the bend.
export const MOORED_BOATS = [
  {s:-8.48,d:-6.30,length:8.09,width:1.25,cabin:true,angle:.054,side:"far" as BankSide},
  {s:1,d:-6.50,length:8.23,width:1.25,cabin:true,angle:-.079,side:"far" as BankSide},
  {s:29.1,d:-6.6,length:10.6,width:1.35,cabin:true,angle:-.083,side:"far" as BankSide},
  {s:-21.84,d:-9.87,length:2.49,width:1.05,cabin:true,angle:.087,side:"near" as BankSide},
  {s:-23.52,d:-6.95,length:3.46,width:1.25,cabin:true,angle:-.253,side:"near" as BankSide},
  {s:-23.27,d:-4.46,length:4.61,width:1.45,cabin:true,angle:.336,side:"near" as BankSide},
  {s:-23.27,d:-2.44,length:4.48,width:1.10,cabin:false,angle:.244,side:"near" as BankSide},
  {s:-21.71,d:-.32,length:7.32,width:1.65,cabin:true,angle:.178,side:"near" as BankSide},
];
export function mooredBoatPose(index:number,time:number){
  const boat=MOORED_BOATS[index],phase=time*.65+index*1.71;
  return {...boat,y:Math.sin(phase)*.008,roll:Math.sin(phase+.8)*.003,pitch:Math.cos(phase*.8)*.002};
}
// The bend's steep segments cannot be found by a short along-scroll search.
const shorelineSamples=Object.fromEntries((["near","far"] as BankSide[]).map(side=>{
  const points=SHORELINES[side],samples:{s:number;d:number}[]=[];
  for(let j=1;j<points.length;j++){
    const a=points[j-1],b=points[j],steps=Math.max(8,Math.ceil(Math.hypot(b.s-a.s,b.d-a.d)/.06));
    for(let k=0;k<steps;k++){const s=a.s+(b.s-a.s)*k/steps;samples.push({s,d:shoreDepth(side,s)});}
  }
  samples.push({...points.at(-1)!});return [side,samples];
})) as Record<BankSide,{s:number;d:number}[]>;
const anchorCache=new Map<string,{s:number;d:number}>();
function ropeCrossesNeighbor(index:number,a:{s:number;d:number},b:{s:number;d:number}){
  for(let j=0;j<MOORED_BOATS.length;j++){
    if(j===index)continue;
    const vessel=MOORED_BOATS[j];
    for(let step=1;step<32;step++){
      const t=step/32,ds=a.s+(b.s-a.s)*t-vessel.s,dd=a.d+(b.d-a.d)*t-vessel.d;
      const z=ds*Math.cos(vessel.angle)+dd*Math.sin(vessel.angle),x=ds*Math.sin(vessel.angle)-dd*Math.cos(vessel.angle),u=Math.abs(z)/(vessel.length*.555);
      if(u>=1)continue;
      const halfWidth=vessel.width*(.055+.475*Math.pow(1-u*u,.48));
      if(Math.abs(x)<halfWidth+.025)return true;
    }
  }
  return false;
}
export function mooringAnchor(index:number,side:number){
  const key=index+":"+side;if(anchorCache.has(key))return anchorCache.get(key)!;
  const b=MOORED_BOATS[index],u=side*b.length*.31,x=(b.side==="far"?1:-1)*b.width*.5;
  const start={s:b.s+u*Math.cos(b.angle)+x*Math.sin(b.angle),d:b.d+u*Math.sin(b.angle)-x*Math.cos(b.angle)};
  let nearest={s:0,d:0},minimum=Infinity;
  const bank=shorelineSamples[b.side];
  for(let i=1;i<bank.length;i++){
    const a=bank[i-1],c=bank[i],ds=c.s-a.s,dd=c.d-a.d;
    const t=Math.max(0,Math.min(1,((start.s-a.s)*ds+(start.d-a.d)*dd)/(ds*ds+dd*dd||1)));
    const s=a.s+ds*t,d=shoreDepth(b.side,s)+(b.side==="far"?-.24:.24);
    const span=Math.hypot(s-start.s,d-start.d);
    if(span>=minimum)continue;
    const score=span+(ropeCrossesNeighbor(index,start,{s,d})?40:0);
    if(score<minimum){minimum=score;nearest={s,d};}
  }
  anchorCache.set(key,nearest);return nearest;
}
