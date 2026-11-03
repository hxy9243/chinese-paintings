import assert from 'node:assert/strict';
import {createPond,populationDefinitions,POPULATION_LIMITS} from '../src/pond.js';
assert.equal(populationDefinitions(-1,100).length,POPULATION_LIMITS.shrimp);
for(const [fish,shrimp] of [[5,5],[0,0],[0,1],[1,0],[8,12]]){
 const pond=createPond({fish,shrimp});pond.update(12.3);const first=pond.describe();
 assert.equal(first.fish,fish);assert.equal(first.shrimp,shrimp);assert.equal(first.animals.length,fish+shrimp);
 assert.ok(Number.isFinite(first.ripples.initialDiameter));
 assert.ok(first.animals.every(a=>a.position.every(Number.isFinite)&&a.quaternion.every(Number.isFinite)));
 pond.update(30);pond.update(12.3);assert.deepEqual(pond.describe().animals,first.animals);
 pond.setRain(0);pond.newPaths();assert.equal(pond.describe().rain.intensity,0);
 pond.dispose();assert.equal(pond.root.children.length,0);
 console.log(`Population ${fish} fish + ${shrimp} shrimp: finite, repeatable, disposable`);
}

// Editing a mature pond must keep the actual models, current, rain, ripples,
// cached history and every surviving pose. Only the new animal starts at t=0.
const pond=createPond();pond.update(90);pond.setCurrent(12);pond.setRain(.8);pond.stir([30,50,0]);pond.update(90);
const before=pond.describe(),models=pond.animals.map(a=>a.model),cached=before.simulation.generatedSteps;
pond.setPopulation({fish:6,shrimp:6});const added=pond.describe();
assert.equal(added.time,90);assert.equal(added.current,12);assert.equal(added.rain.intensity,.8);
assert.equal(added.simulation.generatedSteps,cached,'Adding must not replay the established pond');
assert.deepEqual(added.animals.filter(a=>before.animals.some(b=>b.id===a.id)),before.animals);
assert.deepEqual(added.ripples,before.ripples);assert.ok(pond.animals.every((a,i)=>a.model===models[i]));
const newcomers=added.animals.filter(a=>a.born===90);assert.equal(newcomers.length,2);assert.ok(newcomers.every(a=>a.entrySide));
pond.update(91);const moving=pond.describe();assert.ok(newcomers.every(a=>Math.hypot(...moving.animals.find(b=>b.id===a.id).position.map((v,i)=>v-a.position[i]))>10));
pond.update(105);pond.update(90);assert.deepEqual(pond.describe().animals,added.animals);
pond.setPopulation({fish:5,shrimp:5});const removed=pond.describe();assert.deepEqual(removed.animals,before.animals);
pond.update(106);pond.update(90);assert.deepEqual(pond.describe().animals,before.animals);
pond.dispose();console.log('Live edits: survivors, weather, history and model identities retained; entries swim; removal is immediate');
