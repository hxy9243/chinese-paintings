import * as THREE from 'three';

// Small authored differences, held for the lifetime of each animal. These are
// variations within one ink family, not per-frame random deformations.
export const SHRIMP_INDIVIDUALS=Object.freeze([
  {name:'Long and spare',body:[1.055,.96,.93],headWidth:.96,curl:-.014,sweep:.010,fan:.94,
    feelers:[1.11,1.02,1.05,.96],feelerBow:7,claws:1.065,legs:.98,asymmetry:.032,eyeTurn:-.07,eyeSize:.96,
    headInk:.96,inkPhase:.3,inkTurn:.035,gestureTempo:.94},
  {name:'Fuller and quiet',body:[.96,1.055,1.06],headWidth:1.035,curl:.012,sweep:-.012,fan:1.02,
    feelers:[.94,1.03,.96,1.02],feelerBow:-6,claws:.955,legs:1.025,asymmetry:-.026,eyeTurn:.05,eyeSize:1.025,
    headInk:1.08,inkPhase:1.6,inkTurn:.16,gestureTempo:.88},
  {name:'Curled and reaching',body:[.99,1.00,.97],headWidth:.99,curl:.040,sweep:.018,fan:1.07,
    feelers:[1.045,.95,1.10,1.00],feelerBow:10,claws:1.025,legs:.99,asymmetry:.045,eyeTurn:.09,eyeSize:.98,
    headInk:1.02,inkPhase:2.9,inkTurn:.075,gestureTempo:1.06},
  {name:'Open and drifting',body:[1.025,.94,1.025],headWidth:1.025,curl:-.025,sweep:-.018,fan:1.14,
    feelers:[.98,1.09,1.00,.94],feelerBow:-9,claws:.99,legs:1.045,asymmetry:-.04,eyeTurn:-.04,eyeSize:1.01,
    headInk:.94,inkPhase:4.1,inkTurn:.095,gestureTempo:.98},
  {name:'Fine and alert',body:[.975,.98,.94],headWidth:.965,curl:.021,sweep:.006,fan:.97,
    feelers:[1.075,.97,1.03,1.11],feelerBow:4,claws:1.045,legs:.97,asymmetry:.022,eyeTurn:.035,eyeSize:.94,
    headInk:1.04,inkPhase:5.3,inkTurn:.125,gestureTempo:1.12},
]);

export function createShrimpIndividual(model,profile){
  const anatomy=model.root.children[0];anatomy.scale.fromArray(profile.body);
  // Rest bends live above the animated joints, so the shared gait can reset
  // freely without erasing the individual's silhouette or accumulating curl.
  model.bones.forEach((bone,i)=>{
    if(!i)return;const rest=new THREE.Group(),parent=bone.parent;
    rest.name=`individual-rest-${i}`;rest.position.copy(bone.position);
    rest.rotation.set(0,profile.sweep*(.5+i*.10),profile.curl*(.6+i*.10));
    parent.add(rest);rest.add(bone);bone.position.set(0,0,0);
  });
  model.root.traverse(mesh=>{
    const form=mesh.userData.inkForm;
    if(form?.head){mesh.scale.z*=profile.headWidth;mesh.userData.paintOpacity*=profile.headInk;mesh.userData.paintUvTurn=profile.inkTurn;}
    if(form&&mesh.name.startsWith('abdomen-'))mesh.userData.paintOpacity*=1+.065*Math.sin(form.seed*1.43+profile.inkPhase);
    if(mesh.userData.inkGlyph?.kind==='eye'){
      mesh.scale.multiplyScalar(profile.eyeSize);mesh.rotation.z+=Math.sign(mesh.position.z)*profile.eyeTurn;
    }
    if(mesh.userData.fan!==undefined)mesh.scale.z*=profile.fan;
  });
  return{profile,prepareStrokes(meshes){
    const feelers=[],limbs=[],armAnchors=new Map();
    for(const mesh of meshes){
      const tag=mesh.userData.waterAppendage;if(!tag||!['claw','front-leg'].includes(tag.kind))continue;
      armAnchors.set(`${tag.pair}:${tag.side}`,Array.from(mesh.geometry.attributes.position.array.slice(0,3)));
    }
    for(const mesh of meshes){
      const tag=mesh.userData.waterAppendage;if(!tag)continue;
      if(tag.kind==='antenna'){
        const {columns,rows}=mesh.geometry.userData.paintLattice;
        feelers.push({mesh,tag,columns,rows,length:profile.feelers[tag.index]});
      }else if(['claw','front-leg','finger'].includes(tag.kind)){
        const limb=tag.kind==='finger'?tag.limb:tag,anchor=armAnchors.get(`${limb.pair}:${limb.side}`);
        const reach=(limb.pair===1?profile.claws:profile.legs)*(1+limb.side*profile.asymmetry);
        limbs.push({mesh,anchor,reach});
      }
    }
    return()=>{
      // Move tube centres, not their radial vertices, to retain the fine ink
      // width and pin every feeler to its original attachment on the head.
      for(const {mesh,tag,columns,rows,length} of feelers){
        const p=mesh.geometry.attributes.position.array,anchor=tag.anchor,side=tag.index%2?-1:1;
        for(let row=0;row<rows;row++){
          let x=0,y=0,z=0;for(let c=0;c<columns-1;c++){const at=(row*columns+c)*3;x+=p[at];y+=p[at+1];z+=p[at+2];}
          x/=columns-1;y/=columns-1;z/=columns-1;
          const bow=(row/(rows-1))**2*profile.feelerBow;
          const dx=(x-anchor[0])*(length-1)+bow,dy=(y-anchor[1])*(length-1),dz=(z-anchor[2])*(length-1)+bow*.7*side;
          for(let c=0;c<columns;c++){const at=(row*columns+c)*3;p[at]+=dx;p[at+1]+=dy;p[at+2]+=dz;}
        }
      }
      // The whole arm and both fingers share the same shoulder-centred
      // transform before articulation, so individual reach cannot detach them.
      for(const {mesh,anchor,reach} of limbs){const p=mesh.geometry.attributes.position.array;
        for(let at=0;at<p.length;at+=3)for(let axis=0;axis<3;axis++)p[at+axis]=anchor[axis]+(p[at+axis]-anchor[axis])*reach;
      }
    };
  }};
}
