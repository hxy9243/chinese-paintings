import {mountainForms} from './mountain-shapes.js';
export function buildRockFields(){return mountainForms;}
function interpolate(a,b,t){const blend=t*.75+t*t*(3-2*t)*.25;return a+(b-a)*blend;}
function slopeProfile(t){
 // A narrow crest breaks directly into a steep face, then a long, low toe.
 // The former broad bevel inflated the traced silhouettes into round shoulders.
 const knots=[[0,1],[.055,.94],[.22,.64],[.48,.29],[.75,.085],[1,0]];
 if(t>=1)return 0;
 for(let j=1;j<knots.length;j++)if(t<=knots[j][0]){const a=knots[j-1],b=knots[j];return interpolate(a[1],b[1],(t-a[0])/(b[0]-a[0]));}
 return 0;
}
export function sampleRock(field,x,z){
 const baseU=Math.abs(z-field.z)/Math.max(field.front,field.back);
 if(baseU>=1.3)return{height:0,relative:0,cross:0,kind:0,seam:0,seed:field.i/33};
 // Shoulder sweep changes with depth, making a leaning ridge instead of an
 // extrusion of its silhouette. Front/back depth and folds are independent.
 const sweep=Math.sin(field.i*1.37)*field.front*.15*baseU*baseU,xx=x-sweep;
 let top=0,fraction=0,crestZ=field.z;
 const nodes=field.nodes;
 for(let j=1;j<nodes.length;j++){
  const a=nodes[j-1],b=nodes[j];if(xx<a.x||xx>b.x)continue;
  const t=(xx-a.x)/(b.x-a.x);top=interpolate(a.y,b.y,t);crestZ=interpolate(a.z,b.z,t);fraction=(j-1+t)/(nodes.length-1);
  // Small broken saddles preserve the authored landmark endpoints. This is
  // real relief, visible in clay and from behind, rather than a painted outline.
  top-=Math.sin(t*Math.PI)**2*(.24+.50*(.5+.5*Math.sin(j*3.9+field.i)))*Math.min(1,field.h/18);break;
 }
 // The end shoulders taper to the terrain, not a vertical cut at trace ends.
 if(top===0){const edge=xx<nodes[0].x?nodes[0]:nodes[nodes.length-1],distance=Math.abs(xx-edge.x),spread=field.front*(.14+.18*baseU);if(distance>=spread)return{height:0,relative:0,cross:0,kind:0,seam:0,seed:field.i/33};top=edge.y*slopeProfile(distance/spread);crestZ=edge.z;fraction=xx<nodes[0].x?0:1;}
 const front=z>=crestZ,width=front?field.front:field.back,u=Math.abs(z-crestZ)/width;
 if(u>=1)return{height:0,relative:0,cross:0,kind:0,seam:0,seed:field.i/33};
 const flow=fraction*field.folds+u*(.30+.22*Math.sin(field.i))+.10*Math.sin(fraction*17+field.i+u*3),channel=Math.pow(Math.max(0,Math.sin(flow*Math.PI*2+field.i*.7)),4);
 const secondary=Math.pow(Math.max(0,Math.sin(flow*Math.PI*4.7+field.i)),10)*.22;
 const cleft=(channel+secondary)*Math.sin(Math.PI*u)*(front?.38:.18);
 const shoulder=(front?.065:.035)*Math.sin(flow*Math.PI*2-1.3)*Math.sin(Math.PI*u);
 const fall=Math.max(0,slopeProfile(u)*(1-cleft+shoulder)),height=top*fall;
 return{height,relative:fall*top/field.h,cross:front?u:-u,kind:Math.floor(fraction*field.folds)+1,seam:channel*Math.sin(Math.PI*u)*.8,seed:(Math.sin(field.i*17.13)*.5+.5)};
}
