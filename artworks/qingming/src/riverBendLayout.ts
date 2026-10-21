import {shoreDepth,type BankSide,type HallLayout} from "./passageLayout";
import type {BuildingKind} from "./passageLife";
import type {BoatStyle,TreeForm} from "./referenceAssets";

// Authored groups in public/reference/chicago-river-bend.png. Roof backs and
// obscured interiors are inferred; the visible landing/boat groups anchor them.
function building(id:string,side:BankSide,s:number,width:number,depth:number,height:number,kind:BuildingKind,setback=3.1){
  const samples=Array.from({length:21},(_,i)=>shoreDepth(side,s-width/2-.25+i*(width+.5)/20));
  const d=side==="near"?Math.max(...samples)+depth/2+setback:Math.min(...samples)-depth/2-setback;
  return {id,side,s,d,width,depth,height,angle:0,kind} satisfies HallLayout & {id:string;kind:BuildingKind};
}
export const BEND_BUILDINGS=[
  building("bend-front-courtyard","near",-27,4.8,3.4,1.2,"courtyard",4),
  building("landing-open-warehouse","near",-33,4.4,2.5,1.18,"openhall",2.7),
  building("quayside-tiled-house","near",-39,4.1,3.4,1.2,"dwelling",3.6),
  building("corner-courtyard","near",-46,4.8,3.8,1.25,"courtyard",4.3),
  building("upstream-teahouse","near",-53,3.7,2.7,1.18,"shop",3),
  building("upstream-storeroom","near",-59,3.5,2.8,1.15,"warehouse",3.2),
  building("foreground-compound","near",-30,5.2,3.9,1.25,"compound",10),
  building("foreground-side-wing","near",-37,4.3,3.1,1.2,"gallery",10.5),
  building("courtyard-rear-wing","near",-44,5.2,3.6,1.3,"dwelling",12),
  building("left-tiled-hall","near",-52,4.6,3.8,1.25,"dwelling",10),
  building("far-waterfront-gallery","far",-27,4.1,2.2,1.12,"gallery",2.3),
  building("far-boat-store","far",-33,4.5,2.5,1.18,"warehouse",3.2),
  building("far-canopied-shops","far",-39,3.8,2.1,1.12,"shop",2.5),
  building("far-bend-house","far",-46,4.1,2.8,1.2,"dwelling",2.7),
  building("far-upstream-shed","far",-53,3.2,1.8,1.12,"shed",1.8),
];
export const BEND_LANDINGS=[-28.5,-34.5,-40.5,-47.5,-55].map((s,i)=>({id:`bend-landing-${i}`,s,d:shoreDepth("near",s),width:1.1+i%2*.35}));
export const BEND_BOATS: {id:string;s:number;d:number;angle:number;length:number;width:number;style:BoatStyle;crew:number;side:number}[]=[
  [-29,1,4.8,1.05,"cabin",5],[-34.5,1,4.5,.98,"freight",6],
  [-40,1,4.8,1.02,"cabin",5],[-46,1,4.6,1.05,"canopy",3],[-53,1,4.5,1,"freight",5],
  [-31,-1,5.4,1.1,"cabin",5],[-37,-1,5.6,1.1,"cabin",5],[-60,1,3.5,.8,"skiff",2],[-47,-1,3.4,.75,"skiff",2],
].map((entry,i)=>{
  const [s,side,length,width,style,crew]=entry as [number,number,number,number,BoatStyle,number];
  const shore=side===-1?"far":"near",sign=side===-1?1:-1;
  let d=side===0?(shoreDepth("near",s)+shoreDepth("far",s))/2:
    shoreDepth(shore,s)+sign*(1.05+width*.7);
  const slope=(shoreDepth(shore,s+.3)-shoreDepth(shore,s-.3))/.6;
  const angle=Math.atan(slope);
  if(side!==0){
    d=side===1?Infinity:-Infinity;
    for(let j=0;j<=24;j++)for(const edge of [-1,1]){
      const u=(j/24-.5)*length*1.24,v=edge*(width*.7+.04),ds=u*Math.cos(angle)-v*Math.sin(angle),dd=u*Math.sin(angle)+v*Math.cos(angle);
      if(side===1)d=Math.min(d,shoreDepth("near",s+ds)-dd-.14);
      else d=Math.max(d,shoreDepth("far",s+ds)-dd+.14);
    }
  }
  return {id:`bend-boat-${i}`,s,d,angle,length,width,style,crew,side};
});
export const BEND_TREES:{s:number;d:number;size:number;form:TreeForm;seed:number}[]=[];
for(let i=0;i<18;i++){
  const s=-25-i*2,side:BankSide=i%3===0?"far":"near",sign=side==="near"?1:-1,
    d=shoreDepth(side,s)+sign*(i%4===0?8:2.2);
  if(!BEND_BUILDINGS.some(h=>Math.abs(s-h.s)<h.width/2+.55&&Math.abs(d-h.d)<h.depth/2+.55))
    BEND_TREES.push({s,d,size:i%4===0?1.55:.95+(i%3)*.12,form:i%4===0?"spreading":"pollard",seed:1000+i});
}
export const BEND_PEOPLE=Array.from({length:68},(_,i)=>{
  const side:BankSide=i%3===0?"far":"near",sign=side==="near"?1:-1,
    s=-24.5+(i%2)*.25-(i%34)*1.04,d=shoreDepth(side,s)+sign*(.65+(i%3)*.42);
  return {id:`bend-person-${i}`,s,d,variant:[1,3,4,6,7,9,11,12,13,15,2,8][i%12],angle:i%2?1.2:-1.7};
}).filter(p=>!BEND_TREES.some(t=>Math.hypot(p.s-t.s,p.d-t.d)<.5));
export const BEND_ZONES=[[-64,-54],[-54,-44],[-44,-34],[-34,-22]] as const;
