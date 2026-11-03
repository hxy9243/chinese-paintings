/** Shared world-space paper edge for surfaces, strokes, crowds, and water. */
export const PAINTING_BOUNDS={centerS:-10,halfS:44,halfD:23,feather:5.5} as const;
export const paintingBoundaryShader=`
float paintingEdgeAlpha(vec3 world){
 vec2 sheet=vec2(world.x*.64278761+world.z*.76604444,-world.x*.76604444+world.z*.64278761);
 vec2 outside=abs(sheet-vec2(-10.,0.))-vec2(44.,23.);
 float distance=max(outside.x,outside.y);
 float absorption=1.+.09*sin(sheet.x*1.31+sin(sheet.y*.71))+.06*sin(sheet.y*1.17+sheet.x*.43);
 return 1.-smoothstep(0.,5.5,max(distance,0.)*absorption);
}`;
export function paintingEdgeAlpha(s:number,d:number){
 const distance=Math.max(Math.abs(s+10)-44,Math.abs(d)-23,0);
 const absorption=1+.09*Math.sin(s*1.31+Math.sin(d*.71))+.06*Math.sin(d*1.17+s*.43);
 const t=Math.min(1,Math.max(0,distance*absorption/5.5));
 return 1-t*t*(3-2*t);
}
