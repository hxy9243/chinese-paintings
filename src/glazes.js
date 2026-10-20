export const pigmentGlazes=`
vec3 glaze(vec3 color,vec3 pigment,float amount){return mix(color,pigment,clamp(amount*layerAmount,0.,.65));}
vec3 layeredPigment(vec3 color,vec3 n,float form,float broad,float medium,float mark){
 vec3 p=restPoint;float pool=noise(p*.65+vec3(4.,8.,2.));
 if(category<.5){
  float rel=detailKind>8.5&&detailKind<9.5?.20+broad*.55:mineralField.x+mineralField.z*.22;
  if(rangeLevel>.5){color=glaze(color,natural_rock,.08);return color;}
  if(p.x>210.&&p.z< -220.)return mix(color*(.83+.17*smoothstep(-.5,.7,n.x*.7+n.z*.5)),paper,.12);
  float light=smoothstep(-.45,.75,dot(n,normalize(vec3(-.72,.20,.66))));
  float rough=noise(p*vec3(.42,.17,.36));
  float paintedShade=.75+.12*smoothstep(.27,.40,light+(rough-.5)*.35)+.13*smoothstep(.62,.74,light+(pool-.5)*.28);
  color*=mix(mix(.58,1.06,light),paintedShade,clamp(washAmount,0.,1.));
  color=glaze(color,natural_sage,smoothstep(.24,.60,rel)*(1.-smoothstep(.72,.95,rel))*light*pool*.13);
  color=glaze(color,natural_sandstone,(1.-smoothstep(.18,.49,rel))*medium*.24);
  float earthBreak=smoothstep(.54,.76,noise(p*vec3(.16,.095,.19)+vec3(8.,3.,2.)))*smoothstep(.26,.51,rel)*(1.-smoothstep(.68,.86,rel));
  color=glaze(color,natural_earth,earthBreak*.28);
  float coarse=noise(p*vec3(.92,.44,.86)),deposit=smoothstep(.64,.82,coarse)*smoothstep(.46,.70,noise(p*.18));
  float footprint=max(length(dFdx(p)),length(dFdy(p)));deposit*=1.-smoothstep(.35,1.0,footprint);
  color=glaze(color,vec3(.010,.040,.020),deposit*brushAmount*.42);
  float rimMoss=smoothstep(.65,.82,noise(p*3.7))*smoothstep(.53,.72,noise(p*.29))*smoothstep(.64,.84,rel)*(1.-smoothstep(.91,1.02,rel));
  color=glaze(color,vec3(.009,.032,.016),rimMoss*brushAmount*.30*(1.-smoothstep(.15,.4,footprint)));
  // Green shelves remain separate from blue crowns; broad wash below fine grass.
  float meadow=(1.-smoothstep(3.,11.,p.y))*smoothstep(.60,.88,n.y)*smoothstep(.32,.61,noise(p*vec3(.12,.06,.15)));
  float ledge=smoothstep(4.,9.,p.y)*(1.-smoothstep(20.,29.,p.y))*smoothstep(.57,.87,n.y)*smoothstep(.45,.68,noise(p*.31));
  color=glaze(color,natural_sage,meadow*.58+ledge*.38);
  float lowWash=(1.-smoothstep(2.,9.,p.y))*smoothstep(.38,.72,noise(p*vec3(.13,.07,.14)));
  color=glaze(color,natural_leaves,lowWash*.26);
  float pooled=smoothstep(.43,.76,noise(p*vec3(.29,.085,.24)+vec3(3.,6.,9.)))*(1.-abs(n.y))*smoothstep(.19,.49,rel);
  color=glaze(color,vec3(.007,.018,.012),pooled*(.28+.30*(1.-light)));
  float broken=smoothstep(.35,.75,rough);
  color=glaze(color,vec3(.005,.022,.017),mark*brushAmount*(.55+.35*broken));
  color=glaze(color,natural_slate,smoothstep(.65,.86,pool)*smoothstep(.43,.79,rel)*.23);

 }else if(category<1.5){
  color=glaze(color,natural_leafTips,broad*.15);color=glaze(color,vec3(.024,.060,.030),mark*brushAmount*.34);
 }else if(category<2.5){color=glaze(color,vec3(.034,.034,.012),mark*brushAmount*.35);
 }else if(category<3.5){color=glaze(color,vec3(.031,.030,.014),mark*brushAmount*.20);color=glaze(color,natural_earth,broad*.05);
 }else if(category<4.5){
  vec2 flow=advectLake(p.xz,clockSeconds);
  float bank=1.-smoothstep(1.,16.,abs(landDistance(p.xz)));
  float jade=noise(vec3(flow.x*.027+sin(flow.y*.046)*.32,0.,flow.y*.10+sin(flow.x*.032)*.22));
  float stripe=smoothstep(.61,.77,jade)*(1.-smoothstep(.77,.86,jade));
  color=glaze(color,natural_sage,stripe*.08+smoothstep(.69,.98,bank)*pool*.12);
  color=glaze(color,natural_slate,mark*brushAmount*.12);
 }
 return color;
}
`;
