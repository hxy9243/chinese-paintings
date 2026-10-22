import { shoreDepth, type BankSide } from "./passageLayout";

// Horizontal cargo boats below the far-bank shops and a staggered cluster
// around the west bend, matching the two sets of landing contacts in the plan.
export const MOORED_BOATS = [
  {s:-4.3,length:4.2,width:.86,cabin:true,side:"far" as BankSide},
  {s:2.2,length:4.2,width:.84,cabin:true,side:"far" as BankSide},
  {s:17.1,length:5.3,width:.85,cabin:true,side:"far" as BankSide},
  {s:-13.9,length:4.3,width:.85,cabin:true,side:"near" as BankSide},
  {s:-16.8,length:3.1,width:.72,cabin:false,side:"near" as BankSide},
  {s:-17.6,length:2.5,width:.68,cabin:false,side:"near" as BankSide},
].map(boat=>{
  const sign=boat.side==="far"?1:-1;
  const angle=boat.side==="near" ? (boat.s< -16?Math.PI/2:.48) : boat.s>12?.08:.04;
  let clearance=-Infinity;
  for(let i=0;i<=32;i++)for(const side of [-1,1]){
    const u=(i/32-.5)*boat.length*1.24,v=side*(boat.width*.7+.04);
    const s=boat.s+u*Math.cos(angle)-v*Math.sin(angle);
    clearance=Math.max(clearance,sign*(shoreDepth(boat.side,s)-u*Math.sin(angle)-v*Math.cos(angle))+(boat.s< -17?.6:.2));
  }
  return {...boat,d:sign*clearance,angle};
});
export function mooredBoatPose(index:number,time:number){
  const boat=MOORED_BOATS[index],phase=time*.65+index*1.71;
  return {...boat,y:Math.sin(phase)*.008,roll:Math.sin(phase+.8)*.003,pitch:Math.cos(phase*.8)*.002};
}
export function mooringAnchor(index:number,side:number){
  const b=MOORED_BOATS[index],u=side*b.length*.31;
  const point={s:b.s+u*Math.cos(b.angle),d:b.d+u*Math.sin(b.angle)};
  let nearest={s:0,d:0},minimum=Infinity;
  for(let i=0;i<=400;i++){
    const s=b.s-b.length+i*b.length/200,d=shoreDepth(b.side,s);
    const distance=Math.hypot(s-point.s,d-point.d);
    if(distance<minimum){minimum=distance;nearest={s,d:d+(b.side==="far"?-.24:.24)};}
  }
  return nearest;
}
