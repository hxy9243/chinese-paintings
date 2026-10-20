// Shared flow and wet-edge treatment. Pigment is evaluated in rest/world
// coordinates; the clock only carries the water, never reseeds the brush.
export const lakeFlowGLSL=`
vec2 advectLake(vec2 p,float seconds){
 float t=seconds*waterMotion;
 return p-vec2(t*.11+.48*sin(p.y*.045-t*.24),t*.48+.38*sin(p.x*.033-t*.19));
}
`;
export const foliageGlazeGLSL=`
vec3 layeredFoliage(vec3 color,vec3 n){
 if(plantRoot.w<1.5)return color;
 float family=hash(vec3(plantRoot.x*.19,plantRoot.z*.19,7.1));
 float grove=noise(vec3(plantRoot.x*.038,0.,plantRoot.z*.038));
 float level=clamp((restPoint.y-plantRoot.y)/plantRoot.w,0.,1.1);
 float wash=noise(restPoint*vec3(.73,.42,.66));
 vec3 jade=vec3(.055,.105,.071),olive=vec3(.112,.135,.070),young=vec3(.175,.225,.125);
 vec3 body=mix(jade,olive,smoothstep(.26,.78,family*.72+grove*.28));
 float lit=smoothstep(-.5,.8,dot(n,normalize(vec3(-.6,.7,.5))));
 body=mix(body,young,smoothstep(.53,1.05,level)*(.22+.35*lit));
 body=mix(vec3(.023,.060,.035),body,.58+.42*smoothstep(.28,.9,level));
 body*=.88+.22*wash;
 return mix(color,body,foliageAmount*(.28+.12*wash));
}
`;
export const shoreWashGLSL=`
// Diffusion only joins low terrain/stone and water. Timber, roofs, trees and
// distant silhouettes are excluded by category, height and world separation.
float lowShoreCategory(float c){return max(1.-step(.16,c),step(.46,c)*(1.-step(.56,c)));}
float shoreWeight(vec3 p,float cat){
 float bank=abs(landDistance(p.xz));
 return lowShoreCategory(cat)*(1.-smoothstep(.7,2.2,abs(p.y)))*(1.-smoothstep(1.4,5.,bank))*shoreSoftness;
}
vec3 diffuseShore(vec3 color,vec3 p,float d,float weight){
 if(weight<.001)return color;
 vec3 sum=color;float total=1.;
 float radius=clamp(.40*resolution.y/max(d,1.),.9,6.5);
 for(int k=0;k<12;k++){
  float angle=float(k)*2.39996323;float r=radius*sqrt((float(k)+.5)/12.);
  vec2 q=vUv+vec2(cos(angle),sin(angle))*texel*r;
  vec4 nd=texture2D(normalMap,q);vec3 world=worldPoint(q);
  float valid=lowShoreCategory(nd.a)*(1.-smoothstep(1.1,2.8,abs(world.y)))*(1.-smoothstep(.8,2.6,length(world-p)));
  float w=valid*exp(-r*r/(radius*radius));
  sum+=texture2D(colorMap,q).rgb*w;total+=w;
 }
 vec3 softened=sum/total;
 float wet=noise(p*vec3(1.3,.2,1.3));
 return mix(color,softened,weight*.92)* (1.-weight*.028*wet);
}
`;
