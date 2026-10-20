// A full 360-degree circuit, with an exact return to the reference camera.
// The panoramic film keeps the painting's original framing at both ends.
export const orbitFilm={duration:40,fps:24,width:1600,height:720,farPlane:2200,orbitFrom:7,orbitTo:29,holdFrom:38};
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function createPavilionOrbit(H){
 const painting={position:[0,58,220],target:[0,29,-105],fov:32};
 const focus=[H.x,H.y+2.7,H.z],radius=26,height=H.y+10.8;
 const front={position:[H.x,height,H.z+radius],target:focus,fov:36};
 function blend(a,b,t){return{position:mix(a.position,b.position,t),target:mix(a.target,b.target,t),fov:a.fov+(b.fov-a.fov)*t};}
 function sample(seconds){
  const s=Math.max(0,Math.min(orbitFilm.duration,seconds));
  if(s<=1||s>=orbitFilm.holdFrom)return{...painting,phase:'painting',angle:0};
  if(s<orbitFilm.orbitFrom)return{...blend(painting,front,ease((s-1)/6)),phase:'approach',angle:0};
  if(s<=orbitFilm.orbitTo){
   const u=(s-orbitFilm.orbitFrom)/(orbitFilm.orbitTo-orbitFilm.orbitFrom);
   // Gentle acceleration at either end, with a nearly steady middle arc.
   const ramp=.16,area=1-ramp;
   const integral=u<ramp?(u*u*u/(ramp*ramp)-u*u*u*u/(2*ramp*ramp*ramp)):u>1-ramp?area-((1-u)**3/(ramp*ramp)-(1-u)**4/(2*ramp**3)):u-ramp/2;
   const angle=Math.PI*2*integral/area;
   return{position:[H.x+Math.sin(angle)*radius,height+1.4*Math.sin(angle*.5)**2,H.z+Math.cos(angle)*radius],target:focus,fov:36,phase:'orbit',angle};
  }
  return{...blend(front,painting,ease((s-orbitFilm.orbitTo)/(orbitFilm.holdFrom-orbitFilm.orbitTo))),phase:'return',angle:Math.PI*2};
 }
 return{film:orbitFilm,painting,focus,radius,height,sample};
}
