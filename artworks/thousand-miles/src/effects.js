import * as THREE from 'three';
import {naturalColorsGLSL} from './natural-palette.js';
import {random} from './materials.js';
export const windVertex=`
uniform float clockSeconds,windStrength,vegetation;
attribute vec4 aAnchor;
varying vec3 restPoint;varying vec2 brushUv;
vec3 bendInWind(vec3 p,inout vec3 n){
 if(vegetation<.5||aAnchor.w<.01)return p;
 float h=max(aAnchor.w,.08),flex=clamp((p.y-aAnchor.y)/h,0.,1.25);
 float phase=aAnchor.x*.075+aAnchor.z*.047;
 float breeze=.63*sin(clockSeconds*.72+phase)+.23*sin(clockSeconds*1.31+phase*.7)+.14*sin(clockSeconds*.37-phase);
 float isGrass=1.-step(1.5,h),amplitude=mix(.19,h*.25,isGrass)*windStrength;
 float sway=breeze*amplitude*flex*flex;
 vec2 direction=vec2(.93,.37);p.xz+=direction*sway;
 n.y-=dot(n.xz,direction)*(2.*amplitude*breeze*flex/h);
 // Tips have a little independent flutter, under the same spatially coherent gust.
 float flutter=sin(clockSeconds*1.9+restPoint.x*1.6+restPoint.z*1.3)*.013*windStrength*flex;
 p.x+=flutter;p.y+=flutter*.22;n=normalize(n);return p;
}`;
export function createWaterStrokes(atlas){
 const r=random(87231),p=[],uv=[],data=[],idx=[];
 for(let i=0;i<1700;i++){
  const x=-170+r()*340,z=-315+r()*630,len=1.1+r()**1.5*7.2,width=.035+r()*.12,opacity=.15+r()*.25,seed=r(),base=p.length/3;
  for(let j=0;j<=12;j++){const t=j/12,arc=Math.sin(t*Math.PI)*(.08+seed*.26);for(const side of [-1,1]){p.push(x+(t-.5)*len,.036,z+arc+side*width);uv.push(t,side*.5+.5);data.push(opacity,seed);}}
  for(let j=0;j<12;j++){const a=base+j*2;idx.push(a,a+1,a+3,a,a+3,a+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('stroke',new THREE.Float32BufferAttribute(data,2));g.setIndex(idx);
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,uniforms:{clockSeconds:{value:0},waterMotion:{value:.8},brushAmount:{value:1},atlas:{value:atlas}},vertexShader:`attribute vec2 stroke;uniform float clockSeconds,waterMotion;varying vec2 brush;varying vec2 info;void main(){
  vec3 p=position;float t=clockSeconds*waterMotion;
  p.x+=t*.11+.48*sin(position.z*.045-t*.24+stroke.y*.5);
  p.z+=t*.48+.38*sin(position.x*.033-t*.19+stroke.y*.5);
  p.z+=sin(uv.x*6.283+stroke.y*6.28-t*.7)*.07*sin(uv.x*3.14159);
  brush=uv;info=stroke;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
 }`,fragmentShader:`uniform sampler2D atlas;uniform float brushAmount;varying vec2 brush,info;void main(){float end=pow(max(0.,sin(brush.x*3.14159)),.65),edge=1.-smoothstep(.28,1.,abs(brush.y*2.-1.));float hair=.38+.62*texture2D(atlas,brush*vec2(.7,.16)+info.y).r;vec3 color=mix(vec3(.11,.15,.14),vec3(.23,.30,.26),step(.82,info.y));gl_FragColor=vec4(color,info.x*end*edge*hair*brushAmount);
 #include <colorspace_fragment>
 }`});
 const mesh=new THREE.Mesh(g,mat);mesh.name='Curved drifting lake ink strokes';mesh.visible=false;mesh.renderOrder=2;mesh.userData={strokeCount:1700,clock:'absolute',drift:[.11,.48]};return mesh;
}
export function createInkSky(paper,noise){
 const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,uniforms:{paper:{value:paper},clockSeconds:{value:0},atmosphereAmount:{value:.55}},vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform vec3 paper;uniform float clockSeconds,atmosphereAmount;varying vec3 direction;${noise}${naturalColorsGLSL}void main(){vec3 d=normalize(direction);float h=smoothstep(-.05,.32,d.y);vec3 gold=natural_horizon,olive=natural_sky;float cloud=noise(d*vec3(5.,8.,5.)+vec3(clockSeconds*.001,0.,0.));vec3 color=mix(gold,olive,h);color*=.96+.08*cloud;color=mix(color,paper*.98,(1.-h)*cloud*.10*atmosphereAmount);gl_FragColor=vec4(color,1.);\n#include <colorspace_fragment>\n}`});const sky=new THREE.Mesh(new THREE.SphereGeometry(1250,36,24),m);sky.name='Warm paper and soft daylight sky wash';sky.visible=false;return sky;
}
export const atmosphereFragment=`
vec3 applyAtmosphere(vec3 color,vec3 point,float depthValue){
 vec3 origin=cameraWorld[3].xyz,delta=point-origin;float travel=min(length(delta),700.);vec3 ray=normalize(delta);float optical=0.;
 // Elongated low sheets drift over the far lake in world coordinates.
 // Depth-limited integration keeps foreground banks and architecture in front.
 for(int i=0;i<8;i++){
  vec3 p=origin+ray*travel*(float(i)+.5)/8.;float remote=smoothstep(75.,235.,-p.z);
  vec3 drift=p-vec3(clockSeconds*.72,0.,clockSeconds*.16);
  float a=noise(drift*vec3(.014,.055,.035)+vec3(5.,1.,8.));
  float b=noise(drift*vec3(.027,.039,.018)+vec3(12.,6.,2.));
  float low=exp(-pow((p.y-3.5-1.4*sin(p.x*.018))/5.7,2.));
  float middle=exp(-pow((p.y-12.-2.*b)/8.8,2.));
  float high=exp(-pow((p.y-24.)/13.,2.))*smoothstep(180.,330.,-p.z)*.19;
  float density=low*(.10+.90*smoothstep(.28,.72,a))+middle*(.05+.60*smoothstep(.38,.77,b))+high;
  optical+=remote*density*travel/8.*.011;
 }
 float base=exp(-pow((point.y-4.)/11.,2.))*smoothstep(110.,280.,-point.z)*.13;
 float veil=clamp((1.-exp(-optical)+base)*atmosphereAmount,0.,.73);
 vec3 fog=mix(natural_horizon,natural_fog,.25+.15*sin(point.z*.014));
 return mix(color,fog,veil);
}`;
