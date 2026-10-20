import * as THREE from 'three';
import {random} from './materials.js';

// A small tonal-art-map adaptation: darker levels retain every earlier mark.
// Mipmapping and triplanar rest coordinates keep the same deposits through zoom.
export function createTonalBrushMaps(){
 const size=512,c=document.createElement('canvas');c.width=c.height=size;
 const g=c.getContext('2d'),r=random(610155),levels=[100,280,560],maps=[],coverage=[];
 g.fillStyle='white';g.fillRect(0,0,size,size);let count=0;
 for(const limit of levels){
  while(count<limit){
   const x=r()*size,y=r()*size,length=5+r()**1.4*48,bend=(r()-.5)*12,width=.8+r()*1.8,opacity=.16+r()*.36;
   // Wrap deposits at the tile edges. A stroke's random parameters are shared
   // by all copies and all tones; darkness never rearranges its footprint.
   for(const ox of [-size,0,size])for(const oy of [-size,0,size]){
    g.save();g.translate(x+ox,y+oy);
    for(let hair=0;hair<3;hair++){
     g.strokeStyle=`rgba(31,29,20,${opacity/(hair+1)})`;g.lineWidth=width/(1+hair*.6);g.lineCap='round';
     g.beginPath();g.moveTo(hair*.8,0);g.bezierCurveTo(bend*.4+hair*.8,length*.32,-bend*.2+hair*.8,length*.65,bend*.2,length);g.stroke();
    }
    g.fillStyle=`rgba(31,29,20,${opacity*.6})`;g.beginPath();g.ellipse(.2,length*.2,width*1.4,1.3,0,0,Math.PI*2);g.fill();g.restore();
   }
   count++;
  }
  const copy=document.createElement('canvas');copy.width=copy.height=size;copy.getContext('2d').drawImage(c,0,0);
  const tex=new THREE.CanvasTexture(copy);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=8;
  maps.push(tex);const pixels=g.getImageData(0,0,size,size).data;let density=0;for(let j=0;j<pixels.length;j+=4)density+=1-pixels[j]/255;
  coverage.push(density/(size*size));
 }
 return{maps,levels,coverage,seed:610155,size,coordinateSpace:'undeformed world',nested:true};
}
export const washFunctions=`
float tonalDeposit(vec2 uv,float tone){
 float a=1.-texture2D(toneLight,uv).r,b=1.-texture2D(toneMiddle,uv).r,c=1.-texture2D(toneDark,uv).r;
 return tone<.5?mix(a,b,tone*2.):mix(b,c,(tone-.5)*2.);
}
vec3 coloredInkWash(vec3 color,vec3 n){
 if(category>3.5||rangeLevel>.5)return color;
 vec3 p=restPoint,w=pow(abs(n),vec3(4.));w/=max(dot(w,vec3(1.)),.001);
 float cloud=noise(p*vec3(.29,.13,.27)),grain=noise(p*3.2);
 float cleft=category<.5?rockField.x:0.;
 float tone=clamp((1.-dot(color,vec3(.25,.60,.15)))*.60+cleft*.34+cloud*.22,0.,1.);
 vec2 xy=vec2(p.x*.13+p.y*.018,p.y*.105),zy=vec2(p.z*.13+p.y*.023,p.y*.105),xz=p.xz*.13;
 float deposit=tonalDeposit(xy,tone)*w.z+tonalDeposit(zy,tone)*w.x+tonalDeposit(xz,tone)*w.y;
 float scale=category<.5?1.:category<1.5?.65:.38;
 // Pooled pigment and dry lifted gaps modulate a colored wash, not grey noise.
 float puddle=smoothstep(.44,.73,cloud)*(.16+.20*cleft),dry=smoothstep(.64,.86,noise(p*vec3(2.9,.65,2.7)));
 vec3 ink=category<.5?vec3(.012,.027,.017):vec3(.020,.031,.012);
 vec3 washed=mix(color,ink,clamp((deposit*.66+puddle*.20)*scale,0.,.56));
 washed*=.96+.08*grain;
 washed=mix(washed,mix(paper,color,.73),dry*.085*scale);
 return mix(color,washed,clamp(washAmount,0.,1.6));
}
`;
