import {borrowedElements} from './composition.js';
import {bodyMotion} from './poses.js';
export const printed=borrowedElements.filter(e=>e.kind==='printed');
function inkLine(ctx,points,width,alpha=.92){
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=`rgba(32,33,29,${alpha})`;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.stroke();
 ctx.strokeStyle=`rgba(92,87,73,${alpha*.35})`;ctx.lineWidth=width*.22;ctx.stroke();ctx.restore();
}
export function drawLegs(ctx,bird,pose,{debug=false}={}){
 const hen=bird.kind==='hen',bounce=bodyMotion(pose,hen).bounce,theta=pose.heading;
 const forward={x:Math.sin(theta),y:Math.cos(theta)*.45},right={x:Math.cos(theta),y:-Math.sin(theta)*.42};
 for(const i of [0,1].sort((a,b)=>pose.feet[a].y-pose.feet[b].y)){
  const side=i===0?-1:1,hip={x:pose.x+right.x*side*(hen?9:4),y:pose.y+(hen?45:7)+right.y*side*(hen?9:4)-bounce};
  const f=pose.feet[i],toe={x:f.x,y:f.y-f.lift};
  const knee={x:hip.x+(toe.x-hip.x)*.55-forward.x*(hen?6:3),y:hip.y+(toe.y-hip.y)*.56-forward.y*(hen?4:2)};
  inkLine(ctx,[[hip.x,hip.y],[knee.x,knee.y]],hen?2.1:1.45,i===0?.7:.9);
  inkLine(ctx,[[knee.x,knee.y],[toe.x,toe.y]],hen?1.05:.85);
  const yaw=f.yaw??theta,footForward={x:Math.sin(yaw),y:Math.cos(yaw)*.45},footRight={x:Math.cos(yaw),y:-Math.sin(yaw)*.42};
  const reach=hen?7:4.3,spread=hen?3.3:2.2;
  for(let j=-1;j<=1;j++){const tip=[toe.x+footForward.x*reach+footRight.x*j*spread,toe.y+footForward.y*reach+footRight.y*j*spread+(f.lift>1?1:0)];inkLine(ctx,[[toe.x,toe.y],tip],hen?.9:.75);}
  inkLine(ctx,[[toe.x,toe.y],[toe.x-footForward.x*(hen?3.5:2),toe.y-footForward.y*(hen?3.5:2)]],hen?.85:.7);
  if(debug){ctx.strokeStyle=f.plant?'#a14332':'#416a88';ctx.beginPath();ctx.arc(toe.x,toe.y,1.8,0,Math.PI*2);ctx.stroke();}
 }
}
