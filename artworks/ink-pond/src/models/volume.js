import * as THREE from 'three';

// Longitudinal X, dorsal Y, bilateral Z. Six fitted plates follow one tapering
// centerline. Dimensions interpret the references, not species measurements.
export const SPINE = [[35,0,0],[52,-1,0],[69,-6,0],[85,-15,0],[100,-25,0],[114,-32,0],[132,-34,0]];
export const BODY_FORMS = [
  {name:'carapace',start:[-53,0,0],end:[37,0,0],radius:[18,45,18],head:true,front:.55,back:.84},
  ...SPINE.slice(0,-1).map((start,i)=>({name:`abdomen-${i+1}`,start,end:SPINE[i+1],radius:[16.5-i*1.65,12,16-i*1.6],front:1,back:.91,segment:i+1})),
];
export const TAIL_FORMS = [-1,-.5,0,.5,1].map((side,i)=>({
  name:i===2?'telson':'uropod',start:[130,-34,side*2],end:[159-Math.abs(side)*8,-34-Math.abs(side)*2,side*27],
  radius:[i===2?2.7:2.1,16,i===2?4.3:6.8],leaf:true,side,
}));

export function shellGeometry(form,pivot=[0,0,0],seed=0,width=48,height=26){
  const positions=[],uv=[],indices=[];
  const a=new THREE.Vector3(...form.start),b=new THREE.Vector3(...form.end),tangent=b.clone().sub(a).normalize();
  const dorsal=new THREE.Vector3(-tangent.y,tangent.x,0).normalize(),lateral=tangent.clone().cross(dorsal).normalize();
  for(let i=0;i<=height;i++){
    const t=i/height,center=a.clone().lerp(b,t);
    let radius=form.head?.55+.49*Math.sin(Math.PI*t*.82):form.leaf?Math.pow(Math.sin(Math.PI*t),.65):form.front*(1-t)+form.back*t+.025*Math.sin(t*Math.PI);
    if(!form.leaf)radius*=Math.min(1,t*height,(1-t)*height);
    if(form.segment)center.addScaledVector(tangent,(t-.5)*5.5);
    for(let j=0;j<=width;j++){
      const theta=j/width*Math.PI*2,c=Math.cos(theta),s=Math.sin(theta),ventral=c<0?.74:1;
      const pleura=!form.head&&!form.leaf?1+.10*Math.max(0,-c):1,ripple=1+.009*Math.sin(t*15+theta*3+seed);
      const point=center.clone().addScaledVector(dorsal,c*form.radius[0]*radius*ventral*ripple).addScaledVector(lateral,s*form.radius[2]*radius*pleura*ripple);
      positions.push(point.x-pivot[0],point.y-pivot[1],point.z-(pivot[2]??0));uv.push(t,j/width);
      if(i<height&&j<width){const v=i*(width+1)+j,next=v+width+1;indices.push(v,v+1,next,v+1,next+1,next);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.userData={closedVolume:true,radius:[...form.radius],anatomy:form.name,paintLattice:{columns:width+1,rows:height+1}};return geometry;
}

export function shellInkMaterial(library,form,kind,seed){
  const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,
    uniforms:{pigment:{value:library.texture(form.head?'head':form.leaf?'tail':'abdomen',kind,seed)},formOnly:{value:0},washStrength:{value:.45}},
    vertexShader:`varying vec2 vUv;varying vec3 vNormal;void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform sampler2D pigment;uniform float formOnly;uniform float washStrength;varying vec2 vUv;varying vec3 vNormal;
    void main(){vec3 n=normalize(vNormal);float lit=.46+.54*abs(dot(n,normalize(vec3(-.35,.6,1.))));
    if(formOnly>.5){gl_FragColor=vec4(vec3(.54,.59,.55)*lit,1.);return;}
    float ink=texture2D(pigment,vUv).a;
    float alpha=1.-pow(max(.001,1.-ink),.45+washStrength*1.8);
    gl_FragColor=vec4(.085,.10,.088,alpha);}`,
  });material.userData.translucentInk=true;material.userData.painter='p5.js';return material;
}

export function filamentMaterial(density,seed=1){
  const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,
    uniforms:{density:{value:density},seed:{value:seed},formOnly:{value:0},washStrength:{value:.45}},
    vertexShader:`varying vec2 vUv;varying vec3 vNormal;void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float density;uniform float seed;uniform float formOnly;uniform float washStrength;varying vec2 vUv;varying vec3 vNormal;
    void main(){if(formOnly>.5){float lit=.46+.54*abs(dot(normalize(vNormal),normalize(vec3(-.35,.6,1.))));gl_FragColor=vec4(vec3(.54,.59,.55)*lit,1.);return;}
    float fiber=.84+.11*sin(vUv.x*67.+seed)+.05*sin(vUv.x*131.+seed);
    gl_FragColor=vec4(.09,.105,.095,min(.98,density*fiber*(.70+washStrength*.5)));}`,
  });material.userData.translucentInk=true;return material;
}

export function createShell(library,form,pivot,kind,seed=0){
  const geometry=shellGeometry(form,pivot,seed,...(library.fastGeometry?(form.head?[12,10]:form.leaf?[6,6]:[10,4]):[48,26])),mesh=new THREE.Mesh(geometry,shellInkMaterial(library,form,kind,seed));mesh.name=form.name;mesh.layers.enable(1);mesh.userData.inkForm={seed,head:Boolean(form.head),leaf:Boolean(form.leaf)};
  const wire=new THREE.Mesh(shellGeometry(form,pivot,seed,14,10),new THREE.MeshBasicMaterial({color:0x9b6248,wireframe:true,transparent:true,opacity:.35,depthTest:false,depthWrite:false}));
  wire.visible=false;wire.renderOrder=100;mesh.add(wire);return{mesh,wire};
}
