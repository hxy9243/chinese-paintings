import * as THREE from 'three';
import {referenceGroundDepth,referenceToWorld} from './mountain-shapes.js';

// Hand-read water contacts and grove roots in the unchanged 1779 x 801 photo.
// These are editable ground plans, not textures or camera-facing image cards.
export const shoreTraces=[
 {name:'Left mountain promontory',points:[[-240,425],[358,431],[410,465],[445,501],[462,535],[494,555],[554,570],[608,593],[642,629],[707,652],[735,678],[776,687],[828,695],[845,704],[815,726],[776,737],[745,745],[802,761],[861,780],[807,788],[746,779],[674,787],[614,771],[556,778],[479,752],[387,751],[298,767],[215,758],[136,745],[44,741],[-240,752]]},
 {name:'Right overlapping terraces',points:[[1910,394],[1493,405],[1392,437],[1306,455],[1226,473],[1130,475],[1033,476],[980,491],[895,511],[933,520],[1046,524],[1108,532],[1090,543],[1040,549],[1084,565],[1175,575],[1257,579],[1283,594],[1260,608],[1228,618],[1221,635],[1167,651],[1185,673],[1230,687],[1194,702],[1107,715],[1147,724],[1232,731],[1314,736],[1361,748],[1420,744],[1460,755],[1524,738],[1579,733],[1630,753],[1704,773],[1820,769],[1910,720]]},
 {name:'Far jade shoal',points:[[472,414],[541,402],[652,398],[759,402],[850,414],[822,423],[713,429],[603,426],[523,428]]},
 {name:'Middle jade shoal',points:[[505,392],[605,382],[715,381],[808,389],[841,394],[760,401],[642,397],[547,399]]},
 {name:'Remote narrow shoal',points:[[398,363],[506,351],[591,350],[645,343],[672,350],[787,354],[839,362],[763,372],[651,369],[541,375],[453,370]]},
];
export function referenceGround(point,height=0){const z=referenceGroundDepth(point[1],height),p=referenceToWorld(point,z);return new THREE.Vector2(p.x,z);}
// Smooth each authored curve in the painting plane before converting to a
// physical water-plane footprint. This preserves the characteristic hook ends.
export const shoreRegions=shoreTraces.map(region=>{
 const curve=new THREE.CatmullRomCurve3(region.points.map(([x,y])=>new THREE.Vector3(x,y,0)),true,'centripetal');
 const points=curve.getPoints(region.points.length*3).slice(0,-1).map(p=>referenceGround([p.x,p.y]));
 return{...region,points,bounds:[Math.min(...points.map(p=>p.x)),Math.max(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.y))]};
});
function polygonDistance(x,z,region){
 const b=region.bounds;if(x<b[0]-32||x>b[1]+32||z<b[2]-32||z>b[3]+32)return -32;
 let d=1024,inside=false;const ps=region.points;
 for(let i=0,j=ps.length-1;i<ps.length;j=i++){
  const a=ps[j],b=ps[i],dx=b.x-a.x,dz=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz)));
  d=Math.min(d,(x-a.x-dx*t)**2+(z-a.y-dz*t)**2);
  if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return Math.sqrt(d)*(inside?1:-1);
}
export function shoreDistanceExact(x,z){let d=-32;for(const region of shoreRegions)d=Math.max(d,polygonDistance(x,z,region));return Math.min(32,d);}
// A shared distance atlas keeps terrain, shallow washes and wet edges on the
// same curving coast, with one texture lookup rather than hundreds of edges
// per water fragment. It stores distances only; no source pixels are sampled.
const bounds={x:-550,z:-1050,width:1200,depth:1390},size=1024,data=new Uint8Array(size*size);
for(let j=0;j<size;j++)for(let i=0;i<size;i++)data[j*size+i]=Math.round((shoreDistanceExact(bounds.x+(i+.5)/size*bounds.width,bounds.z+(j+.5)/size*bounds.depth)+32)/64*255);
export const shoreDistanceMap=new THREE.DataTexture(data,size,size,THREE.RedFormat,THREE.UnsignedByteType);
shoreDistanceMap.minFilter=shoreDistanceMap.magFilter=THREE.LinearFilter;shoreDistanceMap.needsUpdate=true;
export const shoreDistanceGLSL=`uniform sampler2D shoreDistanceMap;
float landDistance(vec2 p){vec2 uv=(p-vec2(${bounds.x}.,${bounds.z}.))/vec2(${bounds.width}.,${bounds.depth}.);if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return -32.;return texture2D(shoreDistanceMap,uv).r*64.-32.;}`;

// Rows are intentionally short and discontinuous, with varied heights and
// small gaps. Pixel heights describe visual scale; roots meet actual 3D land.
export const groveTraces=[
 {name:'Left village upper row',height:23,spacing:8,points:[[170,483],[208,483],[237,470]]},
 {name:'Left inner slope row',height:31,spacing:9,points:[[326,623],[355,630],[385,621]]},
 {name:'Left green foot row',height:32,spacing:9,points:[[204,642],[230,644],[259,629]]},
 {name:'Left lower terrace row',height:25,spacing:9,points:[[348,666],[375,650],[402,637]]},
 {name:'Left village landing row',height:40,spacing:10,points:[[689,700],[714,709],[741,711]]},
 {name:'Bridge western grove',height:43,spacing:9,points:[[752,691],[782,696],[810,694],[833,687]]},
 {name:'Bridge eastern grove',height:43,spacing:10,points:[[1192,670],[1216,676],[1245,675],[1274,677]]},
 {name:'Eastern landing pair',height:37,spacing:11,points:[[1278,701],[1299,701]]},
 {name:'Right lower curved terrace',height:39,spacing:9,points:[[1321,647],[1357,646],[1385,635],[1410,620]]},
 {name:'Right crag approach row',height:37,spacing:10,points:[[1467,631],[1493,626],[1518,615]]},
 {name:'Middle shore short row',height:19,spacing:6,points:[[1074,543],[1103,549],[1135,551],[1175,546]]},
 {name:'Middle meadow row',height:23,spacing:7,points:[[1242,568],[1280,571],[1318,565],[1347,566]]},
 {name:'Right meadow upper row',height:28,spacing:8,points:[[1367,539],[1404,543],[1445,545],[1480,539]]},
 {name:'Distant settlement grove',height:18,spacing:6,points:[[1246,518],[1291,520],[1335,515]]},
 {name:'Right mountain foot grove',height:26,spacing:8,points:[[1475,517],[1504,531],[1534,536]]},
 {name:'Outer crag foot row',height:31,spacing:9,points:[[1637,654],[1668,649],[1705,647]]},
 {name:'Outer village row',height:28,spacing:9,points:[[1731,592],[1763,599],[1792,598]]},
 {name:'Far shoal thin row',height:6,spacing:5,points:[[600,410],[647,414],[695,415],[746,411]]},
 {name:'Middle shoal thin row',height:6,spacing:6,points:[[651,386],[700,387],[751,384],[791,383]]},
];

// Separate unequal contours, traced from the source. No periodic horizon.
export const distantRidgeTraces=[
 {name:'Low left horizon',z:-1120,front:85,back:65,trace:[[356,326],[410,318],[462,310],[492,312],[530,303],[568,301],[600,305],[632,319],[674,322],[714,329],[755,327],[791,316],[826,311],[849,291],[873,287],[896,295],[916,299],[943,292],[973,287],[1006,290]]},
 {name:'Right receding ridge',z:-1040,front:95,back:65,trace:[[1068,338],[1120,327],[1168,325],[1202,314],[1239,311],[1269,305],[1306,304],[1343,298],[1378,300],[1414,291],[1452,288],[1486,277],[1522,272],[1558,276]]},
 {name:'Broken middle shore ridge',z:-630,front:62,back:48,trace:[[880,367],[936,360],[993,355],[1033,360],[1078,351],[1114,353],[1140,349],[1160,358],[1191,353],[1227,330],[1257,320],[1287,325],[1311,320],[1342,329],[1369,337],[1397,348]]},
];
