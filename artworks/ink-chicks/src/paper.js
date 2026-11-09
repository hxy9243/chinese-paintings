import * as THREE from 'three';
import {printed} from './rigs.js';
import {WIDTH,HEIGHT} from './flock.js';
// The fibres belong to the sheet's UV coordinates. They never regenerate as
// the camera or flock moves. Low-frequency pulp and fine strands are separate.
export function createPaper(image){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=2048;
 const ctx=canvas.getContext('2d'),grain=ctx.createImageData(canvas.width,canvas.height);
 let seed=18471;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const field=Array.from({length:65*129},random),smooth=t=>t*t*(3-2*t);
 const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy),a=field[iy*65+ix],b=field[iy*65+ix+1],c=field[(iy+1)*65+ix],d=field[(iy+1)*65+ix+1];return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v-.5;};
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const i=(y*canvas.width+x)*4,u=x/canvas.width,v=y/canvas.height;
  const pulp=6*noise(u*5,v*10)+3*noise(u*19,v*38)+1.5*noise(u*62,v*126),tooth=(random()-.5)*11;
  grain.data[i]=239+pulp+tooth;grain.data[i+1]=230+pulp+tooth;grain.data[i+2]=208+pulp+tooth;grain.data[i+3]=255;
 }
 ctx.putImageData(grain,0,0);ctx.lineCap='round';
 for(let i=0;i<20000;i++){
  const x=random()*canvas.width,y=random()*canvas.height,a=random()*Math.PI*2,l=1+random()*10;
  ctx.strokeStyle=i%3?'rgba(121,102,64,.07)':'rgba(255,253,239,.28)';ctx.lineWidth=.25+random()*.6;
  ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.cos(a+.3)*l*.55,y+Math.sin(a+.3)*l*.55,x+Math.cos(a)*l,y+Math.sin(a)*l);ctx.stroke();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 const marks=document.createElement('canvas');marks.width=1024;marks.height=2048;const m=marks.getContext('2d');
 m.scale(marks.width/WIDTH,marks.height/HEIGHT);
 for(const e of printed){const[x,y,w,h]=e.bounds;m.drawImage(image,x/WIDTH*image.width,y/HEIGHT*image.height,w/WIDTH*image.width,h/HEIGHT*image.height,x,y,w,h);}
 const inscription=new THREE.CanvasTexture(marks);inscription.colorSpace=THREE.SRGBColorSpace;inscription.anisotropy=8;
 const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
 const strength={value:.85};
 material.onBeforeCompile=shader=>{
  shader.uniforms.paperStrength=strength;
  shader.fragmentShader='uniform float paperStrength;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = mix(vec3(0.8469,0.7913,0.6445),diffuseColor.rgb,paperStrength);');
 };
 return{material,inscription,setStrength(value){strength.value=value;}};
}
