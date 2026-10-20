// Broad, low, rounded landforms bridge the empty aprons between the traced
// mountains and the shore. Their vegetation uses its own seed, leaving the
// original tree families and mountain brush patterns reproducible.
export const foothills=[
 {name:'Left village foothill',x:-69,z:21,height:5.1,rx:25,rz:27,angle:-.45},
 {name:'Left inner apron',x:-60,z:67,height:4.3,rx:27,rz:32,angle:.25},
 {name:'Left woodland shoulder',x:-112,z:71,height:7.4,rx:42,rz:30,angle:-.3},
 {name:'Left outer low ridge',x:-172,z:44,height:8.5,rx:48,rz:36,angle:.35},
 {name:'Left foreground roll',x:-89,z:124,height:6.5,rx:39,rz:41,angle:.5},
 {name:'Left near bank roll',x:-59,z:187,height:4.5,rx:28,rz:45,angle:-.1},
 {name:'Left continuing woods',x:-140,z:214,height:8.8,rx:58,rz:68,angle:.2},
 {name:'Right village apron',x:91,z:33,height:4.2,rx:28,rz:28,angle:-.3},
 {name:'Right inner shoulder',x:81,z:85,height:5.5,rx:25,rz:35,angle:-.45},
 {name:'Right woodland ridge',x:145,z:77,height:8.4,rx:44,rz:38,angle:.2},
 {name:'Right foreground roll',x:108,z:141,height:6.5,rx:33,rz:42,angle:-.3},
 {name:'Right near bank roll',x:85,z:212,height:5.0,rx:28,rz:52,angle:.1},
 {name:'Right continuing woods',x:174,z:233,height:8.9,rx:58,rz:65,angle:-.35},
 {name:'Left back meadow',x:-153,z:-133,height:4.4,rx:40,rz:30,angle:.2},
 {name:'Right back meadow',x:114,z:-133,height:4.0,rx:36,rz:31,angle:-.2}
];
export function lowlandRelief(x,z){
 let height=0;
 for(const f of foothills){
  const dx=x-f.x,dz=z-f.z;if(Math.abs(dx)>f.rx*2||Math.abs(dz)>f.rz*2)continue;
  const c=Math.cos(f.angle),s=Math.sin(f.angle),u=(dx*c+dz*s)/f.rx,v=(-dx*s+dz*c)/f.rz;
  // Compact, C2-continuous lobes have wide rounded shoulders and merge into
  // the plain without conical summits or a visible footprint edge.
  const q=Math.max(0,1-(u*u+v*v)/3.4);
  height+=f.height*q*q*q;
 }
 return height*(.92+.045*Math.sin(x*.105+z*.039)+.035*Math.sin(z*.12-x*.047));
}
export const woodlandPatches=[
 [-65,48,15,20,34],[-91,77,26,22,40],[-142,55,29,25,37],
 [-62,106,18,26,38],[-114,134,28,29,39],[-65,175,17,26,27],[-140,208,38,39,37],
 [91,49,17,21,33],[81,91,16,25,38],[138,81,27,26,40],
 [105,139,25,29,40],[87,199,17,32,28],[172,222,35,39,37],
 [-144,-130,28,22,24],[108,-131,25,24,24]
];
