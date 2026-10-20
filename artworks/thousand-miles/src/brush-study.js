// Optional appearance study. The ridge field was generated with the terrain;
// its signed cross-ridge coordinate follows the same front and back slopes.
// No new geometry, per-frame stroke generation, or extra render pass is used.
export const mountainBrushStudy=`
float mountainFoldBrush(float original,vec3 n){
 if(foldBrushAmount<.001||rockField.w<.5||rangeLevel>.5||detailKind>.5)return original;
 vec2 alongFold=vec2(restPoint.x*.070+rockField.z*3.7+rockField.y*.28,rockField.y*2.8);
 float footprint=max(length(dFdx(alongFold)),length(dFdy(alongFold)));
 float close=1.-smoothstep(.012,.055,footprint);
 float broadStroke=strokes(alongFold),fineStroke=strokes(alongFold*2.3+vec2(rockField.z,0.));
 float steep=1.-abs(n.y);
 float directed=(broadStroke*.86+fineStroke*.24*close)*(.30+.72*steep);
 return mix(original,directed,foldBrushAmount*.86);
}
vec3 mountainMineralStudy(vec3 color,vec3 n,float broad){
 if(mineralStudyAmount<.001||category>.5||rangeLevel>.5||detailKind>.5||rockField.w<.5)return color;
 float rel=mineralField.x,light=smoothstep(-.35,.80,dot(n,normalize(vec3(-.72,.20,.66))));
 float green=smoothstep(.13,.37,rel)*(1.-smoothstep(.64,.88,rel));
 float blue=smoothstep(.64,.92,rel),earth=1.-smoothstep(.15,.40,rel);
 vec3 malachite=mix(vec3(.065,.16,.065),vec3(.21,.38,.20),light);
 vec3 azurite=mix(vec3(.018,.10,.23),vec3(.032,.25,.45),.30+light*.70);
 vec3 ochre=vec3(.26,.175,.065)*(.90+broad*.20);
 vec3 painted=mix(color,ochre,earth*.13);
 painted=mix(painted,malachite,green*(.20+.18*light));
 painted=mix(painted,azurite,blue*.33);
 // Mineral glaze lets more underdrawing show in the carved clefts.
 painted=mix(painted,color,clamp(rockField.x*.60,0.,.55));
 return mix(color,painted,mineralStudyAmount*clamp(layerAmount,0.,1.));
}
`;
