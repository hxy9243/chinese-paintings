import * as THREE from 'three';
import {createShrimp} from './models/shrimp.js';
import {createFish} from './models/fish.js';
import {createSwimming} from './swimming.js';
import {bakePoses,posePlayer} from './pose-cache.js';
import {waterToWorld,worldToWater,WATER_VIEW} from './water-space.js';
import {createRipples} from './ripples.js';
import {SHRIMP_INDIVIDUALS,createShrimpIndividual} from './shrimp-individuals.js';
import {createRain} from './rain.js';

export const DURATION=120;
export const FISH_SCALE=1.5;
export const ANIMALS=[
  {id:'fish-1',species:'fish',size:1.04*FISH_SCALE,ink:.92,pigment:[.13,.18,.20],color:'blue-grey',phase:.7,start:[-660,80,-10],velocity:[52,-6,.5]},
  {id:'fish-2',species:'fish',size:1.10*FISH_SCALE,ink:1,pigment:[.22,.17,.12],color:'warm umber',phase:2.2,start:[-240,390,8],velocity:[44,-10,-.4]},
  {id:'fish-3',species:'fish',size:1.00*FISH_SCALE,ink:.79,pigment:[.15,.21,.17],color:'sage-grey',phase:4.1,start:[490,90,-15],velocity:[-47,-7,.6]},
  {id:'fish-4',species:'fish',size:1.12*FISH_SCALE,ink:1,pigment:[.20,.16,.19],color:'plum-grey',phase:4.8,start:[800,-230,14],velocity:[-46,3,-.4]},
  {id:'fish-5',species:'fish',size:1.06*FISH_SCALE,ink:.85,pigment:[.12,.20,.20],color:'teal-grey',phase:6.3,start:[-130,-350,0],velocity:[43,-13,.3]},
  {id:'shrimp-1',species:'shrimp',individual:0,size:.71,ink:.92,phase:0,start:[-510,-145,12],velocity:[25,4,.3]},
  {id:'shrimp-2',species:'shrimp',individual:1,size:.66,ink:.73,phase:2.4,start:[-240,-35,-8],velocity:[23,8,-.3]},
  {id:'shrimp-3',species:'shrimp',individual:2,size:.69,ink:.80,phase:5.2,start:[130,350,-5],velocity:[-24,-4,.4]},
  {id:'shrimp-4',species:'shrimp',individual:3,size:.72,ink:.67,phase:3.2,start:[550,330,-12],velocity:[-28,-5,-.4]},
  {id:'shrimp-5',species:'shrimp',individual:4,size:.67,ink:.77,phase:7.2,start:[220,-410,8],velocity:[-25,6,.3]},
];

export const POPULATION_LIMITS=Object.freeze({fish:8,shrimp:12});
const poseCaches={};
export function populationDefinitions(fish=5,shrimp=5){
  const count=(value,species)=>Math.max(0,Math.min(POPULATION_LIMITS[species],Math.round(Number(value)||0)));
  return ['fish','shrimp'].flatMap(species=>{
    const originals=ANIMALS.filter(a=>a.species===species),n=count(species==='fish'?fish:shrimp,species);
    return Array.from({length:n},(_,i)=>{
      const original=originals[i%originals.length],extra=Math.floor(i/originals.length);
      return {...original,id:`${species}-${i+1}`,individual:i%SHRIMP_INDIVIDUALS.length,
        size:original.size*(1+extra*.025),phase:original.phase+extra*1.37,
        start:extra?[-1150+(i*347)%2300,-650+(i*263)%1300,original.start[2]+extra*3]:[...original.start],
        velocity:[...original.velocity]};
    });
  });
}
export function createPond({fish=5,shrimp=5,seed:initialSeed=4317,rain:rainIntensity}={}){
  const definitions=populationDefinitions(fish,shrimp);
  const root=new THREE.Group(),animals=[];
  // Persistent water strata, deepest first. Never re-sort by a moving screen
  // centre: that would flip ownership halfway through an overlapping encounter.
  const depthOrder=definitions.map((_,i)=>i).sort((a,b)=>definitions[a].start[2]-definitions[b].start[2]||a-b);
  const library={painter:'p5 pigment on 3D surfaces',texture:()=>null,omitSubpixelHair:true,guideNormals:false,fastGeometry:true,swimmingProfile:'pond',shellResolution:[16,12]};
  for(const [index,definition] of definitions.entries()){
    const model=(definition.species==='fish'?createFish:createShrimp)('A',library),placement=new THREE.Group();
    model.root.children[0].rotation.x=Math.PI/2;
    model.root.userData.anatomicalTop=[0,1,0];
    placement.add(model.root);root.add(placement);placement.scale.setScalar(definition.size);
    const waterDepthLayer=depthOrder.indexOf(index);
    model.root.traverse(mesh=>{mesh.userData.paintOpacity=definition.ink;mesh.userData.paintColor=definition.pigment;mesh.userData.paintSeedOffset=(index+1)*1009;mesh.userData.animalIndex=index;mesh.userData.waterDepthLayer=waterDepthLayer;});
    const individual=definition.species==='shrimp'?createShrimpIndividual(model,SHRIMP_INDIVIDUALS[definition.individual]):null;
    animals.push({definition,model,placement,waterDepthLayer,individual,state:null});
  }
  for(const species of ['fish','shrimp']){
    const first=animals.find(a=>a.definition.species===species);
    if(first&&!poseCaches[species])poseCaches[species]=bakePoses(first.model,species);
  }
  library.animateGeometry=false;
  for(const animal of animals)animal.applyPose=posePlayer(animal.model,poseCaches[animal.definition.species],animal.individual);
  let seed=initialSeed,simulation=createSwimming(definitions,seed),time=0,current=0;
  let ripples=createRipples(definitions,seed,t=>simulation.sample(t));
  const rain=createRain(seed);if(rainIntensity!==undefined)rain.setIntensity(rainIntensity);
  function update(t){
    time=Math.max(0,t);const states=simulation.sample(time);
    animals.forEach((animal,index)=>{
      const {model,placement,definition}=animal,state=states[index];animal.state=state;
      model.update(state.phase%12,0,false,false,true,.42);animal.applyPose(state.phase,{speed:Math.hypot(...state.velocity.slice(0,2)),turn:state.turnRate,time,seed:seed+index*1009});model.root.position.set(0,0,0);model.root.rotation.set(0,0,0);
      placement.position.fromArray(waterToWorld(state.position));placement.quaternion.fromArray(state.quaternion);
    });root.updateMatrixWorld(true);
  }
  function describe(){
    const fishCount=definitions.filter(a=>a.species==='fish').length,shrimpCount=definitions.length-fishCount;
    const fishLength=definitions.filter(a=>a.species==='fish').reduce((s,a)=>s+a.size*284,0)/(fishCount||1);
    const shrimpLength=definitions.filter(a=>a.species==='shrimp').reduce((s,a)=>s+a.size*212,0)/(shrimpCount||1);
    return{duration:DURATION,time,current,seed,fish:fishCount,shrimp:shrimpCount,fishScale:FISH_SCALE,rain:rain.describe(time),ripples:ripples.describe(time),waterPlane:{axes:'XY',normal:WATER_VIEW.worldUp,anatomicalTop:WATER_VIEW.anatomicalTop,maximumDepthTilt:.075,sharedUpright:true},poseCache:{coordinates:3,samplesPerPhaseSecond:{fish:20,shrimp:40},interpolated:true},fishToShrimpBodyRatio:shrimpLength?fishLength/shrimpLength:null,simulation:simulation.describe(),
      animals:animals.map(({definition:d,placement,state,model,waterDepthLayer,individual})=>({id:d.id,species:d.species,individual:individual?.profile??null,waterDepthLayer,position:placement.position.toArray(),waterPosition:state.position,velocity:waterToWorld(state.velocity),quaternion:state.quaternion,
        topDirection:new THREE.Vector3(0,1,0).applyQuaternion(model.root.children[0].quaternion).applyQuaternion(placement.quaternion).toArray(),
        bank:state.bank,turnRate:state.turnRate,depthTilt:state.depthTilt,heading:state.heading,behavior:d.species==='shrimp'?(state.effort>.6?'rowing':'gliding'):state.gather>.6?'gathering':state.gather<.25?'scattering':'roaming',gather:state.gather,effort:state.effort,swimPhase:state.phase,
        scale:d.size,ink:d.ink,color:d.color??'ink',pigment:d.pigment??[.073,.077,.068],bodyLength:d.size*(d.species==='fish'?284:212),anatomy:model.anatomy,spatial:true}))};
  }
  update(0);
  return{root,dispose(){
    const geometries=new Set(),materials=new Set();root.traverse(mesh=>{if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)for(const material of [mesh.material].flat())materials.add(material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.clear();
  },subject:'fish and shrimp',animals,update,describe,rippleSample:()=>ripples.sample(time),rainSample:()=>rain.sample(time),setRain(value){rain.setIntensity(value);},setCurrent(value){current=value;simulation.setCurrent(value,time);},
    stir(position){simulation.stir(worldToWater(position),time);ripples.stir(position,time);},newPaths(){seed+=79;simulation=createSwimming(definitions,seed);ripples=createRipples(definitions,seed,t=>simulation.sample(t));rain.setSeed(seed);update(0);},reset(){simulation=createSwimming(definitions,seed);ripples=createRipples(definitions,seed,t=>simulation.sample(t));current=0;update(0);}};
}
