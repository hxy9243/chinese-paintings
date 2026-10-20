// An independently reproducible film route; it does not replace the viewer's
// original bridge journey or change the scene's geometry, palette or shaders.
export const film={duration:30,fps:24,width:1600,height:900,farPlane:2200,holdFrom:28.5};
export function createPavilionFlight(H){
 const focus=[H.x,H.y+2.7,H.z];
 const keys=[
  {seconds:0,position:[0,52,218],target:[0,28,-105],fov:40},
  {seconds:3,position:[-2,41,161],target:[H.x,12.8,H.z],fov:40},
  {seconds:7,position:[H.x-23,24,H.z+49],target:focus,fov:39},
  {seconds:10,position:[H.x-17,17.6,H.z+24],target:focus,fov:39},
  {seconds:13,position:[H.x-5,16.7,H.z+25],target:focus,fov:37},
  {seconds:16,position:[H.x+16,17.7,H.z+21],target:focus,fov:39},
  {seconds:19,position:[H.x+30,20.5,H.z+2],target:[H.x,H.y+2.8,H.z],fov:41},
  {seconds:21,position:[H.x+48,28,H.z+24],target:[H.x,H.y+3.3,H.z],fov:42},
  {seconds:24,position:[H.x+54,45,H.z+100],target:[H.x-4,19,-4],fov:43},
  {seconds:28.5,position:[18,70,262],target:[0,33,-105],fov:40}
 ];
 function tangent(i,key,axis){if(i===0||i===keys.length-1)return 0;const a=keys[i-1],b=keys[i+1],v=p=>axis===null?p[key]:p[key][axis];return .85*(v(b)-v(a))/(b.seconds-a.seconds);}
 function component(i,key,axis,t,span){const a=keys[i],b=keys[i+1],v=p=>axis===null?p[key]:p[key][axis],tt=t*t,ttt=tt*t;return(2*ttt-3*tt+1)*v(a)+(ttt-2*tt+t)*span*tangent(i,key,axis)+(-2*ttt+3*tt)*v(b)+(ttt-tt)*span*tangent(i+1,key,axis);}
 function sample(seconds){
  const s=Math.max(0,Math.min(film.holdFrom,seconds));let i=keys.length-2;for(let j=0;j<keys.length-1;j++)if(s<=keys[j+1].seconds){i=j;break;}
  const span=keys[i+1].seconds-keys[i].seconds,t=(s-keys[i].seconds)/span;
  return{seconds,position:[0,1,2].map(a=>component(i,'position',a,t,span)),target:[0,1,2].map(a=>component(i,'target',a,t,span)),fov:component(i,'fov',null,t,span)};
 }
 return{film,keys,sample,focus};
}
