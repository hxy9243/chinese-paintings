import * as THREE from 'three';
import { BODY_FORMS, TAIL_FORMS, SPINE, createShell, filamentMaterial } from './volume.js';

export function stroke(width, opacity, seed, evaluate, segments = 65, profile = null, sides=8) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((segments + 1) * (sides+1) * 3);
  const normals = new Float32Array(positions.length);
  const uv = new Float32Array((segments + 1) * (sides+1) * 2), indices = [];
  for (let i = 0; i <= segments; i++) {
    for(let j=0;j<=sides;j++){
      uv.set([i/segments,j/sides],(i*(sides+1)+j)*2);
      if(i<segments&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,a+1,b+1,b);}
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geometry.setIndex(indices);
  geometry.userData.closedVolume=true;
  const mesh = new THREE.Mesh(geometry, filamentMaterial(opacity, seed));
  mesh.userData.inkStroke={width,opacity,seed,segments,paddle:Boolean(profile)};
  geometry.userData.paintLattice={columns:sides+1,rows:segments+1};
  mesh.frustumCulled = false; mesh.layers.enable(1);
  const radial=Array.from({length:sides+1},(_,j)=>[Math.cos(j/sides*Math.PI*2),Math.sin(j/sides*Math.PI*2)]);
  const update = t => {
    for (let i = 0; i <= segments; i++) {
      const s = i / segments;
      const p = evaluate(s, t), a = evaluate(Math.max(0, s - .002), t), b = evaluate(Math.min(1, s + .002), t);
      const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],length=Math.hypot(dx,dy,dz)||1,planar=Math.hypot(dx,dy)||1;
      const tx=dx/length,ty=dy/length,tz=dz/length,nx=-dy/planar,ny=dx/planar;
      const bx=-tz*ny,by=tz*nx,bz=tx*ny-ty*nx;
      const taper = profile ? profile(s) : (1 - s * .72) * (1 + .09 * Math.sin(s * 28 + seed));
      const cap=Math.sin(Math.min(1,s/.012)*Math.PI/2)*Math.sin(Math.min(1,(1-s)/.018)*Math.PI/2);
      const radius=width*taper*cap/2;
      for(let j=0;j<=sides;j++){
        const [c,sn]=radial[j],index=(i*(sides+1)+j)*3;
        const ox=nx*c+bx*sn,oy=ny*c+by*sn,oz=bz*sn;
        positions[index]=p[0]+ox*radius;positions[index+1]=p[1]+oy*radius;positions[index+2]=p[2]+oz*radius;
        normals[index]=ox;normals[index+1]=oy;normals[index+2]=oz;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate=true;
  };
  update(0);
  return { mesh, update, tip:t=>evaluate(1,t) };
}

function bezier(points, s) {
  const a = 1 - s;
  return [0, 1, 2].map(k => a*a*a*points[0][k] + 3*a*a*s*points[1][k] + 3*a*s*s*points[2][k] + s*s*s*points[3][k]);
}

function polyline(points, s) {
  const f = Math.min(s * (points.length - 1), points.length - 1 - 1e-7), i = Math.floor(f), u = f - i;
  return [0, 1, 2].map(k => points[i][k] + (points[i + 1][k] - points[i][k]) * u);
}

export function createShrimp(kind, library) {
  const root=new THREE.Group(),anatomy=new THREE.Group(),bones=[],wires=[],strokes=[];
  const pondSwimming=library.swimmingProfile==='pond';
  root.add(anatomy);anatomy.rotation.x=.82;
  const probes={antennae:[],claws:[]},pivots=[[0,0,0],...SPINE.slice(0,-1)];
  let parent=anatomy,previous=[0,0,0];
  BODY_FORMS.forEach((form,i)=>{
    const pivot=pivots[i],bone=new THREE.Group();bone.name=form.name;
    bone.position.set(...pivot.map((v,j)=>v-previous[j]));parent.add(bone);bones.push(bone);
    const {mesh,wire}=createShell(library,form,pivot,kind,i);bone.add(mesh);wires.push(wire);parent=bone;previous=pivot;
  });
  TAIL_FORMS.forEach((form,i)=>{
    const fan=new THREE.Group(),{mesh,wire}=createShell(library,form,pivots.at(-1),kind,7+i);
    fan.add(mesh);bones.at(-1).add(fan);fan.userData.fan=form.side;wires.push(wire);
  });
  const addStroke=(target,width,opacity,seed,evaluate,segments,profile)=>{
    const count=library.fastGeometry?Math.max(6,Math.ceil((segments??65)*.28/3)*3) : segments;
    const item=stroke(width,opacity,seed,evaluate,count,profile,library.fastGeometry?3:8);target.add(item.mesh);strokes.push(item);return item;
  };
  // The rostrum is a narrow beak continuous with the carapace, with tiny teeth.
  const rostrum=createShell(library,{name:'rostrum',start:[-49,11,0],end:[-96,26,0],radius:[2.2,24,1.4],leaf:true},[0,0,0],kind,30);
  bones[0].add(rostrum.mesh);wires.push(rostrum.wire);
  for(let i=0;i<10;i++){
    const tooth=new THREE.Mesh(new THREE.ConeGeometry(.8,2.6,3),filamentMaterial(.64,130+i));
    tooth.position.set(-52-i*3.8,15+i*1.17,0);tooth.rotation.z=.30;tooth.layers.enable(1);bones[0].add(tooth);
  }
  // Short curved stalks and unequal oblong ink marks, as in the supplied
  // painting. These remain rounded volumes when the pose is inspected in 3D.
  for(const side of [-1,1]){
    const a=[-49,6,side*10],b=[-55,side>0?10:12,side*(side>0?18:17)];
    addStroke(bones[0],1.55,.63,80+side,s=>{
      const bow=Math.sin(Math.PI*s)*2.1;
      return[a[0]+(b[0]-a[0])*s,a[1]+(b[1]-a[1])*s+bow,a[2]+(b[2]-a[2])*s];
    },16);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(1,library.fastGeometry?8:18,library.fastGeometry?6:14),filamentMaterial(.96,90+side));
    eye.position.set(...b);eye.scale.set(side>0?1.65:1.9,side>0?3.2:2.8,1.7);eye.rotation.z=side>0?-.48:.37;
    eye.userData.inkGlyph={kind:'eye',seed:90+side};eye.layers.enable(1);bones[0].add(eye);
  }
  // Paired long antennae and finer antennules curve in the water. Larger tip
  // motion is delayed along arc length; all randomness lives in the static paint.
  const antennae=pondSwimming?[
    [[-56,-1,10],[-176,-6,59],[-139,-16,168],[146,-11,184]],
    [[-56,-1,-10],[-181,-5,-64],[-144,-12,-174],[128,-7,-192]],
    [[-61,6,5],[-116,3,21],[-151,-3,49],[-157,-5,78]],
    [[-61,6,-5],[-120,4,-24],[-143,-2,-56],[-135,-6,-91]],
  ]:[
    [[-56,-1,10],[-175,-9,18],[-164,-162,30],[126,-170,23]],
    [[-56,-1,-10],[-188,63,-22],[-138,174,-33],[115,151,-17]],
    [[-61,6,5],[-124,17,12],[-181,-54,24],[-54,-105,14]],
    [[-61,6,-5],[-137,-17,-17],[-116,92,-25],[55,101,-18]],
  ];
  antennae.forEach((points,i)=>{
    const item=addStroke(bones[0],i<2?1.05:.65,i<2?.51:.34,10+i,(s,t)=>{
      const p=bezier(points,s),phase=t*Math.PI/6,lag=pondSwimming?-s*2.6+i*.9:-s*2.3+i*.8;
      if(pondSwimming){
        // Stiff bases and supple distal flagella: the travelling bend grows
        // along the feeler, rather than swinging the whole line as a rod.
        const f=Math.pow(s,1.8),side=i%2?-1:1,amplitude=i<2?51:23;
        p[0]+=f*(17*Math.sin(phase*2+lag)+7*Math.sin(phase*4-s*3+i));
        p[2]+=f*(amplitude*Math.sin(phase*2+lag)+16*Math.sin(phase-s*1.3+i))*side;
        p[1]+=f*(5*Math.sin(phase*2-s*2+i)-4);return p;
      }
      const bend=Math.pow(s,1.8)*(i<2?32:21)*(Math.sin(phase*2+lag)-Math.sin(lag));
      p[0]+=bend*.6;p[1]+=bend+s*s*8*Math.sin(phase);p[2]+=s*s*13*(Math.sin(phase*2-s*1.7+i)-Math.sin(-s*1.7+i));return p;
    });
    if(pondSwimming)item.mesh.userData.waterAppendage={kind:'antenna',index:i,anchor:points[0]};probes.antennae.push(item);
  });
  // Five paired thoracic legs. The second pair are the long chelipeds; walking
  // legs and the first small pincers attach underneath the carapace.
  for(let pair=0;pair<5;pair++)for(const side of [-1,1]){
    const x=-34+pair*12,z=side*11;
    let points;
    if(pondSwimming){
      if(pair===1)points=[[x,-10,z],[-61,-28,side*49],[-158,-48,side*109],[-242,-37,side*76]];
      else if(pair===0)points=[[x,-11,z],[-59,-23,side*18],[-83,-36,side*25],[-100,-31,side*30]];
      else points=[[x,-11,z],[x+8,-28,side*(21+pair*2)],[x-7,-43-pair*2,side*(30+pair*3)],[x+10,-52-pair*2,side*(38+pair*3)]];
    }else if(pair===1)points=side>0?[[x,-10,z],[42,-72,31],[-136,-108,49],[-245,-63,45]]:[[x,-10,z],[-3,94,-31],[-128,111,-49],[-214,12,-40]];
    else if(pair===0)points=[[x,-11,z],[-59,-29,side*19],[-83,-48,side*25],[-100,-36,side*27]];
    else points=[[x,-11,z],[x+8,-38,side*(22+pair*2)],[x-6,-66-pair*4,side*(27+pair*3)],[x+8,-78-pair*4,side*(29+pair*3)]];
    let lastTime=NaN,posed;
    const pose=t=>{
      if(t===lastTime)return posed;lastTime=t;const phase=t*Math.PI/6,offset=pair*.7+side*.6;
      posed=[[...points[0]]];let angle=0;
      for(let j=1;j<points.length;j++){
        const amplitude=pondSwimming?(pair===1?[.025,.045,.065][j-1]:[.018,.025,.035][j-1]):pair===1?[.10,.16,.21][j-1]:[.07,.12,.16][j-1];
        angle+=amplitude*(Math.sin(phase*2+offset-j*.6)-Math.sin(offset-j*.6));
        const dx=points[j][0]-points[j-1][0],dy=points[j][1]-points[j-1][1],dz=points[j][2]-points[j-1][2];
        if(pondSwimming)posed.push([posed[j-1][0]+Math.cos(angle)*dx-Math.sin(angle)*dz,posed[j-1][1]+dy+Math.sin(phase*2+offset-j*.5)*j*.7,posed[j-1][2]+Math.sin(angle)*dx+Math.cos(angle)*dz]);
        else posed.push([posed[j-1][0]+Math.cos(angle)*dx-Math.sin(angle)*dy,posed[j-1][1]+Math.sin(angle)*dx+Math.cos(angle)*dy,posed[j-1][2]+dz]);
      }return posed;
    };
    const arm=addStroke(bones[0],pair===1?3.25:1.55,side>0?.64:.41,40+pair*2+side,(s,t)=>polyline(pose(t),s),60);
    const limb={kind:pair===1?'claw':'front-leg',pair,side,jointCount:points.length};
    if(pondSwimming)arm.mesh.userData.waterAppendage=limb;
    if(pair===1)probes.claws.push(arm);
    if(pair<2)for(const finger of [-1,1]){
      const digit=addStroke(bones[0],pair===1?1.4:.7,.58,100+pair*4+side+finger,(s,t)=>{
      const joints=pose(t),tip=joints.at(-1),before=joints.at(-2),phase=t*Math.PI/6;
      const direction=Math.atan2(tip[pondSwimming?2:1]-before[pondSwimming?2:1],tip[0]-before[0]);
      const opening=.18+.09*Math.sin(phase*2+side-.8),angle=direction+finger*(.09+opening*s);
      const length=s*(pair===1?24:8);
      return pondSwimming?[tip[0]+Math.cos(angle)*length,tip[1]+finger*s*.7,tip[2]+Math.sin(angle)*length]:[tip[0]+Math.cos(angle)*length,tip[1]+Math.sin(angle)*length,tip[2]+finger*s*.7];
      },16);
      if(pondSwimming)digit.mesh.userData.waterAppendage={kind:'finger',finger,limb};
    }
  }
  // Three small mouthpart pairs, then five paired abdominal swimmerets.
  for(let i=0;i<3;i++)for(const side of [-1,1])addStroke(bones[0],1.5,.35,150+i*2+side,s=>[-49-s*(19-i*4),-6-s*(17+i*3),side*(5+s*7)],14);
  bones.slice(1,6).forEach((bone,i)=>{
    const baseY=-(16.5-i*1.65)*.74;
    const paddleState=t=>{
      const u=((t*1.5+i*.15)%1+1)%1,power=u<.42,v=power?u/.42:(u-.42)/.58,ease=v*v*(3-2*v);
      return{angle:power?-.78+1.47*ease:.69-1.47*ease,fold:power?0:Math.sin(Math.PI*v)};
    };
    for(const side of [-1,1]){
      // Each swimmeret has a short stem and two soft rami. The broad middle of
      // each ramus reads as a paddle; sparse setae break up its hard tube edge.
      const stem=(s,t)=>{
        if(pondSwimming){const {angle}=paddleState(t);return[6+Math.sin(angle)*s*6,baseY-Math.cos(angle)*s*6,side*(6+s*2)];}
        const phase=t*Math.PI*2-i*.85+side*.16,sweep=Math.sin(phase);
        return[6+s*(1+sweep*2),baseY-s*5,side*(6+s*2)];
      };
      addStroke(bone,1.9,.42,180+i*2+side,stem,14);
      for(const branch of [-1,1]){
        const paddle=(s,t)=>{
          if(pondSwimming){
            const base=stem(1,t),{angle,fold}=paddleState(t),reach=(17-i*.7)*(1-fold*.30),spread=1-fold*.70;
            return[base[0]+Math.sin(angle)*s*reach+fold*s*s*reach*.36,
              base[1]-Math.cos(angle)*s*reach+fold*s*s*reach*.30,
              base[2]+side*s*5*spread+branch*s*(2.1+Math.sin(Math.PI*s)*2.5)*spread];
          }
          const base=stem(1,t),phase=t*Math.PI*2-i*.85+side*.16;
          const sweep=Math.sin(phase),reach=17-i*.7;
          return[base[0]+s*(5+sweep*9)+branch*s*s*3.7,
            base[1]-s*reach+s*s*(2+sweep*3),
            base[2]+side*s*(5+Math.cos(phase)*2)+branch*s*2.3];
        };
        const ramus=addStroke(bone,4.8-i*.25,side>0?.44:.31,200+i*4+side+branch,paddle,24,
          s=>.10+.90*Math.pow(Math.sin(Math.PI*s),.65));
        if(pondSwimming)ramus.mesh.userData.waterAppendage={kind:'swimmeret',segment:i,side,branch};
        for(let hair=0;hair<(library.omitSubpixelHair?0:5);hair++){
          const at=.37+hair*.115;
          addStroke(bone,.55,.32,240+i*24+(side+1)*5+(branch+1)*3+hair,(s,t)=>{
            const p=paddle(at,t),extent=(2.1+Math.sin(at*Math.PI)*2.6)*s;
            return[p[0]+branch*extent,p[1]-extent*.46,p[2]+side*extent*.48];
          },6);
        }
      }
    }
  });
  const debug=new THREE.Group();anatomy.add(debug);
  const skeleton=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pivots.map(()=>new THREE.Vector3())),new THREE.LineBasicMaterial({color:0x976749,depthTest:false,transparent:true,opacity:.6}));
  debug.add(skeleton);
  const inkMaterials=[];root.traverse(object=>{if(object.material?.uniforms?.formOnly)inkMaterials.push(object.material);});
  let currentTime=0;
  function update(time,turn=0,construction=false,swimmingTurns=true,formOnly=false,washStrength=.45){
    currentTime=time;
    for(const material of inkMaterials){material.uniforms.formOnly.value=formOnly?1:0;material.uniforms.washStrength.value=washStrength;}
    const phase=time*Math.PI/6,yaw=swimmingTurns?32*Math.sin(phase)+8*Math.sin(phase*2):0,pitch=swimmingTurns?11*Math.sin(phase*2):0;
    root.position.set(20+20*Math.sin(phase),30+9*Math.sin(phase*2),0);
    root.rotation.set(THREE.MathUtils.degToRad(pitch),THREE.MathUtils.degToRad(turn+yaw),.93+.055*Math.sin(phase)+.025*Math.sin(phase*2));
    bones.forEach((bone,i)=>{bone.rotation.z=i?(pondSwimming?.006:.038)*(Math.sin(phase*2-i*.42)-Math.sin(-i*.42)):0;bone.rotation.y=i?(pondSwimming?.004:.028)*(Math.sin(phase-i*.5)-Math.sin(-i*.5)):0;});
    bones.at(-1).children.filter(c=>c.userData.fan!==undefined).forEach(fan=>{fan.rotation.x=fan.userData.fan*.07*Math.sin(phase*2);fan.rotation.y=fan.userData.fan*.05*Math.sin(phase*2);});
    if(library.animateGeometry!==false)strokes.forEach(item=>item.update(time));debug.visible=construction;wires.forEach(w=>w.visible=construction);
    if(construction){root.updateMatrixWorld(true);const pos=skeleton.geometry.attributes.position;const v=new THREE.Vector3();bones.forEach((bone,i)=>{bone.getWorldPosition(v);anatomy.worldToLocal(v);pos.setXYZ(i,v.x,v.y,v.z+22);});pos.needsUpdate=true;}
  }
  update(0);
  return{root,update,bones,kind,subject:'shrimp',spatial:true,markCount:12,painter:library.painter,
    anatomy:{localTop:[0,1,0],localForward:[-1,0,0],swimmingProfile:pondSwimming?'pleopod rowing and gliding':'study',abdominalSegments:6,walkingLegPairs:5,longClawPairs:1,swimmeretPairs:5,tailFanLobes:5,stalkedEyes:2},
    bodyGeometry:BODY_FORMS.map(form=>({closed:true,crossSectionWidth:form.radius[0]*2,crossSectionDepth:form.radius[2]*2})),
    inkState(){return{painter:library.painter,p5PaintedSurfaces:12,transparentMaterials:inkMaterials.length,materialCount:inkMaterials.length,depthWritingMaterials:0};},
    motion(){return{antennaTips:probes.antennae.map(item=>item.tip(currentTime)),clawTips:probes.claws.map(item=>item.tip(currentTime))};},
  };
}
