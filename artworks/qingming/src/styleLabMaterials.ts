import * as THREE from 'three';
export type Style='baseline'|'fine'|'ink'|'mineral';
/** Local coordinates: marks remain on the object, never regenerated per frame. */
export function makeStudyMaterial(style:Style,family:string,source:THREE.ShaderMaterial,line:boolean){
 const arch=family==='architecture',tree=family==='tree',water=family==='water';
 const pigment:THREE.Color=source.uniforms?.pigment?.value?.clone()??new THREE.Color(0x524a3d);
 if(style==='ink'){const lum=pigment.r*.2126+pigment.g*.7152+pigment.b*.0722;pigment.setRGB(lum*.8,lum*.82,lum*.79);}
 if(style==='mineral'&&!arch&&!tree)pigment.set(water?0xa2b4a2:family==='bank'?0x357a78:0x738d61);
 if(style==='fine')pigment.lerp(new THREE.Color(0xe9dfc7),arch?.10:.22);
 return new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:line,depthWrite:!line,uniforms:{pigment:{value:pigment},markAmount:{value:1},ink:{value:new THREE.Color(style==='ink'?0x323936:0x514a3d)}},
 vertexShader:`varying vec3 p;varying vec3 n;void main(){p=position;n=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 p;varying vec3 n;uniform vec3 pigment;uniform vec3 ink;uniform float markAmount;
 float wave(float x){float w=max(fwidth(x),.02);return 1.-smoothstep(.08,.08+w,abs(sin(x)));}
 void main(){vec3 paper=vec3(.82,.77,.65);float broad=.5+.5*sin(p.x*2.7+p.y*.8+sin(p.z*1.9));
 // Directional contour-adjacent marks: vertical bark, slope-aligned bank, quiet water.
 float coord=${tree?'p.y*30.+sin(p.x*18.)*1.4':water?'p.z*19.+sin(p.x*2.)*.8':'p.x*17.+p.y*26.+sin(p.z*3.)'};
 float mark=wave(coord)*markAmount;float cluster=smoothstep(.45,.8,broad);
 ${line?`float alpha=${arch?'.67':style==='ink'?'.82':'.56'};${!arch&&style==='ink'?'alpha*=.4+.6*smoothstep(.25,.55,.5+.5*sin(p.x*43.+p.y*17.+p.z*11.));':''}gl_FragColor=vec4(ink,alpha);`:
 `float light=.94+.06*max(0.,dot(normalize(n),normalize(vec3(-.6,1.,.8))));vec3 color=pigment*light;
 color=mix(color,paper,${style==='ink'?'.20':'.08'}+broad*.035);
 ${!arch?`color=mix(color,ink,mark*cluster*${water?'.04':style==='ink'?'.29':style==='mineral'?'.16':'.045'});`:''}
 gl_FragColor=vec4(color,1.);`}
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
}
