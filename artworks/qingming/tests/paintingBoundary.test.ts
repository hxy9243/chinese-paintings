import {describe,it,expect} from 'vitest';
import {paintingEdgeAlpha} from '../src/paintingBoundary';
import {paintMaterial,createDryInk} from '../src/paintMaterial';
import {createBoatWakes} from '../src/boatWakes';
describe('shared paper edge',()=>{
 it('preserves the interior and fully removes the exterior on every side',()=>{
  for(const [s,d] of [[-54,0],[34,0],[0,-23],[0,23]])expect(paintingEdgeAlpha(s,d)).toBe(1);
  for(const [s,d] of [[-57,0],[37,0],[0,-26],[0,26]]){expect(paintingEdgeAlpha(s,d)).toBeGreaterThan(0);expect(paintingEdgeAlpha(s,d)).toBeLessThan(.8);}
  for(const [s,d] of [[-61,0],[41,0],[0,-30],[0,30],[-61,30]])expect(paintingEdgeAlpha(s,d)).toBe(0);
 });
 it('fades smoothly while people move through the edge',()=>{
  let previous=1;
  for(let d=22;d<=30;d+=.01){const alpha=paintingEdgeAlpha(17,d);expect(Math.abs(previous-alpha)).toBeLessThan(.01);previous=alpha;}
  expect(previous).toBe(0);
 });
 it('shares the world mask across surfaces, ink and wakes',()=>{
  const materials=[paintMaterial(0x777777),paintMaterial(0x777777,true),createDryInk(),createBoatWakes().mesh.material];
  for(const m of materials){expect(m.transparent).toBe(true);expect(m.fragmentShader).toContain('float paintingEdgeAlpha(vec3 world)');expect(m.fragmentShader).toMatch(/paintingEdgeAlpha\((point|brush)\)/);m.dispose();}
 });
});
