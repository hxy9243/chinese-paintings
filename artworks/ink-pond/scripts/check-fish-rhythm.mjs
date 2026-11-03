import assert from 'node:assert/strict';
import {createSwimming,SWIM_LIMITS} from '../src/swimming.js';
import {createPond,ANIMALS} from '../src/pond.js';
import {createFish} from '../src/models/fish.js';

const fish=ANIMALS.filter(a=>a.species==='fish'),simulation=createSwimming(fish),quiet=fish.map(()=>[]),active=fish.map(()=>[]);
let mixed=0,previous=null,restExample=null,swimExample=null;
for(let frame=0;frame<=1200;frame++){
  const t=frame/10,states=simulation.sample(t);
  if(states.some(a=>a.effort<.01)&&states.some(a=>a.effort>.8))mixed++;
  states.forEach((s,i)=>{
    const speed=Math.hypot(...s.velocity.slice(0,2));
    assert.ok(Math.abs(s.turnRate)<=SWIM_LIMITS.fishTurnRate+1e-9);
    if(previous)assert.ok(Math.abs(speed-Math.hypot(...previous[i].velocity.slice(0,2)))<=1.101,'Speed changes must ease');
    if(t>10&&s.effort<.01&&speed<9){quiet[i].push(t);if(i===0&&!restExample)restExample={time:t,state:s};}
    if(t>10&&s.effort>.8&&speed>35){active[i].push(t);if(i===0&&!swimExample)swimExample={time:t,state:s};}
  });previous=states;
}
assert.ok(quiet.every(times=>times.length>40),'Every fish must have visible quiet drifts');
assert.ok(active.every(times=>times.length>40),'Every fish must resume swimming');
assert.ok(mixed>300,'Fish must have independent rhythms');
const saved=simulation.sample(37.25);simulation.sample(150);assert.deepEqual(simulation.sample(37.25),saved);
const entry=createSwimming([{...fish[0],entry:true}],5363);assert.ok(Math.hypot(...entry.sample(4)[0].velocity.slice(0,2))>35,'New fish must swim into view before resting');

// Check actual deformed tail vertices, so a quiet simulation cannot leave a
// fully wagging model or freeze a strongly bent tail in place.
const pond=createPond(),animal=pond.animals.find(a=>a.definition.id==='fish-1');
const neutral=createFish('A',{fastGeometry:true,guideNormals:false}),restMesh=neutral.root.getObjectByName('tail-upper');
function tailDisplacement(time){
  pond.update(time);const p=animal.model.root.getObjectByName('tail-upper').geometry.attributes.position.array,q=restMesh.geometry.attributes.position.array;
  return Math.max(...Array.from(p,(_,i)=>Math.abs(p[i]-q[i])));
}
const quietTail=tailDisplacement(restExample.time),swimmingTail=tailDisplacement(swimExample.time);
assert.ok(quietTail<1,'Resting tail should settle near straight');assert.ok(swimmingTail>quietTail*10,'Swimming must visibly restore the tail stroke');
const restPhase=simulation.sample(restExample.time+.1)[0].phase-restExample.state.phase;
assert.ok(restPhase<.02,'Tail cadence should slow during rest');
pond.dispose();neutral.root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
console.log(JSON.stringify({pass:true,restSeconds:quiet.map(a=>a.length/10),swimSeconds:active.map(a=>a.length/10),independentSeconds:mixed/10,restExample,swimExample,quietTail,swimmingTail,restPhase},null,2));
