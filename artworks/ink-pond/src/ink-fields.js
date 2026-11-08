export const hash=n=>{const x=Math.sin(n*127.13+71.7)*43758.5453;return x-Math.floor(x);};
export function noise(x,y,seed){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash(ix*17.17+iy*41.63+seed*13.7),b=hash((ix+1)*17.17+iy*41.63+seed*13.7);
  const c=hash(ix*17.17+(iy+1)*41.63+seed*13.7),d=hash((ix+1)*17.17+(iy+1)*41.63+seed*13.7);
  return(a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;
}

// The circular coordinate is anatomical: angle 0 is the fish's back and pi
// its belly. Paint follows the spine, with pressure changes, split bristles,
// watery fringes and pooled ink rather than an even airbrushed stripe.
export function fishBodyInk(t,angle,seed){
  const c=Math.cos(angle),s=Math.sin(angle),cloud=noise(t*6,c*2+s*1.1,seed);
  const wet=noise(t*14+c,s*4,seed+41);
  const pull=t*(7.3+hash(seed+67)*2.1)+.33*noise(t*3,1,seed+69);
  const pressure=.5+.5*Math.cos(pull*Math.PI*2+seed);
  const ridge=.28*(noise(t*7,1,seed+71)-.5)+.045*Math.sin(t*31+seed);
  const distance=Math.atan2(Math.sin(angle-ridge),Math.cos(angle-ridge));
  const fibre=noise(t*4.5,c*11+s*31,seed+83),edge=noise(t*37+c*4,s*17,seed+89);
  const width=.235+.17*pressure+.075*noise(t*7,2,seed+79);
  const reach=width*(.82+.32*edge+.18*fibre);
  const back=Math.exp(-Math.pow(Math.abs(distance)/reach,3.4));
  // Long, unequal channels left by separate hairs. Dry passages are sparse;
  // most of the ridge still carries wet ink, with softer deposits beside it.
  const split=Math.max(0,(.41-fibre)/.41)*(.35+.65*noise(t*9,3,seed+97));
  const backrun=Math.max(0,wet-.64)*.34;
  const load=(.86+.17*cloud-backrun)*(.91+.09*pressure)*(1-.68*split);
  const fringe=Math.exp(-Math.pow((Math.abs(distance)-reach*1.06)/(.10+.055*wet),2))*(.035+.075*wet);
  const pooled=Math.exp(-Math.pow((Math.abs(distance)-reach*.79)/.075,2))*.065*pressure;
  const wash=.105+.09*cloud+.035*(c*.5+.5);
  return Math.min(.97,wash*(1-back)+load*back+fringe+pooled);
}

// Fins are short side-brush pulls: a loaded root, separated hairs, and a
// thinning end. Circular coordinates keep marks continuous on both faces.
export function fishFinInk(t,angle,seed){
  const c=Math.cos(angle),s=Math.sin(angle),cloud=noise(t*6,c*2+s,seed);
  const hair=noise(t*2.5,c*8+s*23,seed+101),broken=Math.max(0,(.44-hair)/.44);
  const pressure=.72+.28*Math.sin(Math.PI*(.12+t*.83));
  const fade=.95-.35*t,loaded=(.36+.30*cloud)*pressure*fade;
  const fringe=.055+.065*noise(t*17+c,s*9,seed+107);
  return fringe+loaded*(1-.76*broken);
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
