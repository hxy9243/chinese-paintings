import * as THREE from 'three';
import {random} from './materials.js';
import {terrainHeight,shoreGLSL,shoreDistanceMap,peaks} from './terrain.js';
import {naturalPalette,naturalColorsGLSL,naturalTerrainGLSL} from './natural-palette.js';
import {foothills} from './lowlands.js';
import {windVertex,createWaterStrokes,createInkSky,atmosphereFragment} from './effects.js?v=8';
import {pigmentGlazes} from './glazes.js?v=8';
import {lakeFlowGLSL,foliageGlazeGLSL,shoreWashGLSL} from './ink-flow.js';

import {createTonalBrushMaps,washFunctions} from './wash.js?v=5';
import {mountainBrushStudy} from './brush-study.js';

// Separate glaze, dry mark, contour, and paper layers. All seeds are fixed.
function brushAtlas(){
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d'),r=random(98173);
 g.fillStyle='white';g.fillRect(0,0,512,512);
 for(let i=0;i<940;i++){
  const x=r()*512,y=r()*512,len=5+r()**2*74,bend=(r()-.5)*30;
  g.strokeStyle=`rgba(0,0,0,${.13+r()*.48})`;g.lineWidth=.6+r()*2.4;g.lineCap='round';
  g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+bend,y+len*.3,x-bend*.4,y+len*.7,x+bend*.2,y+len);g.stroke();
  // A dry brush leaves adjacent broken hairs, rather than a solid digital stripe.
  for(let j=0;j<3;j++){g.strokeStyle=`rgba(0,0,0,${.025+r()*.09})`;g.lineWidth=.35+r()*.7;g.beginPath();g.moveTo(x+j*1.1,y+len*.2);g.lineTo(x+bend*.15+j*1.1,y+len*(.4+r()*.5));g.stroke();}
 }
 for(let i=0;i<1400;i++){const x=r()*512,y=r()*512;g.fillStyle=`rgba(0,0,0,${r()*.20})`;g.beginPath();g.ellipse(x,y,.5+r()*2,.4+r()*1.3,r()*3.14,0,6.28);g.fill();}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}
function foliageAtlas(){
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d'),r=random(8881);g.fillStyle='white';g.fillRect(0,0,512,512);
 for(let i=0;i<3400;i++){
  const x=r()*512,y=r()*512,a=r()*6.28,len=2+r()*7;
  g.save();g.translate(x,y);g.rotate(a);g.strokeStyle=`rgba(0,0,0,${.12+r()*.55})`;g.lineCap='round';g.lineWidth=.45+r()*1.15;
  g.beginPath();g.moveTo(-len*.45,0);g.quadraticCurveTo(0,-len*.3,len*.5,0);g.moveTo(0,0);g.lineTo(-len*.15,-len*.55);g.stroke();g.restore();
 }
 // Dense, irregular dot leaves have clear dark rims and partly open centers.
 // Mipmaps merge these deposits into the same canopy wash at long distance.
 for(let i=0;i<2200;i++){
  const x=r()*512,y=r()*512,rx=.8+r()*2.1,ry=.55+r()*1.4;
  g.strokeStyle=`rgba(0,0,0,${.28+r()*.46})`;g.lineWidth=.6+r()*.8;
  g.beginPath();g.ellipse(x,y,rx,ry,r()*3.14,.2,5.9);g.stroke();
 }
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}
function paperTexture(){
 const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d'),r=random(30067),im=g.createImageData(1024,1024);
 for(let i=0;i<1024*1024;i++){const v=220+r()*35;im.data.set([v,v,v,255],i*4);}g.putImageData(im,0,0);
 for(let i=0;i<26000;i++){const x=r()*1024,y=r()*1024;g.strokeStyle=`rgba(75,65,43,${r()*.12})`;g.lineWidth=.3+r()*.5;g.beginPath();g.moveTo(x,y);g.lineTo(x+2+r()*9,y+(r()-.5)*2);g.stroke();}
 for(let y=0;y<1024;y+=4){g.strokeStyle='rgba(50,48,24,.07)';g.lineWidth=.45;g.beginPath();g.moveTo(0,y);g.lineTo(1024,y+.2);g.stroke();}for(let x=0;x<1024;x+=3){g.strokeStyle='rgba(255,245,205,.07)';g.lineWidth=.45;g.beginPath();g.moveTo(x,0);g.lineTo(x+.2,1024);g.stroke();}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
const noise=`
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
const vertex=`
varying vec3 wp;varying vec3 wn;varying vec3 tint;varying float distanceToEye;varying vec4 plantRoot;
attribute vec3 aMineral;varying vec3 mineralField;attribute vec4 aRock;varying vec4 rockField;
${windVertex}
void main(){
 vec4 p=vec4(position,1.);vec3 n=normal;tint=vec3(1.);brushUv=uv;plantRoot=aAnchor;
 #ifdef USE_INSTANCING
 p=instanceMatrix*p;
 mat3 im=mat3(instanceMatrix);n/=vec3(dot(im[0],im[0]),dot(im[1],im[1]),dot(im[2],im[2]));n=im*n;
 #endif
 #ifdef USE_INSTANCING_COLOR
 tint=instanceColor;
 #endif
 mineralField=aMineral;rockField=aRock;restPoint=(modelMatrix*p).xyz;wn=normalize(mat3(modelMatrix)*n);wp=bendInWind(restPoint,wn);
 vec4 eye=viewMatrix*vec4(wp,1.);distanceToEye=-eye.z;gl_Position=projectionMatrix*eye;
}`;
const fragment=`
uniform vec3 paper,pigment;uniform float category,density,brushAmount,layerAmount,mistAmount,detailKind,rangeLevel,clockSeconds,waterMotion,foliageAmount,foldBrushAmount,mineralStudyAmount;uniform sampler2D atlas,foliageMap,toneLight,toneMiddle,toneDark;uniform float washAmount;
varying vec3 wp;varying vec3 wn;varying vec3 tint;varying float distanceToEye;varying vec3 restPoint;varying vec2 brushUv;varying vec3 mineralField;varying vec4 rockField;
varying vec4 plantRoot;
${noise}
${naturalColorsGLSL}
${shoreGLSL}
${lakeFlowGLSL}
${foliageGlazeGLSL}
float strokes(vec2 p){return 1.-texture2D(atlas,p).r;}
${pigmentGlazes}
${washFunctions}
${naturalTerrainGLSL}
#ifdef MOUNTAIN_BRUSH_STUDY
${mountainBrushStudy}
#endif
void main(){
 vec3 n=normalize(wn);if(!gl_FrontFacing)n=-n;
 float broad=noise(restPoint*.18),medium=noise(restPoint*.92);
 float form=1.-max(0.,dot(n,normalize(vec3(-.5,.9,.45))));
 // Broad translucent mineral glazes replace the shaded plastic appearance.
 float ink=density*(.65+.36*broad+.13*form);
 vec3 hue=pigment;
 float mark=0.;
 if(category<.5){
  // Mountain cun: long broken marks on steep faces, sparse marks on open banks.
  vec3 w=pow(abs(n),vec3(3.));w/=max(dot(w,vec3(1.)),.001);
  float a=strokes(vec2(restPoint.z*.085+restPoint.y*.017,restPoint.y*.085));
  float b=strokes(vec2(restPoint.x*.085+restPoint.y*.022,restPoint.y*.085));
  float top=strokes(restPoint.xz*.085);
  mark=(a*w.x+b*w.z+top*w.y)*(.28+.85*(1.-abs(n.y)));
  float fine=strokes(vec2(restPoint.z*.27+restPoint.y*.04,restPoint.y*.21))*w.x+strokes(vec2(restPoint.x*.27+restPoint.y*.055,restPoint.y*.21))*w.z+strokes(restPoint.xz*.27)*w.y;
  float footprint=max(length(dFdx(restPoint)),length(dFdy(restPoint)));
  mark+=fine*(1.-smoothstep(.08,.40,footprint))*(.10+.21*(1.-abs(n.y)));
  #ifdef MOUNTAIN_BRUSH_STUDY
  mark=mountainFoldBrush(mark,n);
  #endif
  float seams=noise(vec3(restPoint.x*.45+restPoint.y*.12,restPoint.y*.10,restPoint.z*.48));
  ink+=.12*form+.09*smoothstep(.5,.8,seams)*(1.-abs(n.y));
  float rel=detailKind>8.5&&detailKind<9.5?.23+broad*.55:mineralField.x;
  float wash=noise(restPoint*vec3(.18,.08,.17)),grain=noise(restPoint*vec3(.55,.15,.48));
  rel+=(wash-.5)*.16+(grain-.5)*.055;
  // The reference separates light malachite facets from blue shadowed
  // shoulders. This low-frequency painted shading follows 3D rock normals.
  float lit=smoothstep(-.55,.72,dot(n,normalize(vec3(-.72,.20,.66))));
  float face=clamp(lit*.62+(1.-smoothstep(-.45,.55,rockField.y))*.38,0.,1.);
  face=.23+.26*smoothstep(.25,.39,face+(wash-.5)*.20)+.31*smoothstep(.56,.70,face+(grain-.5)*.16);
  hue=naturalTerrain(rel,face,wash,grain,n);
  float saturation=1.+max(0.,layerAmount-1.)*.22;hue=max(vec3(.002),mix(vec3(dot(hue,vec3(.2126,.7152,.0722))),hue,saturation));
  float cleft=rockField.x*(.30+.70*noise(restPoint*vec3(.42,.15,.39)))*(1.-abs(n.y));
  hue=mix(hue,natural_cleft,cleft*.58*layerAmount);
  float distant=1.-smoothstep(-315.,-155.,restPoint.z);if(abs(restPoint.x)<85.&&restPoint.z<-135.&&restPoint.z>-210.)distant*=.12;
  float tower=max(1.-step(-.5,rockField.w),smoothstep(180.,235.,restPoint.x)*smoothstep(200.,245.,-restPoint.z));
  vec3 remoteHue=mix(natural_earth,natural_sandstone,.30+.25*rel);remoteHue=mix(remoteHue,natural_fog,tower*.32);
  hue=mix(hue,remoteHue,max(distant*.18,tower*.94));
  ink=.985;
  if(rangeLevel>.5){hue=mix(natural_leaves,natural_fog,.42+rangeLevel*.10);ink=.70/(rangeLevel*.30)*smoothstep(.04,.60,mineralField.x);}

 }else if(category<1.5){
  // Foliage: merged washes and sparse pigment dots, not outlines on every leaf.
  float clump=noise(restPoint*2.1);
  vec3 blend=abs(n);blend/=max(dot(blend,vec3(1.)),.001);
  mark=(1.-texture2D(foliageMap,restPoint.xy*.10).r)*blend.z+(1.-texture2D(foliageMap,restPoint.zy*.10).r)*blend.x+(1.-texture2D(foliageMap,restPoint.xz*.10).r)*blend.y;
  float footprint=max(length(dFdx(restPoint)),length(dFdy(restPoint)));
  float closeDetail=1.-smoothstep(.035,.16,footprint);
  float fine=(1.-texture2D(foliageMap,restPoint.xy*.43).r)*blend.z+(1.-texture2D(foliageMap,restPoint.zy*.43).r)*blend.x+(1.-texture2D(foliageMap,restPoint.xz*.43).r)*blend.y;
  mark=mix(mark,mark*.72+fine*.80,closeDetail);
  if(detailKind>1.5&&detailKind<2.5){float width=max(.014,fwidth(brushUv.x)*1.2);float vein=1.-smoothstep(width,width*2.2,abs(brushUv.x-.5));mark+=vein*.30*sin(brushUv.y*3.14159);}
  ink*=.70+.44*clump;
  float luminosity=dot(tint,vec3(.2126,.7152,.0722));ink*=.91+luminosity*.55;
  vec3 tintHue=tint/max(dot(tint,vec3(.3,.59,.11)),.025);hue*=mix(vec3(1.),tintHue,.20);
  hue=mix(hue,vec3(.075,.12,.042),broad*.12);
 }else if(category<2.5){
  float phase=brushUv.x*113.+noise(vec3(brushUv.x*7.,brushUv.y*8.,3.))*3.8;
  float groove=abs(sin(phase)),aa=min(.50,max(.035,fwidth(phase)));
  float broken=smoothstep(.28,.65,noise(restPoint*vec3(3.,.8,3.)));
  mark=strokes(vec2(restPoint.x*.65+restPoint.z*.49,restPoint.y*.12))*.75+(1.-smoothstep(.04,.14+aa,groove))*.38*broken;ink*=.9+.14*medium;
 }else if(category<3.5){
  // Architecture uses light construction ink; the actual modeled tile ridges survive.
  mark=strokes(vec2(restPoint.x*.20+restPoint.z*.11,restPoint.y*.20));
  float hewn=noise(restPoint*vec3(2.7,.21,2.4));ink*=.88+.13*form+.16*hewn;
  if(detailKind>3.5&&detailKind<4.5)mark*=.55;
 }else if(category<4.5){
  // Water stays close to unpainted silk, with quiet horizontal pigment deposits.
  vec2 flow=advectLake(restPoint.xz,clockSeconds);mark=strokes(vec2(flow.y*.18,flow.x*.034))*.11;ink=.96;
 }else{mark=strokes(vec2(restPoint.x*.2+restPoint.z*.11,restPoint.y*.2));}
 ink+=mark*brushAmount*(category<.5?.27/(1.+rangeLevel*.30):category<1.5?.62:category<3.5?.25:.34);
 ink=clamp(ink,0.,.97);
 vec3 color=mix(paper,hue,ink);
 // A second, uneven glaze is attached to surfaces, not the viewport or the clock.
 color=mix(color,color*vec3(.97,.96,.94),(.12+medium*.11)*brushAmount);
 color=layeredPigment(color,n,form,broad,medium,mark);
 if(category<.5&&rockField.w<-.5)color=mix(color,paper,.40);
 color=coloredInkWash(color,n);
 #ifdef MOUNTAIN_BRUSH_STUDY
 color=mountainMineralStudy(color,n,broad);
 #endif
 if(category>.5&&category<1.5)color=layeredFoliage(color,n);
 if(category>3.5&&category<4.5)color=mix(color,natural_horizon,smoothstep(420.,1050.,distanceToEye));
 float mist=1.-exp(-pow(max(distanceToEye-23.,0.)*mistAmount,1.55));
 // Deliberate lost edges in the distance make space through blank paper.
 float veilWeight=category>.5&&category<1.5?.62:category>2.5&&category<3.5?.75:1.;
 if(category<.5)veilWeight=mix(.35,.10,smoothstep(5.,18.,restPoint.y));
 if(category>3.5&&category<4.5)veilWeight=.28;
 if(rangeLevel>.5)veilWeight=.43+rangeLevel*.11;
 color=mix(color,paper,clamp(mist*veilWeight,0.,.88));
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}`;
const fullVertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const finish=`
uniform sampler2D colorMap,normalMap,depthMap,baseline,paperMap;uniform vec2 texel,resolution,paperResolution;
uniform float nearPlane,farPlane,mode,brushAmount,lineAmount,paperAmount,washAmount,clockSeconds,atmosphereAmount,shoreSoftness;
uniform mat4 invProjection,cameraWorld;uniform vec3 paper;
varying vec2 vUv;
${noise}
${naturalColorsGLSL}
${shoreGLSL}
float depth(vec2 uv){float d=texture2D(depthMap,uv).x;return nearPlane*farPlane/(farPlane-(farPlane-nearPlane)*d);}
vec3 worldPoint(vec2 uv){float d=texture2D(depthMap,uv).x;vec4 p=invProjection*vec4(uv*2.-1.,d*2.-1.,1.);return (cameraWorld*vec4(p.xyz/p.w,1.)).xyz;}
float inkLuma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
${shoreWashGLSL}
${atmosphereFragment}
void main(){
 if(mode<.5){vec3 original=sRGBTransferEOTF(texture2D(baseline,vUv)).rgb;gl_FragColor=linearToOutputTexel(vec4(original,1.));return;}
 float d=depth(vUv);vec3 p=worldPoint(vUv);
 vec3 core=texture2D(colorMap,vUv).rgb,smear=core*4.;
 vec4 nd=texture2D(normalMap,vUv);vec3 n=nd.rgb*2.-1.;float cat=nd.a;
 float contour=0.,crease=0.,edge2d=0.;
 for(int i=0;i<8;i++){
  float a=float(i)*.78539816;vec2 offset=vec2(cos(a),sin(a))*texel*1.12;
  float dn=depth(vUv+offset);vec3 nn=texture2D(normalMap,vUv+offset).rgb*2.-1.;
  float gap=abs(d-dn)/max(d,1.);
  // A sloping plane has a depth gradient without an occlusion. Reject that
  // gradient using its tangent plane, or low river views acquire false bands.
  float planeGap=abs(dot(worldPoint(vUv+offset)-p,n));
  float pixelScale=max(.002,d*texel.y*.8);
  float edge=smoothstep(.008,.04,gap)*smoothstep(pixelScale*1.4,pixelScale*5.,planeGap);
  contour=max(contour,edge);
  crease=max(crease,(1.-clamp(dot(normalize(n),normalize(nn)),0.,1.))*(1.-edge));
  vec3 neighbor=texture2D(colorMap,vUv+offset).rgb;
  edge2d=max(edge2d,abs(inkLuma(core)-inkLuma(neighbor)));
  // Pigment spreads a small distance; physical occlusions stop the bleed.
  smear+=mix(neighbor,core,edge);
 }
 smear/=12.;
 vec3 color=mix(core,smear,.24+.15*washAmount);
 // Small local wet-edge deposits are stopped by the depth test above.
 float poolEdge=smoothstep(.025,.12,edge2d)*(1.-contour)*.045*washAmount;
 color*=1.-poolEdge;
 float darkLine=contour*.62+smoothstep(.07,.48,crease)*.34;
 // Geometry metadata: reduce interior contour clutter in foliage and on water.
 if(cat<.16)darkLine=contour*.66+smoothstep(.12,.48,crease)*.27*(1.-abs(n.y));
 if(cat>.16&&cat<.28)darkLine=contour*.30;
 if(cat>.46&&cat<.58)darkLine*=.29;
 float breakInk=.5+.5*noise(p*vec3(2.8,1.3,2.8));
 float fade=1.-smoothstep(130.,650.,d)*.78;
 if(mode<1.5){
  vec3 original=sRGBTransferEOTF(texture2D(baseline,vUv)).rgb;
  // Deliberately simple screen-space baseline: color mapping + image edges.
  float l=inkLuma(linearToOutputTexel(vec4(original,1.)).rgb);float green=clamp((original.g-original.r)*4.+.25,0.,1.);
  vec3 pigment=mix(vec3(.23,.20,.10),vec3(.12,.22,.16),green);
  color=mix(paper,pigment,clamp((1.-l)*1.17,0.,.90));
  float edge=0.;for(int j=0;j<4;j++){float a=float(j)*1.570796;vec3 q=sRGBTransferEOTF(texture2D(baseline,vUv+vec2(cos(a),sin(a))*texel*1.2)).rgb;edge=max(edge,abs(inkLuma(linearToOutputTexel(vec4(q,1.)).rgb)-l));}
  color=mix(color,vec3(.18,.16,.09),smoothstep(.025,.16,edge)*lineAmount*.4);
 }else{
  float wetEdge=shoreWeight(p,cat);
  color=diffuseShore(color,p,d,wetEdge);
  darkLine*=1.-wetEdge*.86;
  color=mix(color,vec3(.018,.026,.012),clamp(darkLine*breakInk*lineAmount*fade,0.,.65));
  color=applyAtmosphere(color,p,d);
 }
 // The paper is the flat display medium; only this faint layer uses screen coordinates.
 float fiber=texture2D(paperMap,vUv*paperResolution/1024.).r;
 float stain=noise(vec3(vUv*vec2(6.,4.),.7));
 color*=1.+paperAmount*((fiber-.92)*.28+(stain-.5)*.055);
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}`;

const categories={rangeNear:0,rangeMiddle:0,rangeFar:0,terrain:0,rocks:0,stone:0,leaves:1,leafSmall:1,reed:1,bark:2,darkBark:2,roof:3,timber:3,timberDark:3,plaster:3,path:5,water:4,sail:5,robe:5};
const pigments={rangeNear:['#9b693d',.58],rangeMiddle:['#af7955',.50],rangeFar:['#c18d6d',.43],terrain:['#498da2',.85],rocks:['#4b9b9a',.85],stone:['#68654a',.35],leaves:[naturalPalette.leaves,.98],leafSmall:[naturalPalette.leafTips,.98],reed:['#708f60',.86],bark:[naturalPalette.bark,.90],darkBark:['#403b30',.98],roof:[naturalPalette.roof,.96],timber:[naturalPalette.timber,.96],timberDark:['#403922',.96],plaster:['#c7b99c',.90],path:['#a28d6f',.96],water:[naturalPalette.water,.98],sail:['#2e322a',.91],robe:['#6c6645',.64]};
function terrainBrushLines(paper){
 const r=random(7129),points=[],weights=[],uv=[],indices=[];let segments=0,structuralCurves=0;
 // Narrow dry-brush ribbons follow the downhill field. Their width is in scene
 // units, so a close approach reveals the same stroke instead of a new overlay.
 function ribbon(path,width,alpha){
  if(path.length<3)return;structuralCurves++;const base=points.length/3;
  for(let j=0;j<path.length;j++){
   const p=path[j],a=path[Math.max(0,j-1)],b=path[Math.min(path.length-1,j+1)],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.max(.001,Math.hypot(dx,dz)),t=j/(path.length-1),taper=.14+.86*Math.pow(Math.sin(t*Math.PI),.55);
   for(const side of [-1,1]){const x=p[0]-dz/length*width*taper*side,z=p[1]+dx/length*width*taper*side;points.push(x,terrainHeight(x,z)+.09,z);weights.push(alpha);uv.push(t,side*.5+.5);}
   if(j){const k=base+(j-1)*2;indices.push(k,k+1,k+3,k,k+3,k+2);segments++;}
  }
 }
 // Irregular downhill folds and forked companions follow the actual ridges.
 // No radial spokes or contour rings are painted around a mountain center.
 for(let i=0;i<peaks.length;i++){
  const [px,pz,h,wx,wz]=peaks[i];if(h<8)continue;
  for(let k=0;k<16;k++){
   const a=r()*Math.PI*2,rr=.12+r()*.65;let x=px+Math.cos(a)*wx*rr,z=pz+Math.sin(a)*wz*rr;
   const path=[],step=.32,steps=14+Math.floor(r()*32),phase=r()*6.28;
   for(let j=0;j<=steps;j++){
    if(terrainHeight(x,z)<3)break;path.push([x,z]);
    const dx=terrainHeight(x+.6,z)-terrainHeight(x-.6,z),dz=terrainHeight(x,z+.6)-terrainHeight(x,z-.6),norm=Math.hypot(dx,dz);if(norm<.08)break;
    const swing=Math.sin(j*.23+phase)*.14;x+=(-dx+dz*swing)/norm*step;z+=(-dz-dx*swing)/norm*step;
   }
   ribbon(path,.065+r()*.13,.65+r()*.65);
   if(k%3===0)ribbon(path.slice(Math.floor(path.length*.22)).map(([x,z],j)=>[x+.20+Math.sin(j*.21)*.11,z+.08]),.025+r()*.035,.35);
  }
 }
 for(let i=0;i<18000;i++){
  let x=-166+r()*332,z=-265+r()*350;const startY=terrainHeight(x,z);
  if(startY<4)continue;
  const length=.55+r()**.8*5.8,step=length/12,phase=r()*6.28,alpha=.30+r()*.45,width=.055+r()**1.2*.22,base=points.length/3;
  let count=0;
  for(let j=0;j<=12;j++){
   const dx=terrainHeight(x+.3,z)-terrainHeight(x-.3,z),dz=terrainHeight(x,z+.3)-terrainHeight(x,z-.3);
   const norm=Math.hypot(dx,dz);if(norm<.07)break;
   const taper=.16+.84*Math.sin(j/12*Math.PI),wx=dz/norm*width*taper,wz=-dx/norm*width*taper;
   for(const side of [-1,1]){const xx=x+wx*side,zz=z+wz*side;points.push(xx,terrainHeight(xx,zz)+.065,zz);weights.push(alpha);uv.push(j/12,side*.5+.5);}
   if(j>0){const k=base+(j-1)*2;indices.push(k,k+1,k+3,k,k+3,k+2);segments++;}
   count++;const swing=Math.sin(j*.6+phase)*.22;
   x+=(-dx+dz*swing)/norm*step;z+=(-dz-dx*swing)/norm*step;
  }
 }
 // The new foreground uses the same surface-following dry ink, with lighter,
 // shorter strokes on the rounded hills. Nothing is attached to the screen.
 const rLow=random(71427);
 for(const f of foothills)for(let k=0;k<86;k++){
  const a=rLow()*Math.PI*2,rr=.2+rLow()*.95;let x=f.x+Math.cos(a)*f.rx*rr,z=f.z+Math.sin(a)*f.rz*rr;
  const path=[],phase=rLow()*6.28;
  for(let j=0;j<15;j++){
   if(terrainHeight(x,z)<1.4)break;
   const dx=terrainHeight(x+.4,z)-terrainHeight(x-.4,z),dz=terrainHeight(x,z+.4)-terrainHeight(x,z-.4),norm=Math.hypot(dx,dz);if(norm<.035)break;
   path.push([x,z]);const swing=Math.sin(j*.27+phase)*.35;
   x+=(-dx+dz*swing)/norm*.38;z+=(-dz-dx*swing)/norm*.38;
  }
  ribbon(path,.035+rLow()*.08,.19+rLow()*.26);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setAttribute('weight',new THREE.Float32BufferAttribute(weights,1));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);
 const mat=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,uniforms:{amount:{value:1},mist:{value:.006}},vertexShader:'attribute float weight;varying float w,d;varying vec2 brush;void main(){w=weight;brush=uv;vec4 eye=modelViewMatrix*vec4(position,1.);d=-eye.z;gl_Position=projectionMatrix*eye;}',fragmentShader:`uniform float amount,mist;varying float w,d;varying vec2 brush;void main(){float fade=exp(-pow(max(d-23.,0.)*mist,1.55));float edge=1.-smoothstep(.54,1.,abs(brush.y*2.-1.));float hairs=.63+.22*sin(brush.y*29.+sin(brush.x*12.)*.8);float dry=.55+.45*smoothstep(-.7,.6,sin(brush.x*47.+brush.y*11.));float taper=pow(max(0.,sin(brush.x*3.14159)),.35);gl_FragColor=vec4(.015,.035,.020,w*amount*fade*edge*hairs*dry*taper);
 #include <colorspace_fragment>
 }`});
 const lines=new THREE.Mesh(geo,mat);lines.name='Surface-following mountain dry-brush ribbons';lines.userData.strokeSegments=segments;lines.userData.structuralCurves=structuralCurves;lines.visible=false;return lines;
}
export function createInkLab(valley){
 const {renderer,model,scene,camera}=valley;
 const settings={mode:'ink',foldBrush:0,mineralStudy:0,brush:1,layers:1,wash:1,foliage:.9,shore:1,lines:1.05,ranges:true,paper:1,mist:.0013,wind:.55,water:.8,atmosphere:.90,motion:true,seconds:0};
 const paper=new THREE.Color(naturalPalette.paper),atlas=brushAtlas(),foliageMap=foliageAtlas(),paperMap=paperTexture(),tonalBrush=createTonalBrushMaps(),inkMaterials=new Map(),dataMaterials=new Map();
 for(const [name,base] of Object.entries(model.materials)){
  const cat=categories[name],pigment=pigments[name],vegetation=['leaves','leafSmall','reed','bark','darkBark'].includes(name)?1:0,detailKind={leaves:1,leafSmall:2,bark:3,darkBark:3,roof:4,timber:5,timberDark:5,plaster:6,water:7,reed:8,rocks:9}[name]||0;
  const mat=new THREE.ShaderMaterial({name:'Ink brush · '+name,side:base.side,uniforms:{shoreDistanceMap:{value:shoreDistanceMap},paper:{value:paper},pigment:{value:new THREE.Color(pigment[0])},category:{value:cat},rangeLevel:{value:({rangeNear:1,rangeMiddle:2,rangeFar:3}[name]||0)},density:{value:pigment[1]},brushAmount:{value:1},layerAmount:{value:1},washAmount:{value:1},toneLight:{value:tonalBrush.maps[0]},toneMiddle:{value:tonalBrush.maps[1]},toneDark:{value:tonalBrush.maps[2]},mistAmount:{value:settings.mist},clockSeconds:{value:0},windStrength:{value:settings.wind},waterMotion:{value:settings.water},foliageAmount:{value:settings.foliage},foldBrushAmount:{value:0},mineralStudyAmount:{value:0},vegetation:{value:vegetation},detailKind:{value:detailKind},atlas:{value:atlas},foliageMap:{value:foliageMap}},vertexShader:vertex,fragmentShader:fragment,toneMapped:false});
  mat.defaultAttributeValues.aAnchor=[0,0,0,0];mat.defaultAttributeValues.aMineral=[0,0,0];mat.defaultAttributeValues.aRock=[0,0,0,0];inkMaterials.set(base,mat);
  const data=new THREE.ShaderMaterial({side:base.side,uniforms:{category:{value:cat},diagnosticRest:{value:0},clockSeconds:{value:0},windStrength:{value:settings.wind},vegetation:{value:vegetation}},vertexShader:vertex,fragmentShader:'varying vec3 wn;varying vec3 restPoint;uniform float category,diagnosticRest;void main(){if(diagnosticRest>.5){gl_FragColor=vec4(restPoint,1.);return;}vec3 n=normalize(wn);if(!gl_FrontFacing)n=-n;gl_FragColor=vec4(n*.5+.5,(category+1.)/10.);}',toneMapped:false});
  data.defaultAttributeValues.aAnchor=[0,0,0,0];data.defaultAttributeValues.aMineral=[0,0,0];data.defaultAttributeValues.aRock=[0,0,0,0];dataMaterials.set(base,data);
 }
 function target(withDepth=false){const t=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});if(withDepth)t.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);t.samples=4;return t;}
 const baseTarget=target(),inkTarget=target(),dataTarget=target(true);baseTarget.samples=0;
 let baseFrame=new THREE.FramebufferTexture(1,1);baseFrame.colorSpace=THREE.NoColorSpace;baseFrame.minFilter=baseFrame.magFilter=THREE.LinearFilter;
 const post=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{shoreDistanceMap:{value:shoreDistanceMap},colorMap:{value:inkTarget.texture},normalMap:{value:dataTarget.texture},depthMap:{value:dataTarget.depthTexture},baseline:{value:baseFrame},paperMap:{value:paperMap},texel:{value:new THREE.Vector2(1,1)},resolution:{value:new THREE.Vector2(1,1)},paperResolution:{value:new THREE.Vector2(1,1)},toneMappingExposure:{value:renderer.toneMappingExposure},nearPlane:{value:camera.near},farPlane:{value:camera.far},mode:{value:2},brushAmount:{value:1},lineAmount:{value:1},paperAmount:{value:1},washAmount:{value:1},clockSeconds:{value:0},atmosphereAmount:{value:settings.atmosphere},shoreSoftness:{value:settings.shore},invProjection:{value:camera.projectionMatrixInverse},cameraWorld:{value:camera.matrixWorld},paper:{value:paper}},vertexShader:fullVertex,fragmentShader:finish});
 const screen=new THREE.Scene(),screenCam=new THREE.Camera();screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),post));
 const sky=scene.getObjectByName('Distant atmospheric sky'),savedBackground=scene.background,savedFog=scene.fog;
 const mountainStrokes=terrainBrushLines(paper),waterStrokes=createWaterStrokes(atlas),inkSky=createInkSky(paper,noise);scene.add(mountainStrokes,waterStrokes,inkSky);
 const meshes=[];model.root.traverse(o=>{if(o.isMesh)meshes.push(o);});let size=new THREE.Vector2(),busy=false,lastStats={},studyEnabled=false;
 function restore(){mountainStrokes.visible=waterStrokes.visible=inkSky.visible=false;for(const o of meshes)o.material=model.saved.get(o);sky.visible=true;scene.background=savedBackground;scene.fog=savedFog;renderer.setRenderTarget(null);}
 // The old material reference is generated only for explicit diagnostics or
 // the research filter. Normal ink rendering never draws or copies it.
 function captureBaseline(){
  renderer.getDrawingBufferSize(size);const w=size.x,h=size.y;
  if(baseFrame.image.width!==w||baseFrame.image.height!==h){baseFrame.dispose();baseFrame=new THREE.FramebufferTexture(w,h);baseFrame.colorSpace=THREE.NoColorSpace;baseFrame.minFilter=baseFrame.magFilter=THREE.LinearFilter;post.uniforms.baseline.value=baseFrame;}
  renderer.setRenderTarget(null);renderer.render(scene,camera);renderer.copyFramebufferToTexture(baseFrame);
 }
 function render(){
  if(busy)return;busy=true;model.backgroundMountains.group.visible=settings.ranges;
  try{
   const study=settings.foldBrush>0||settings.mineralStudy>0;
   if(study!==studyEnabled){for(const mat of inkMaterials.values()){mat.defines??={};if(study)mat.defines.MOUNTAIN_BRUSH_STUDY=1;else delete mat.defines.MOUNTAIN_BRUSH_STUDY;mat.needsUpdate=true;}studyEnabled=study;}
   renderer.getDrawingBufferSize(size);const w=size.x,h=size.y;
   if(inkTarget.width!==w||inkTarget.height!==h){for(const t of [inkTarget,dataTarget])t.setSize(w,h);
    post.uniforms.texel.value.set(1/w,1/h);post.uniforms.resolution.value.set(w,h);}
   const reference=valley.renderQuality?.metadata();post.uniforms.paperResolution.value.set(reference?.referenceWidth??w,reference?.referenceHeight??h);
   camera.updateMatrixWorld();
   if(settings.mode==='original'){renderer.render(scene,camera);lastStats={width:w,height:h,passes:1};return;}
   if(settings.mode==='filter')captureBaseline();
   sky.visible=false;inkSky.visible=true;scene.fog=null;scene.background=paper;
   for(const o of meshes){const mat=inkMaterials.get(model.saved.get(o));if(mat){mat.uniforms.foldBrushAmount.value=settings.foldBrush;mat.uniforms.mineralStudyAmount.value=settings.mineralStudy;mat.uniforms.brushAmount.value=settings.brush;mat.uniforms.layerAmount.value=settings.layers;mat.uniforms.washAmount.value=settings.wash;mat.uniforms.mistAmount.value=settings.mist;mat.uniforms.clockSeconds.value=settings.seconds;mat.uniforms.windStrength.value=settings.wind;mat.uniforms.waterMotion.value=settings.water;mat.uniforms.foliageAmount.value=settings.foliage;o.material=mat;}}
   mountainStrokes.visible=true;mountainStrokes.material.uniforms.amount.value=settings.brush*(.55+.45*settings.lines);mountainStrokes.material.uniforms.mist.value=settings.mist;
   waterStrokes.visible=true;waterStrokes.material.uniforms.clockSeconds.value=settings.seconds;waterStrokes.material.uniforms.waterMotion.value=settings.water;waterStrokes.material.uniforms.brushAmount.value=settings.brush;
   inkSky.material.uniforms.clockSeconds.value=settings.seconds;inkSky.material.uniforms.atmosphereAmount.value=settings.atmosphere;
   renderer.setRenderTarget(inkTarget);renderer.render(scene,camera);mountainStrokes.visible=waterStrokes.visible=inkSky.visible=false;
   for(const o of meshes){const mat=dataMaterials.get(model.saved.get(o));if(mat){mat.uniforms.clockSeconds.value=settings.seconds;mat.uniforms.windStrength.value=settings.wind;o.material=mat;}}
   scene.background=new THREE.Color(.5,.5,.5);renderer.setRenderTarget(dataTarget);renderer.render(scene,camera);
   restore();
   Object.assign(post.uniforms.mode,{value:settings.mode==='filter'?1:2});post.uniforms.lineAmount.value=settings.lines;post.uniforms.paperAmount.value=settings.paper;post.uniforms.washAmount.value=settings.wash;post.uniforms.clockSeconds.value=settings.seconds;post.uniforms.atmosphereAmount.value=settings.atmosphere;post.uniforms.shoreSoftness.value=settings.shore;
   renderer.render(screen,screenCam);lastStats={width:w,height:h,passes:settings.mode==='filter'?4:3,brushMaps:5,paperMaps:1,mountainStrokeSegments:mountainStrokes.userData.strokeSegments,structuralFoldCurves:mountainStrokes.userData.structuralCurves};
  }finally{restore();busy=false;}
 }
 const diagnosticTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.FloatType,depthBuffer:false});
 const diagnostic=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:post.uniforms,vertexShader:fullVertex,fragmentShader:`uniform sampler2D depthMap;uniform mat4 invProjection,cameraWorld;varying vec2 vUv;void main(){float d=texture2D(depthMap,vUv).x;vec4 p=invProjection*vec4(vUv*2.-1.,d*2.-1.,1.);vec3 world=(cameraWorld*vec4(p.xyz/p.w,1.)).xyz;gl_FragColor=vec4(world,d<.999999?1.:0.);}`});
 const restTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.FloatType,depthBuffer:true});
 function readback(includeRest=false){
  const w=dataTarget.width,h=dataTarget.height;diagnosticTarget.setSize(w,h);
  const mesh=screen.children[0],saved=mesh.material;mesh.material=diagnostic;renderer.setRenderTarget(diagnosticTarget);renderer.render(screen,screenCam);mesh.material=saved;
  const world=new Float32Array(w*h*4);renderer.readRenderTargetPixels(diagnosticTarget,0,0,w,h,world);
  function readColor(t){const half=new Uint16Array(w*h*4),out=new Float32Array(w*h*4);renderer.readRenderTargetPixels(t,0,0,w,h,half);for(let i=0;i<half.length;i++)out[i]=THREE.DataUtils.fromHalfFloat(half[i]);return out;}
  const pigment=readColor(inkTarget);
  captureBaseline();baseTarget.setSize(w,h);
  const oldMode=post.uniforms.mode.value;post.uniforms.mode.value=0;renderer.setRenderTarget(baseTarget);renderer.render(screen,screenCam);post.uniforms.mode.value=oldMode;
  const baseline=readColor(baseTarget);renderer.setRenderTarget(null);
  let rest=null;
  if(includeRest){
   restTarget.setSize(w,h);const bg=scene.background,clearColor=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();
   try{
    sky.visible=false;scene.background=null;scene.fog=null;renderer.setClearColor(0,0);
    for(const o of meshes){const m=dataMaterials.get(model.saved.get(o));if(m){m.uniforms.diagnosticRest.value=1;o.material=m;}}
    renderer.setRenderTarget(restTarget);renderer.render(scene,camera);rest=new Float32Array(w*h*4);renderer.readRenderTargetPixels(restTarget,0,0,w,h,rest);
   }finally{for(const m of dataMaterials.values())m.uniforms.diagnosticRest.value=0;renderer.setClearColor(clearColor,alpha);scene.background=bg;restore();}
  }
  renderer.setRenderTarget(null);renderer.render(screen,screenCam);
  return{rest,width:w,height:h,world,pigment,baseline,viewProjection:new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),camera:camera.position.clone(),fov:camera.fov};
 }
 valley.setRenderEffect(render);
 return {settings,render,readback,inkMaterials,dataMaterials,dataTarget,inkTarget,baseTarget,post,paper,atlas,tonalBrush,
  set(next){Object.assign(settings,next);valley.render();},
  setTime(seconds){settings.seconds=seconds;},
  frame(t,{mode='ink',viewName=null,width=1280,height=800,seconds=t*20,clayMode=false,...rest}={}){Object.assign(settings,{mode,seconds},rest);return valley.frame(t,{viewName,width,height,clayMode});},
  metadata(){return{backgroundMountainLayers:model.stats.backgroundMountainLayers,backgroundRangeDepths:model.backgroundMountains.records.map(r=>r.centerZ),settings:{...settings},...lastStats,foliageGlazes:['cool jade','warm olive','young leaf green'],shoreInk:{worldBand:5,maximumBlurPixels:6.5,excluded:'trees, bark, architecture and elevated terrain'},pigmentLayers:['ochre earth','azurite blue crests','malachite green faces','jade shallows','umber architecture','olive lake'],tonalBrush:{levels:tonalBrush.levels,coverage:tonalBrush.coverage,seed:tonalBrush.seed,nested:true},method:'Nested tonal brush maps + painted wash shadows + fixed world-space pigment and brush atlas + semantic surface shaders + depth/normal contours + flat paper glaze',seed:98173,paperSeed:30067,textureCoordinateSpace:'undeformed world, with nested mipmapped detail',usesClock:true,windAnchoredPigment:true,fog:{coordinateSpace:'world',driftUnitsPerSecond:[.72,0,.16],heightLayers:[3.5,12,24],nearLimitZ:-75},revision:'blue-green-10-composition',sourceImageProjection:false};}
 };
}
