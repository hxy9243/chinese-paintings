import {createHenRenderer} from './hen-renderer.js';
import landmarks from '../scripts/pose-data/landmarks.json';
// Multi-view painted bodies. Direction is a continuous angle, never a reflected
// or edge-on flat sprite. Numeric flow aligns pigment before blending keyposes.
const atlasFiles=import.meta.glob('../assets/v5/*-poses.png',{eager:true,query:'?url',import:'default'});
const flowFiles=import.meta.glob('../assets/v5/*-flow.bin',{eager:true,query:'?url',import:'default'});
const metadata=import.meta.glob('../assets/v5/*-poses.json',{eager:true,import:'default'});
// Forward-warp a small pigment mesh. Unlike inverse UV guesses this places
// matching anatomical anchors at the same intermediate point before blending.
const vertex=`#version 300 es
precision highp float;precision highp sampler2DArray;
in vec2 position;out vec2 uv;uniform vec4 rect;uniform vec2 viewport;
uniform sampler2DArray flows;
uniform int turnLayer;uniform int actionLayer;
uniform float turnWeight;uniform float actionWeight;uniform float nod;uniform float heading;uniform float hen;
uniform vec2 headAnchor;uniform vec2 beakAnchor;uniform vec2 feedDrop;
vec2 displacement(vec2 p,int layer){vec4 b=texture(flows,vec3(p,float(layer)));return clamp(vec2(b.r*65280.+b.g*255.,b.b*65280.+b.a*255.)/65535.-.5,vec2(-.32),vec2(.32));}
void main(){
 uv=position;vec2 q=position;
 q+=displacement(position,turnLayer)*turnWeight;
 q+=displacement(position,actionLayer)*actionWeight;
 vec2 head=vec2(.5+sin(heading)*mix(.19,.28,hen),mix(.29,.43,hen));
 float headWeight=exp(-dot(position-head,position-head)/mix(.035,.022,hen));
 q+=vec2(sin(heading)*nod*.2,nod)*headWeight;
 // Translate the face and bill together, blending only through the feathered
 // neck. The two landmarks are already aligned by the authored pose flow.
 vec2 axis=beakAnchor-headAnchor;
 float along=clamp(dot(q-headAnchor,axis)/max(dot(axis,axis),.0001),0.,1.);
 float distanceToHead=length(q-headAnchor-axis*along);
 float neckWeight=1.-smoothstep(.07,.24,distanceToHead);
 q+=feedDrop*neckWeight;
 vec2 p=rect.xy+q*rect.zw;gl_Position=vec4(p.x/viewport.x*2.-1.,1.-p.y/viewport.y*2.,0,1);
}`;
const fragment=`#version 300 es
precision highp float;
in vec2 uv;out vec4 color;uniform sampler2D atlas;
uniform vec4 transform;uniform vec4 crop;uniform float opacity;
void main(){
 if(uv.x<crop.x||uv.y<crop.y||uv.x>crop.z||uv.y>crop.w){color=vec4(0);return;}
 vec4 c=texture(atlas,uv*transform.zw+transform.xy);color=vec4(c.rgb*c.a,c.a)*opacity;
}`;
const loadImage=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Could not load a painted pose'));im.src=url;});
function program(gl,vs=vertex,fs=fragment){
 const p=gl.createProgram();for(const [type,code]of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function bodyMotion(pose,hen){const run=clamp(pose.speed/(hen?23:40),0,1),cycle=pose.phase*Math.PI*2;return{bounce:run*(hen?.6:1.1)*(1-Math.cos(cycle*2))*.5-(pose.feedLower??clamp(pose.peck/.90,0,1))*(hen?14:6.5),nod:run*Math.sin(cycle)*.008};}
export async function createPoseRenderer(birds,{includeHen=true}={}){
 const canvas=document.createElement('canvas');const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:false});
 if(!gl)throw Error('This painting needs WebGL 2 for its interpolated painted poses.');
 const p=program(gl);gl.useProgram(p);const loc=Object.fromEntries(['rect','viewport','atlas','flows','transform','crop','heading','nod','hen','turnLayer','actionLayer','turnWeight','actionWeight','opacity','headAnchor','beakAnchor','feedDrop'].map(k=>[k,gl.getUniformLocation(p,k)]));
 const grid=32,vertices=[],indices=[];for(let y=0;y<=grid;y++)for(let x=0;x<=grid;x++)vertices.push(x/grid,y/grid);
 for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){const a=y*(grid+1)+x,b=a+1,c=a+grid+1,d=c+1;indices.push(a,b,c,b,d,c);}
 const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);const pos=gl.getAttribLocation(p,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
 gl.uniform1i(loc.atlas,0);gl.uniform1i(loc.flows,1);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.clearColor(0,0,0,0);
 const assets=new Map();
 await Promise.all(birds.filter(b=>b.kind!=='hen').map(async bird=>{
  const prefix=`../assets/v5/${bird.id}`,dataPrefix=`../assets/v5/${bird.id}`,meta=metadata[dataPrefix+'-poses.json'];if(!meta)throw Error('Missing poses for '+bird.id);
  const [im,data]=await Promise.all([loadImage(atlasFiles[prefix+'-poses.png']),fetch(flowFiles[dataPrefix+'-flow.bin']).then(r=>{if(!r.ok)throw Error('Missing pose correspondence');return r.arrayBuffer();})]);
  const atlas=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlas);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);
  for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
  const flows=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D_ARRAY,flows);gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,meta.size,meta.size,48,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(data));
  for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D_ARRAY,k,gl.LINEAR);for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D_ARRAY,k,gl.CLAMP_TO_EDGE);
  assets.set(bird.id,{bird,meta,atlas,flows});
 }));
 const henRenderer=includeHen?await createHenRenderer():null,composite=document.createElement('canvas'),ctx=composite.getContext('2d');
 return {canvas:composite,henRig:henRenderer?.rig,render(poses,{width=572,height=1140,worldWidth=286,worldHeight=570,originX=0,originY=0}={}){
  const renderScale=width===572?.625:1,paintWidth=Math.round(width*renderScale),paintHeight=Math.round(height*renderScale);
  if(canvas.width!==paintWidth||canvas.height!==paintHeight){canvas.width=paintWidth;canvas.height=paintHeight;}gl.viewport(0,0,paintWidth,paintHeight);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(p);gl.uniform2f(loc.viewport,worldWidth,worldHeight);
  for(const pose of poses.filter(p=>p.id!=='mother-hen')){const a=assets.get(pose.id),hen=a.bird.kind==='hen',r=a.bird.radius,motion=bodyMotion(pose,hen);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,a.atlas);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D_ARRAY,a.flows);
   gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
   gl.uniform4f(loc.rect,pose.x-r-originX,pose.y-r-originY-motion.bounce,r*2,r*2);
   const heading=((pose.heading%(Math.PI*2))+Math.PI*2)%(Math.PI*2),theta=heading/(Math.PI/4),left=Math.floor(theta)%8,right=(left+1)%8,u=theta-Math.floor(theta),v=pose.feedLower??pose.peck;
   const lower=pose.feedLower??clamp(pose.peck/.9,0,1),strike=pose.feedStrike??clamp((pose.peck-.9)/.1,0,1);
   const anchor=key=>{const point=f=>{const b=a.meta.bounds[f],p=landmarks.chick[key][f];return[b[0]+p[0]*(b[2]-b[0]),b[1]+p[1]*(b[3]-b[1])];};const result=[0,0];for(const down of [0,1])for(const next of [0,1]){const p=point((next?right:left)+down*8),w=(down?v:1-v)*(next?u:1-u);result[0]+=p[0]*w;result[1]+=p[1]*w;}return result;};
   const head=anchor('head'),beak=anchor('beak');
   const visibility=clamp((Math.cos(heading)+1)/.30,0,1);
   const ground=.5+(19+Math.cos(heading)*r*.65*.42+motion.bounce)/(2*r);
   const drop=clamp(ground-beak[1]-(1-strike)*2.8/(2*r),0,.26)*lower*visibility;
   gl.uniform2fv(loc.headAnchor,head);gl.uniform2fv(loc.beakAnchor,beak);
   // The lowered atlas already provides the forward reach; strikes add only
   // the final downward tap, keeping the face inside the reserved footprint.
   gl.uniform2f(loc.feedDrop,0,drop);
   gl.uniform1f(loc.heading,heading);gl.uniform1f(loc.nod,motion.nod);gl.uniform1f(loc.hen,hen?1:0);
   for(const lower of [0,1])for(const next of [0,1]){
    const opacity=(lower?v:1-v)*(next?u:1-u);if(opacity<.000001)continue;
    const view=next?right:left,frame=view+lower*8;
    gl.uniform4fv(loc.transform,a.meta.transforms[frame]);gl.uniform4fv(loc.crop,a.meta.bounds[frame]);
    gl.uniform1i(loc.turnLayer,left*2+next+lower*16);gl.uniform1i(loc.actionLayer,32+view*2+lower);
    gl.uniform1f(loc.turnWeight,next?1-u:u);gl.uniform1f(loc.actionWeight,lower?1-v:v);gl.uniform1f(loc.opacity,opacity);
    gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
   }
  }
  if(composite.width!==width||composite.height!==height){composite.width=width;composite.height=height;}
  ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(width/worldWidth,height/worldHeight);ctx.translate(-originX,-originY);
  for(const pose of poses.filter(p=>p.id!=='mother-hen'))drawWings(ctx,pose,birds.find(b=>b.id===pose.id));
  ctx.restore();ctx.drawImage(canvas,0,0,width,height);
  const mother=poses.find(p=>p.id==='mother-hen');if(mother&&henRenderer){const sprite=henRenderer.render(mother,width===572?1.25:width/worldWidth),span=henRenderer.span;ctx.drawImage(sprite,(mother.x-span/2-originX)*width/worldWidth,(mother.y-span/2-originY)*height/worldHeight,span*width/worldWidth,span*height/worldHeight);}
  return composite;
 },getError:()=>gl.getError()||henRenderer?.getError()||0};
}

function drawWings(ctx,pose,bird){
 const amount=pose.wing||0;if(amount<.01)return;
 const gold=bird.kind==='yellow',motion=bodyMotion(pose,false),theta=pose.heading;
 ctx.save();ctx.translate(pose.x,pose.y-motion.bounce-2);
 for(const side of [-1,1]){
  ctx.save();ctx.translate(Math.cos(theta)*side*7,-Math.sin(theta)*side*3);ctx.rotate(side*(-.25-amount*.75));
  for(let i=0;i<6;i++){
   ctx.fillStyle=gold?['#c99d3e','#d9ad4d','#d5a748'][i%3]:['#30312c','#45443b','#34362f'][i%3];
   ctx.beginPath();ctx.ellipse(side*(3+amount*(6+i*.6)),-3+i*2,amount*(9-i*.55),2.8,side*(-.5+i*.10),0,Math.PI*2);ctx.fill();
   ctx.strokeStyle=gold?'#ead18599':'#99978166';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(side*3,-3+i*2);ctx.lineTo(side*(7+amount*(9-i*.5)),-4+i*2);ctx.stroke();
  }ctx.restore();
 }ctx.restore();
}
