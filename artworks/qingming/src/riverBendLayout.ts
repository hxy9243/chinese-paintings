import {shoreDepth,roofFootprint,type BankSide,type HallLayout} from "./passageLayout";
import type {BuildingKind} from "./passageLife";
import type {BoatStyle,BoatVariant,TreeForm} from "./referenceAssets";

// Authored groups in public/reference/chicago-river-bend.png. Roof backs and
// obscured interiors are inferred; the visible landing/boat groups anchor them.
function building(id:string,side:BankSide,s:number,width:number,depth:number,height:number,kind:BuildingKind,setback=2.5,angle=0){
  const h={id,side,s,d:shoreDepth(side,s),width,depth,height,angle,kind};
  const sign=side==="near"?1:-1;
  h.d+=sign*(Math.max(...roofFootprint(h).map(p=>sign*(shoreDepth(side,p.s)-p.d)))+setback);
  return h satisfies HallLayout & {id:string;kind:BuildingKind};
}
// Foreground roofs form staggered compounds. Their rear/side wings share a
// courtyard axis instead of repeating a second widely separated waterfront row.
export const BEND_BUILDINGS=[
  building("bend-front-courtyard","near",-27,4.8,3.4,1.2,"courtyard",2.6),
  building("landing-open-warehouse","near",-33.1,4.4,2.5,1.18,"openhall",2.1),
  building("quayside-tiled-house","near",-40,4.1,3.4,1.2,"dwelling",2.8),
  building("corner-courtyard","near",-46,4.8,3.8,1.25,"courtyard",2.6),
  building("upstream-teahouse","near",-53,3.7,2.7,1.18,"shop",2.2),
  building("upstream-storeroom","near",-58.2,3.5,2.8,1.15,"warehouse",2.1,.14),
  building("foreground-compound","near",-27.8,5.2,3.9,1.25,"compound",6.7),
  building("foreground-side-wing","near",-33.1,4.1,2.2,1.2,"gallery",5.8,Math.PI/2),
  building("courtyard-rear-wing","near",-42.8,5.2,3.1,1.3,"dwelling",8.8),
  building("left-tiled-hall","near",-47.3,4.6,3.1,1.25,"dwelling",8.3,-.12),
  building("far-waterfront-gallery","far",-27,4.1,2.2,1.12,"gallery",1.6),
  building("far-boat-store","far",-32,4.5,2.5,1.18,"warehouse",1.7),
  building("far-canopied-shops","far",-37.1,3.8,2.1,1.12,"shop",1.8),
  building("far-bend-house","far",-44,4.1,2.8,1.2,"dwelling",2.4,.12),
  building("far-upstream-shed","far",-49.4,3.2,1.8,1.12,"shed",1.7),
];
// The corner rear hall belongs to this compound, not to a separate shore row.
BEND_BUILDINGS.find(h=>h.id==="left-tiled-hall")!.d=BEND_BUILDINGS.find(h=>h.id==="corner-courtyard")!.d+4.6;
export const BEND_BOATS: {id:string;s:number;d:number;angle:number;length:number;width:number;style:BoatStyle;variant:BoatVariant;crew:number;side:number}[]=[
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
  const variants:BoatVariant[]=["low-service","open-hold","short-reed","standard","open-hold","standard","low-service","standard","standard"];
  return {id:`bend-boat-${i}`,s,d,angle,length,width,style,variant:variants[i],crew:Math.min(crew,i===1?3:2),side};
});
// Cargo is stowed away from working feet, not copied onto cabin or crew space.
export function bendCargoPositions(b:typeof BEND_BOATS[number]){
  return Array.from({length:3},(_,j)=>({
    x:(j%2-.5)*b.width*.38,
    y:b.variant==="open-hold"?.26:.45,
    z:b.variant==="open-hold"||b.style==="skiff"?(j-1)*.25:
      b.variant==="low-service"||b.variant==="short-reed"?b.length*.12+j*.13:-b.length*.32+(j===2?.16:0),
  }));
}
export const BEND_INTERACTIONS=([0,1] as const).map((boatIndex,i)=>{
  const boat=BEND_BOATS[boatIndex],u=(i===0?1:-1)*boat.length*.32,v=boat.width*.43;
  const deck={s:boat.s+u*Math.cos(boat.angle)-v*Math.sin(boat.angle),d:boat.d+u*Math.sin(boat.angle)+v*Math.cos(boat.angle)};
  return {id:i===0?"boarding":"loading",boatId:boat.id,deck,bank:{s:deck.s,d:shoreDepth("near",deck.s)+.2}};
});
export const BEND_LANDINGS=[BEND_INTERACTIONS[0].bank.s,BEND_INTERACTIONS[1].bank.s,-40.5,-47.5,-55].map((s,i)=>({id:`bend-landing-${i}`,s,d:shoreDepth("near",s),width:1.1+i%2*.35}));
function outsideRoofs(p:{s:number;d:number},margin=.35){
  return !BEND_BUILDINGS.some(h=>{
    const ds=p.s-h.s,dd=p.d-h.d,x=ds*Math.cos(h.angle)+dd*Math.sin(h.angle),z=-ds*Math.sin(h.angle)+dd*Math.cos(h.angle);
    return Math.abs(x)<h.width/2+margin&&Math.abs(z)<h.depth/2+margin;
  });
}
// A few branching accents frame roof groups; deliberate gaps expose the bend,
// mooring lines and two gangplanks. Full needle crowns elsewhere are untouched.
export const BEND_TREES:{s:number;d:number;size:number;form:TreeForm;seed:number}[]=[
  [-25.3,"near",1.8,1.05,"pollard"],[-35.9,"near",5.2,1.38,"spreading"],
  [-42.6,"near",1.7,1.15,"spreading"],[-48.9,"near",2.6,1.05,"pollard"],
  [-56.1,"near",2.1,1.35,"spreading"],[-59.9,"near",1.5,.8,"sapling"],
  [-29.8,"far",2.2,.9,"pollard"],[-41.1,"far",2.4,1.1,"spreading"],[-52.2,"far",1.8,.8,"sapling"],
].map((entry,i)=>{const [s,side,offset,size,form]=entry as [number,BankSide,number,number,TreeForm];return {s,d:shoreDepth(side,s)+(side==="near"?1:-1)*offset,size,form,seed:1000+i};}).filter(t=>outsideRoofs(t,.6));
// Small purposeful groups, with long quiet intervals. No arithmetic procession.
const peopleGroups:[number,BankSide,number,number,number][]=[
  [-26.1,"near",1.5,0,1.1],[-26.5,"near",1.9,5,-1.8],
  [-31,"near",1.6,13,-1.4],[-31.5,"near",1.4,3,.7],
  [-38.1,"near",1.3,11,1.2],[-38.6,"near",1.7,6,-1.5],[-38.9,"near",1.1,8,1.2],
  [-43.9,"near",1.25,4,-1],[-44.4,"near",1.65,15,-1],
  [-47.5,"near",1.5,9,.8],[-48,"near",1.2,3,-1.6],
  [-51.1,"near",1.2,1,1.2],[-51.7,"near",1.55,13,1.2],
  [-55,"near",1.25,5,-1.8],[-55.4,"near",1.65,0,1.3],[-58.7,"near",1.1,7,1.4],
  [-25.8,"far",1.1,4,-1.3],[-26.4,"far",1.2,15,-1.3],
  [-30.1,"far",1.0,0,1.2],[-30.5,"far",1.4,3,-1.5],
  [-35,"far",1.2,1,1.4],[-35.6,"far",1.4,13,1.4],
  [-39.3,"far",1.25,6,-.8],[-39.7,"far",1.5,8,-.8],
  [-46.8,"far",1.2,9,1.8],[-47.3,"far",1.35,3,-1.1],[-52.7,"far",1.1,4,1.2],
];
export const BEND_PEOPLE=peopleGroups.map(([s,side,offset,variant,angle],i)=>({id:`bend-person-${i}`,s,d:shoreDepth(side,s)+(side==="near"?1:-1)*offset,variant,angle}))
  .filter(p=>outsideRoofs(p)&&!BEND_TREES.some(t=>Math.hypot(p.s-t.s,p.d-t.d)<.65)&&!BEND_INTERACTIONS.some(a=>Math.hypot(p.s-a.bank.s,p.d-a.bank.d)<1.1));
export const BEND_ZONES=[[-64,-54],[-54,-44],[-44,-34],[-34,-22]] as const;
