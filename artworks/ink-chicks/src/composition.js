// Coordinates are in the reference's 286 × 570 paper space.
// The masks partition painted elements; a shared boundary is pinned during motion.
export const WIDTH=286,HEIGHT=570,DURATION=12;
export const elements=[
 {id:'inscription',name:'Inscription & upper seal',kind:'printed',bounds:[0,0,43,320]},
 {id:'lower-seal',name:'Lower seal',kind:'printed',bounds:[253,537,33,33]},
 {id:'upper-black',name:'01 · Bowed black chick',kind:'black',bounds:[146,61,101,102],head:[169,91],body:[196,119],foot:150,phase:0,peck:1.0,amount:1.5},
 {id:'edge-black',name:'02 · Chick at the edge',kind:'black',bounds:[222,201,64,81],head:[239,222],body:[262,244],foot:271,phase:1.6,peck:6.4,amount:.8},
 {id:'middle-black',name:'03 · Foraging black chick',kind:'black',bounds:[92,262,75,78],head:[110,300],body:[139,291],foot:334,phase:2.8,peck:3.2,amount:1.4,
  polygon:[[92,262],[167,262],[167,300],[156,304],[150,310],[142,312],[130,319],[126,326],[125,340],[92,340]]},
 {id:'middle-yellow',name:'04 · First yellow chick',kind:'yellow',bounds:[123,298,78,78],head:[140,327],body:[169,335],foot:365,phase:.9,peck:4.5,amount:1.1,
  polygon:[[167,298],[201,298],[201,376],[123,376],[123,340],[125,340],[126,326],[130,319],[142,312],[150,310],[156,304],[167,300]]},
 {id:'right-black',name:'05 · Watchful black chick',kind:'black',bounds:[202,326,81,85],head:[222,344],body:[246,372],foot:400,phase:4,peck:8.7,amount:.8,
  polygon:[[202,326],[283,326],[283,411],[238,411],[238,390],[230,385],[219,383],[211,383],[207,379],[202,377]]},
 {id:'lower-yellow',name:'06 · Second yellow chick',kind:'yellow',bounds:[168,376,71,74],head:[184,398],body:[209,410],foot:439,phase:2,peck:7.5,amount:1,
  polygon:[[168,376],[202,376],[202,377],[207,379],[211,383],[219,383],[230,385],[238,390],[238,411],[239,450],[168,450]]},
 {id:'left-black',name:'07 · Looking upward',kind:'black',bounds:[17,410,78,110],head:[73,427],body:[52,464],foot:506,phase:3.3,peck:9.5,amount:-.9},
 {id:'bottom-black',name:'08 · Resting black chick',kind:'black',bounds:[174,451,79,77],head:[190,470],body:[219,491],foot:517,phase:5.3,peck:10.2,amount:.7},
];
// The second painted study has slightly different source extents. Its masks
// include the full pigment rather than forcing it into the first atlas's boxes.
export const borrowedElements=elements.map(e=>{
 const updates={
  'upper-black':{bounds:[157,64,103,102],head:[177,95],body:[206,119],foot:157},
  'edge-black':{bounds:[222,202,64,81]},
  'middle-yellow':{bounds:[123,298,83,80],polygon:[[167,298],[206,298],[206,378],[123,378],[123,340],[125,340],[126,326],[130,319],[142,312],[150,310],[156,304],[167,300]]},
  'right-black':{bounds:[202,326,84,87],polygon:[[202,326],[286,326],[286,413],[238,413],[238,390],[230,385],[219,383],[211,383],[207,379],[202,377]]},
  'lower-yellow':{bounds:[168,376,72,77],polygon:[[168,376],[202,376],[202,377],[207,379],[211,383],[219,383],[230,385],[238,390],[238,413],[240,453],[168,453]],head:[185,404],foot:445},
  'left-black':{bounds:[17,411,78,110]},
  'bottom-black':{bounds:[177,452,82,78],head:[193,470],body:[224,493],foot:522},
 };
 return {...e,...updates[e.id]};
});
export const familyElements=[
 ...borrowedElements.filter(e=>e.kind==='printed'),
 {id:'mother-hen',name:'Mother hen',kind:'hen',asset:'hen',
  sourceFrame:[40,57,1075,1313],bounds:[95,12,182,222.3],
  head:[112,191],body:[204,169],headRadius:26,bodyRadius:60,
  foot:207,phase:.4,peck:6.3,amount:1.8,blend:'multiply'},
 ...borrowedElements.filter(e=>e.kind!=='printed').map(e=>({...e,
  ...(e.id==='upper-black'?{layout:{x:44,y:207,scale:.72}}:{}),
  ...(e.id==='edge-black'?{layout:{x:e.bounds[0],y:e.bounds[1]+36,scale:1}}:{}),
 })),
];
export function outline(e){return e.polygon??[[e.bounds[0],e.bounds[1]],[e.bounds[0]+e.bounds[2],e.bounds[1]],[e.bounds[0]+e.bounds[2],e.bounds[1]+e.bounds[3]],[e.bounds[0],e.bounds[1]+e.bounds[3]]];}
function edgeDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-u*dx,y-a[1]-u*dy);}
export function influence(e,x,y){
 if(e.kind==='printed')return{head:0,body:0};
 const contact=Math.max(0,Math.min(1,(e.foot-y)/19));
 const edge=e.polygon?Math.min(1,Math.min(...e.polygon.map((a,i)=>edgeDistance(x,y,a,e.polygon[(i+1)%e.polygon.length])))/5):1;
 const h=Math.exp(-((x-e.head[0])**2+(y-e.head[1])**2)/(2*(e.headRadius??17)**2));
 const b=Math.exp(-((x-e.body[0])**2+(y-e.body[1])**2)/(2*(e.bodyRadius??24)**2));
 return{head:contact*edge*h,body:contact*edge*b};
}
export function motionAt(e,time){
 const t=((time%DURATION)+DURATION)%DURATION,angle=t/DURATION*Math.PI*2;
 const u=(t-e.peck)/1.7,peck=u>0&&u<1?Math.sin(u*Math.PI)**2:0;
 const breath=(Math.sin(angle*2+e.phase)-Math.sin(e.phase))*.32;
 const glance=(Math.sin(angle+e.phase)-Math.sin(e.phase))*.25;
 return{dx:(-peck*.7+glance)*e.amount,dy:peck*2.2*e.amount,breath};
}
export function deform(e,x,y,time,strength=1){
 if(e.kind==='printed'||strength===0)return[x,y];
 const w=influence(e,x,y),m=motionAt(e,time);
 return[x+strength*w.head*m.dx,y+strength*(w.head*m.dy-w.body*m.breath)];
}
