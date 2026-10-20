// Preview resolution changes the pixel workload, never the editable geometry.
export function chooseRenderSize(width,height,{pixelRatio=1,mode='auto',moving=false,exact=false}={}){
 const detailedRatio=exact?1:Math.min(Math.max(pixelRatio,.5),1.5,Math.sqrt(2560*1440/(width*height)));
 const preview=!exact&&(mode==='fast'||mode==='auto'&&moving);
 const ratio=preview?Math.min(detailedRatio*.75,Math.sqrt(1280*720/(width*height))):detailedRatio;
 return{width:Math.floor(width*ratio),height:Math.floor(height*ratio),ratio,preview,referenceWidth:Math.floor(width*detailedRatio),referenceHeight:Math.floor(height*detailedRatio)};
}

export function createRenderQuality(renderer,{capture=false,pixelRatio=1,width=innerWidth,height=innerHeight,onRefine=()=>{}}={}){
 let mode='auto',moving=false,exact=capture,timer=null,size;
 function cancel(){clearTimeout(timer);timer=null;}
 function apply(){
  size=chooseRenderSize(width,height,{pixelRatio,mode,moving,exact});
  if(renderer.getPixelRatio()!==size.ratio||renderer.domElement.width!==size.width||renderer.domElement.height!==size.height){
   renderer.setPixelRatio(size.ratio);renderer.setSize(width,height,false);
  }
  return size;
 }
 function refine(){cancel();moving=false;apply();onRefine();}
 apply();
 return{
  resize(w,h,{exact:fixed=capture}={}){cancel();width=w;height=h;exact=fixed;moving=false;return apply();},
  cameraMoved(){
   if(capture||exact||mode!=='auto')return;
   cancel();moving=true;apply();timer=setTimeout(refine,350);
  },
  settle(){cancel();moving=false;return apply();},
  setMode(next){if(!['auto','fast','detail'].includes(next))throw Error('Unknown render quality');cancel();mode=next;moving=false;return apply();},
  snapshot(){return{mode,moving,exact,width,height};},
  restore(state){cancel();({mode,moving,exact,width,height}=state);apply();if(moving&&!capture&&!exact&&mode==='auto')timer=setTimeout(refine,350);},
  metadata(){return{mode,moving,exact,logicalWidth:width,logicalHeight:height,...size};},
  dispose:cancel
 };
}
