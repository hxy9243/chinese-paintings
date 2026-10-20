import * as THREE from 'three';

export function random(seed=1977){let s=seed>>>0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
export function pigmentTexture(kind='paper',seed=36){
 const r=random(seed),c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
 const base={paper:'#cec3a3',bark:'#9a8960',rock:'#a5a18a',leaf:'#909b8b',roof:'#7b8070',wood:'#9b8867',water:'#a5b0a8',path:'#bcad83'}[kind];
 g.fillStyle=base;g.fillRect(0,0,512,512);
 for(let i=0;i<6800;i++){
   let x=r()*512,y=r()*512,alpha=.02+r()*.09;
   g.strokeStyle=`rgba(${r()>.5?'36,42,29':'246,230,183'},${alpha})`;
   g.lineWidth=.4+r()*1.7;g.beginPath();g.moveTo(x,y);
   const long=kind==='bark'?12+r()*75:kind==='water'?9+r()*54:2+r()*20;
   if(kind==='bark')g.lineTo(x+(r()-.5)*6,y+long);
   else if(kind==='water')g.lineTo(x+long,y+(r()-.5)*2);
   else g.bezierCurveTo(x+long*.3,y-2,x+long*.7,y+3,x+long,y+(r()-.5)*7);
   g.stroke();
 }
 if(kind==='roof'){
   for(let y=0;y<512;y+=32){g.strokeStyle='rgba(44,49,39,.36)';g.lineWidth=2;g.beginPath();g.moveTo(0,y);g.lineTo(512,y+1);g.stroke();}
   for(let x=0;x<512;x+=24){g.strokeStyle='rgba(224,217,180,.25)';g.lineWidth=2;g.beginPath();g.moveTo(x,0);g.lineTo(x,512);g.stroke();}
 }
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;return tex;
}

const noiseGLSL=`
float inkHash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float inkNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(inkHash(i),inkHash(i+vec3(1,0,0)),f.x),mix(inkHash(i+vec3(0,1,0)),inkHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(inkHash(i+vec3(0,0,1)),inkHash(i+vec3(1,0,1)),f.x),mix(inkHash(i+vec3(0,1,1)),inkHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
let materialId=0;
export function makeMaterial({color='#b0a17b',kind='rock',roughness=1,vertexColors=false,strength=.6,side=THREE.FrontSide}={}){
 const tex=pigmentTexture(kind,kind.length*173);
 const material=new THREE.MeshStandardMaterial({color,map:tex,roughness,metalness:0,vertexColors,side});
 material.name=kind+' · matte mineral pigment';material.userData.pigmentKind=kind;
 const id=materialId++;
 material.onBeforeCompile=shader=>{
  shader.uniforms.inkStrength={value:strength};
  shader.vertexShader='varying vec3 vInkPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
  vec4 inkLocal = vec4(transformed,1.0);
  #ifdef USE_INSTANCING
   inkLocal=instanceMatrix*inkLocal;
  #endif
  vInkPosition=(modelMatrix*inkLocal).xyz;
  `);
  shader.fragmentShader='varying vec3 vInkPosition;\nuniform float inkStrength;\n'+noiseGLSL+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float inkWash=inkNoise(vInkPosition*.65);
   float dryStroke=texture2D(map,fract(vec2(vInkPosition.x*.9+vInkPosition.z*.27,vInkPosition.y*.55))).g;
   float fibre=texture2D(map,fract(vInkPosition.xz*1.6)).r;
   diffuseColor.rgb*=1.+inkStrength*((inkWash-.5)*.30+(dryStroke-.5)*.16+(fibre-.5)*.08);
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.83,.84,.74),inkStrength*smoothstep(.68,.83,dryStroke)*.18);
  `);
 };
 material.customProgramCacheKey=()=>`ink-wash-v2-${id}`;
 return material;
}

export function createMaterials(){
 return {
  terrain:makeMaterial({color:'#ffffff',kind:'rock',vertexColors:true,strength:.85}),
  bark:makeMaterial({color:'#eee3bd',kind:'bark',strength:.75}),
  darkBark:makeMaterial({color:'#9c987a',kind:'bark',strength:.8}),
  leaves:makeMaterial({color:'#c2d8cd',kind:'leaf',side:THREE.DoubleSide,strength:.9}),
  leafSmall:makeMaterial({color:'#809781',kind:'leaf',side:THREE.DoubleSide,strength:.6}),
  rocks:makeMaterial({color:'#ded7b6',kind:'rock',strength:.9}),
  roof:makeMaterial({color:'#c5c5a6',kind:'roof',strength:.55}),
  timber:makeMaterial({color:'#e1cfad',kind:'wood',strength:.5}),
  timberDark:makeMaterial({color:'#b9b698',kind:'wood',strength:.6}),
  plaster:makeMaterial({color:'#f5ead0',kind:'paper',strength:.4}),
  stone:makeMaterial({color:'#ceccae',kind:'rock',strength:.5}),
  path:makeMaterial({color:'#d9c59a',kind:'path',strength:.55}),
  water:makeMaterial({color:'#dbe2d8',kind:'water',roughness:.82,strength:.38}),
  sail:makeMaterial({color:'#525747',kind:'paper',side:THREE.DoubleSide,strength:.7}),
  robe:makeMaterial({color:'#b9b08d',kind:'paper',strength:.45}),
  reed:makeMaterial({color:'#92946a',kind:'leaf',side:THREE.DoubleSide,strength:.45}),
 };
}
