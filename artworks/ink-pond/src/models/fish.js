import * as THREE from 'three';
import {stroke} from './shrimp.js';
import {shellGeometry,filamentMaterial} from './volume.js';

const TAU=Math.PI*2;
const HEAD=[[-124,-3,0,1.7,1.2],[-118,-1,0,8,6],[-101,0,0,17,13],[-80,0,0,24,18],[-50,0,0,27,20]];
const BODY=[[-68,0,0,25,20],[-40,1,0,31,23],[-12,2,0,32,23],[22,0,0,28,20],[53,-2,0,17,13],[82,-3,0,8,7],[112,-3,0,6,4]];
function interpolate(knots,t){
  const x=knots[0][0]+(knots.at(-1)[0]-knots[0][0])*t;
  let i=0;while(i<knots.length-2&&knots[i+1][0]<x)i++;
  const a=knots[i],b=knots[i+1],u=(x-a[0])/(b[0]-a[0]);
  return[x,...[1,2,3,4].map(j=>a[j]+(b[j]-a[j])*u)];
}
function loft(knots,rows=45,columns=37){
  const positions=[],uv=[],indices=[];
  for(let i=0;i<rows;i++){
    const t=i/(rows-1),[x,y,z,ry,rz]=interpolate(knots,t);
    const cap=Math.min(1,t*(rows-1),(1-t)*(rows-1));
    for(let j=0;j<columns;j++){
      const a=j/(columns-1)*TAU;
      positions.push(x,y+Math.cos(a)*ry*cap,z+Math.sin(a)*rz*cap);uv.push(t,j/(columns-1));
      if(i<rows-1&&j<columns-1){const v=i*columns+j,n=v+columns;indices.push(v,v+1,n,v+1,n+1,n);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.userData={closedVolume:true,paintLattice:{rows,columns}};return g;
}
function faceDepth(x,y,side){
  const t=Math.max(0,Math.min(1,(x-HEAD[0][0])/(HEAD.at(-1)[0]-HEAD[0][0])));
  const [,cy,,ry,rz]=interpolate(HEAD,t);
  return side*(rz*Math.sqrt(Math.max(0,1-Math.pow((y-cy)/ry,2)))+.65);
}
function curve(points,s){const a=1-s;return [0,1,2].map(k=>a*a*a*points[0][k]+3*a*a*s*points[1][k]+3*a*s*s*points[2][k]+s*s*s*points[3][k]);}

export function createFish(kind,library){
  const root=new THREE.Group(),anatomy=new THREE.Group();root.add(anatomy);anatomy.rotation.x=.11;
  const bodies=[],wires=[],strokes=[],materials=[];
  const addPart=(name,geometry,inkForm)=>{
    const material=filamentMaterial(.5,inkForm.seed),mesh=new THREE.Mesh(geometry,material);
    mesh.name=name;mesh.layers.enable(1);mesh.userData.inkForm=inkForm;anatomy.add(mesh);materials.push(material);
    const wire=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x9b6248,wireframe:true,transparent:true,opacity:.22,depthTest:false,depthWrite:false}));
    wire.visible=false;wire.renderOrder=100;mesh.add(wire);wires.push(wire);
    const rest=new Float32Array(geometry.attributes.position.array),coeff=new Float64Array(rest.length/3*5);
    for(let i=0;i<rest.length/3;i++){
      const posterior=Math.max(0,(rest[i*3]+62)/224),p2=posterior*posterior;
      coeff.set([p2*24*Math.cos(posterior*2.6),p2*24*Math.sin(posterior*2.6),
        p2*2.8*Math.cos(posterior),p2*2.8*Math.sin(posterior),Math.max(0,(-rest[i*3+1]-13)/34)*3],i*5);
    }
    bodies.push({mesh,rest,coeff});return mesh;
  };
  const head=addPart('fish-head',loft(HEAD,library.fastGeometry?9:33,library.fastGeometry?13:37),{seed:501,role:'fish-head'});
  const body=addPart('fish-body',loft(BODY,library.fastGeometry?13:57,library.fastGeometry?13:37),{seed:502,role:'fish-body'});
  const addFin=(name,start,end,radius,seed)=>{
    const form={name,start,end,radius,leaf:true};return addPart(name,shellGeometry(form,[0,0,0],seed,library.fastGeometry?6:30,library.fastGeometry?6:24),{seed,leaf:true,role:'fish-fin'});
  };
  // A forked caudal fan and one high, swept dorsal mark follow the reference.
  addFin('tail-upper',[109,-3,0],[158,28,0],[7.0,26,1.15],510);
  addFin('tail-lower',[109,-3,0],[160,-26,0],[7.3,26,1.15],511);
  addFin('dorsal-fin',[-36,35,0],[39,36,0],[14.5,39,1.1],512);
  // The leading dorsal ray forms the tall triangular ink peak, not a capsule.
  addFin('dorsal-peak',[-34,29,0],[-31,70,0],[5.1,23,.9],513);
  for(const side of [-1,1]){
    addFin(`pectoral-long-${side}`,[-65,-13,side*16],[-32,-47,side*31],[4.3,23,1.15],520+side);
    addFin(`pectoral-short-${side}`,[-65,-13,side*16],[-17,-30,side*34],[3.7,25,1.05],524+side);
    addFin(`pelvic-${side}`,[12,-28,side*10],[38,-46,side*20],[3.6,17,.9],528+side);
  }
  const addLine=(width,opacity,seed,evaluate,segments=40)=>{
    const line=stroke(width,opacity,seed,(s,t)=>{
      let [x,y,z]=evaluate(s,t);const phase=t*Math.PI/6;if(seed<575)z=faceDepth(x,y,z<0?-1:1);
      const flutter=seed>=575?Math.max(0,(-y-13)/34)*3*Math.sin(phase*4+(z>0?.4:-.4)):0;
      return warp(x,y,z,t,flutter);
    },library.fastGeometry?Math.max(6,Math.ceil(segments*.25)):segments,null,library.fastGeometry?3:8);anatomy.add(line.mesh);strokes.push(line);materials.push(line.mesh.material);return line;
  };
  for(const side of [-1,1]){
    // The face is largely unpainted paper, enclosed by open cheek and lip strokes.
    addLine(1.6,.64,550+side,s=>curve([[-112,10,side*10],[-97,26,side*16],[-70,18,side*21],[-84,-13,side*20]],s));
    addLine(1.25,.59,554+side,s=>curve([[-87,20,side*19],[-68,14,side*23],[-71,-15,side*19],[-105,-17,side*12]],s));
    addLine(1.7,.64,558+side,s=>curve([[-119,-8,side*5],[-115,-19,side*10],[-91,-19,side*17],[-80,-10,side*21]],s));
    addLine(1.65,.58,562+side,s=>curve([[-122,-1,side*2],[-130,-1,side*3],[-130,-8,side*4],[-119,-8,side*5]],s),24);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(1,library.fastGeometry?8:18,library.fastGeometry?6:14),filamentMaterial(.98,570+side));
    eye.position.set(-104,7,faceDepth(-104,7,side)+side*.3);eye.scale.set(2.5,2.7,1.5);eye.rotation.z=-.2;
    eye.layers.enable(1);eye.userData.inkGlyph={kind:'eye',seed:570+side};anatomy.add(eye);materials.push(eye.material);
    for(let ray=0;ray<4;ray++)addLine(.55,.22,580+side*5+ray,s=>{
      const u=ray/3;return[-63+s*(29+u*13),-15-s*(27-u*10),side*(17+s*(12+u*3))];
    },24);
  }
  function warp(x,y,z,t,flutter=0){
    const phase=t*Math.PI/6,posterior=Math.max(0,(x+62)/224);
    const wave=Math.sin(phase*6-posterior*2.6)-Math.sin(-posterior*2.6);
    return[x,y+posterior*posterior*2.8*(Math.sin(phase*3-posterior)-Math.sin(-posterior))+flutter,
      z+posterior*posterior*24*wave];
  }
  let currentTime=0;
  function update(time,turn=0,construction=false,swimmingTurns=true,formOnly=false,wash=.45){
    currentTime=time;const phase=time*Math.PI/6;
    root.position.set(8+15*Math.sin(phase),18+6*Math.sin(phase*2),0);
    root.rotation.set(.035*Math.sin(phase*2),THREE.MathUtils.degToRad(turn+(swimmingTurns?25*Math.sin(phase)+5*Math.sin(phase*2):0)),.38+.025*Math.sin(phase));
    const sinA=Math.sin(phase*6),cosA=1-Math.cos(phase*6),sinB=Math.sin(phase*3),cosB=1-Math.cos(phase*3);
    const flutterNear=Math.sin(phase*4+.4),flutterFar=Math.sin(phase*4-.4);
    if(library.animateGeometry!==false)for(const {mesh,rest,coeff} of bodies){
      const attr=mesh.geometry.attributes.position;
      if(library.fastGeometry){
        const output=attr.array,fin=mesh.name.startsWith('pectoral');
        for(let i=0;i<attr.count;i++){
          const a=i*3,b=i*5;output[a]=rest[a];
          output[a+1]=rest[a+1]+coeff[b+2]*sinB+coeff[b+3]*cosB+(fin?coeff[b+4]*(rest[a+2]>0?flutterNear:flutterFar):0);
          output[a+2]=rest[a+2]+coeff[b]*sinA+coeff[b+1]*cosA;
        }
      }else for(let i=0;i<attr.count;i++){
        const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];
        const pectoral=mesh.name.startsWith('pectoral')?Math.max(0,(-y-13)/34)*3*Math.sin(phase*4+(z>0?.4:-.4)):0;
        attr.setXYZ(i,...warp(x,y,z,time,pectoral));
      }
      attr.needsUpdate=true;if(library.guideNormals!==false)mesh.geometry.computeVertexNormals();
    }
    if(library.animateGeometry!==false)for(const line of strokes)line.update(time);
    for(const material of materials){material.uniforms.formOnly.value=1;material.uniforms.washStrength.value=wash;}
    for(const wire of wires)wire.visible=construction;
  }
  update(0);
  return{root,update,bones:[head,body],kind,subject:'fish',spatial:true,painter:library.painter,
    anatomy:{localTop:[0,1,0],localForward:[-1,0,0],continuousBody:true,forkedTail:true,dorsalFin:true,pairedPectoralFins:true,pairedPelvicFins:true,eyes:2},
    bodyGeometry:[{closed:true,crossSectionWidth:64,crossSectionDepth:46}],
    motion(){return{tailTip:warp(158,28,0,currentTime),bodySide:warp(82,-3,9,currentTime)};},
  };
}
