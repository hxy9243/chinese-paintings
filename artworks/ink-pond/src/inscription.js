import writing from './assets/yu-xia-qing-qu-liu-strokes.json';
import atlasUrl from './assets/yu-xia-qing-qu-liu-strokes.png';
import completeUrl from './assets/yu-xia-qing-qu-liu.png';

const image=async src=>{const i=new Image();i.src=src;await i.decode();return i;};

// Replay the calligraphy engine's ordered alpha/phase fields. Completed ink is
// retained; only the current stroke's small rectangle changes during writing.
export async function createInscription(canvas){
  const [atlas,complete]=await Promise.all([image(atlasUrl),image(completeUrl)]);
  const scratch=document.createElement('canvas');scratch.width=atlas.width;scratch.height=atlas.height;
  const read=scratch.getContext('2d',{willReadFrequently:true});read.drawImage(atlas,0,0);
  const pixels=read.getImageData(0,0,atlas.width,atlas.height).data;
  canvas.width=writing.width;canvas.height=writing.height;
  const ctx=canvas.getContext('2d'),frame=ctx.createImageData(canvas.width,canvas.height),output=frame.data;
  const strokes=writing.strokes.map(s=>{
    const alpha=new Uint8Array(s.width*s.height),phase=new Float32Array(alpha.length);
    for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){
      const p=y*s.width+x,at=((s.atlasY+y)*atlas.width+s.atlasX+x)*4;
      alpha[p]=pixels[at];phase[p]=(pixels[at+1]*256+pixels[at+2])/65535;
    }
    return{...s,alpha,phase};
  });
  let lastTime=-1,finished=0,completeDrawn=false;
  function reset(){output.fill(0);ctx.clearRect(0,0,canvas.width,canvas.height);finished=0;completeDrawn=false;}
  function deposit(s,progress){
    for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){
      const p=y*s.width+x;if(!s.alpha[p])continue;
      const u=Math.max(0,Math.min(1,(progress-(.03+.90*s.phase[p]))/.06));
      const a=Math.round(s.alpha[p]*u*u*(3-2*u)),xx=s.x+x,yy=s.y+y;
      if(xx<0||yy<0||xx>=canvas.width||yy>=canvas.height)continue;
      const at=(yy*canvas.width+xx)*4;if(a<=output[at+3])continue;
      output[at]=40;output[at+1]=42;output[at+2]=35;output[at+3]=a;
    }
    ctx.putImageData(frame,0,0,Math.max(0,s.x),Math.max(0,s.y),s.width,s.height);
  }
  function render(time){
    time=Math.max(0,time);if(time===lastTime)return;
    if(time<lastTime)reset();lastTime=time;
    if(time>=writing.duration){if(!completeDrawn){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(complete,0,0);completeDrawn=true;finished=strokes.length;}return;}
    while(finished<strokes.length&&strokes[finished].end<=time){deposit(strokes[finished],1);finished++;}
    const active=strokes[finished];if(active&&time>active.start)deposit(active,(time-active.start)/(active.end-active.start));
  }
  return{render,describe:()=>({text:writing.text,strokes:strokes.length,completed:finished,duration:writing.duration,time:lastTime,position:'left, vertically centered',method:'Ordered font-preserving stroke alpha and progress fields'})};
}
