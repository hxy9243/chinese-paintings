export const hash=n=>{const x=Math.sin(n*127.13+71.7)*43758.5453;return x-Math.floor(x);};
export function noise(x,y,seed){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash(ix*17.17+iy*41.63+seed*13.7),b=hash((ix+1)*17.17+iy*41.63+seed*13.7);
  const c=hash(ix*17.17+(iy+1)*41.63+seed*13.7),d=hash((ix+1)*17.17+(iy+1)*41.63+seed*13.7);
  return(a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;
}

// The circular coordinate is anatomical: angle 0 is the fish's back and pi
// its belly. A narrow loaded stroke runs along the spine above a dilute wash.
export function fishBodyInk(t,angle,seed){
  const c=Math.cos(angle),s=Math.sin(angle),cloud=noise(t*6,c*2+s*1.1,seed);
  const wet=noise(t*14+c,s*4,seed+41),ridge=.16*(noise(t*5,1,seed+71)-.5);
  const distance=Math.atan2(Math.sin(angle-ridge),Math.cos(angle-ridge));
  const width=.32+.10*noise(t*4,2,seed+79),back=Math.exp(-Math.pow(Math.abs(distance)/width,2.4));
  const backrun=Math.max(0,wet-.64)*.27;
  const load=(.78+.30*cloud-backrun)*(.94+.06*Math.sin(t*11+seed));
  const wash=.105+.09*cloud+.035*(c*.5+.5);
  return wash*(1-back)+load*back;
}

const FOX_SPOTS=Array.from({length:42},(_,i)=>{
  const seed=307+i*17.3,r=.0025+.0045*hash(seed+3);
  return{x:hash(seed),y:hash(seed+1),rx:r,ry:r*(.65+.8*hash(seed+5)),strength:.18+.32*hash(seed+7)};
});
// Separate fine fibres, broad age clouds, and sparse warm foxing. Macro fields
// cover the entire sheet once; only the microscopic fibre channel is tiled.
export function paperFields(u,v){
  const x=u*512,y=v*512,i=Math.floor(x)+Math.floor(y)*512;
  const fibre=hash(Math.floor(x/3)+Math.floor(y)*149),grain=hash(i*3.7);
  const cloud=.56*noise(u*3.2,v*3.7,211)+.30*noise(u*8.3,v*7.1,223)+.14*noise(u*23,v*19,227);
  let foxing=0;
  for(const spot of FOX_SPOTS){
    const dx=(u-spot.x)/spot.rx,dy=(v-spot.y)/spot.ry;
    if(Math.abs(dx)<2&&Math.abs(dy)<2)foxing+=spot.strength*Math.exp(-(dx*dx+dy*dy)*2);
  }
  return{fibre:(128+(grain-.5)*92+(fibre-.5)*30)/255,cloud,foxing};
}

// Share the exact paper colour beneath bare paper and translucent animals.
// This keeps the dilute body washes continuous with the surrounding sheet.
export const PAPER_GLSL=`
  vec3 paperColor(vec2 pageUv){
    float fibre=texture2D(paper,pageUv*cssResolution/512.).r-.5;
    vec3 age=texture2D(paper,pageUv*.88+vec2(.06)).rgb;
    return paperTone+fibre*.024+(age.g-.5)*vec3(.105,.130,.170)-age.b*vec3(.030,.050,.085);
  }
`;
