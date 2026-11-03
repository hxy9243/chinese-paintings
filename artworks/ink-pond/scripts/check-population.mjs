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
