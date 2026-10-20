import * as THREE from 'three';

// Display-space swatches; shaders receive linear values. Keep paper warmth in
// the support and haze, instead of tinting the entire landscape yellow-green.
export const naturalPalette={
 paper:'#c6b48c',earth:'#94805b',sandstone:'#b3a077',sage:'#70a786',
 rock:'#529eab',slate:'#197ca7',cleft:'#2e5148',water:'#7b8566',
 leaves:'#3d5544',leafTips:'#5f7350',bark:'#665443',timber:'#80684f',
 roof:'#424d48',horizon:'#c8b68d',sky:'#a6aa94',fog:'#b1b397',
};
const glsl=hex=>{const c=new THREE.Color(hex);return `vec3(${[c.r,c.g,c.b].map(v=>v.toFixed(5)).join(',')})`;};
export const naturalColorsGLSL=Object.entries(naturalPalette).map(([key,color])=>`const vec3 natural_${key}=${glsl(color)};`).join('\n');

export const naturalTerrainGLSL=`
vec3 naturalTerrain(float rel,float face,float wash,float grain,vec3 n){
 vec3 earth=mix(natural_earth,natural_sandstone,.28+.48*wash);
 vec3 stone=mix(natural_slate,natural_rock,.12+.42*face);
 // Azurite crests, malachite faces and warm lower toes are the painting's
 // defining color structure. Natural warmth belongs in earth and atmosphere.
 float shelf=smoothstep(.46,.90,n.y);
 float growth=smoothstep(.12,.48,rel)*(1.-smoothstep(.85,1.08,rel));
 vec3 faceColor=mix(earth,natural_sage,growth*(.80+.18*shelf));
 float crest=smoothstep(.52,.87,rel);
 vec3 hue=mix(faceColor,stone,crest*(.98-.10*shelf));
 hue*=.92+.14*wash+.04*(grain-.5);
 return mix(earth*.88,hue,clamp(layerAmount,0.,1.));
}
`;
