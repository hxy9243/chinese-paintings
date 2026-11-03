import {createAppendageMotion} from './appendage-motion.js';

const PERIOD=12;

function movingMeshes(model,species){
  const meshes=[];model.root.traverse(mesh=>{
    if(mesh.isMesh&&mesh.visible&&mesh.layers.isEnabled(1)&&
      (mesh.userData.inkStroke||species==='fish'&&mesh.userData.inkForm))meshes.push(mesh);
  });return meshes;
}

// These are local 3D vertices, not rendered views or sprites. Interpolated
// articulated poses can still be turned through any angle, banked and occluded.
export function bakePoses(model,species){
  const meshes=movingMeshes(model,species),frames=[],rate=species==='shrimp'?40:20,frameCount=PERIOD*rate;
  for(let frame=0;frame<frameCount;frame++){
    model.update(frame/rate,0,false,false,true,.42);
    frames.push(meshes.map(mesh=>({position:new Float32Array(mesh.geometry.attributes.position.array),
      normal:mesh.userData.inkStroke?new Float32Array(mesh.geometry.attributes.normal.array):null})));
  }
  return{frames,rate,frameCount,species};
}

export function posePlayer(model,cache,individual=null){
  const meshes=movingMeshes(model,cache.species),appendages=createAppendageMotion(meshes,model.root.userData.paintSeedOffset??4317);
  const morph=individual?.prepareStrokes(meshes);
  return (phase,motion=null)=>{
    const p=((phase%12)+12)%12*cache.rate,index=Math.floor(p),mix=p-index;
    const a=cache.frames[index],b=cache.frames[(index+1)%cache.frameCount];
    for(let i=0;i<meshes.length;i++){
      const geometry=meshes[i].geometry,output=geometry.attributes.position.array,first=a[i].position,next=b[i].position;
      for(let j=0;j<output.length;j++)output[j]=first[j]+(next[j]-first[j])*mix;
      if(a[i].normal){
        const out=geometry.attributes.normal.array,from=a[i].normal,to=b[i].normal;
        for(let j=0;j<out.length;j++)out[j]=from[j]+(to[j]-from[j])*mix;
      }
    }
    morph?.();appendages(motion&&individual?{...motion,time:motion.time*individual.profile.gestureTempo}:motion);
  };
}
