import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {buildReferenceHouse,buildCrossroadsHouse} from '../src/crossroadsArchitecture';

function inspect(group:THREE.Group,w:number,d:number){
  group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(group);
  expect(bounds.min.x).toBeGreaterThanOrEqual(-w/2-.211);
  expect(bounds.max.x).toBeLessThanOrEqual(w/2+.211);
  expect(bounds.min.z).toBeGreaterThanOrEqual(-d/2-.241);
  expect(bounds.max.z).toBeLessThanOrEqual(d/2+.241);
  group.traverse(o=>{
    if(!(o instanceof THREE.Mesh||o instanceof THREE.Line))return;
    const p=o.geometry.getAttribute('position');
    expect(p.count, o.name).toBeGreaterThan(0);
    expect(Array.from(p.array).every(Number.isFinite),o.name).toBe(true);
    if(o.geometry.getAttribute('normal'))expect(Array.from(o.geometry.getAttribute('normal').array).every(Number.isFinite),o.name).toBe(true);
    o.geometry.dispose();
  });
}
describe('reference architectural geometry',()=>{
  it('keeps all joined-wing variants inside their rectangular reserved envelope',()=>{
    for(const variant of ['front-wing','rear-wing','side-wing'] as const){
      const house=buildCrossroadsHouse(5.8,4.6,1.6,true,variant);
      expect(house.getObjectByName('roof-valley-seams')).toBeDefined();
      expect(house.getObjectByName('raised-barrel-tile-caps')).toBeDefined();
      expect(house.getObjectByName('close-only-joinery')).toBeDefined();
      inspect(house,5.8,4.6);
    }
  });
  it('builds distinct halls, open shops and a recessed upper-storey balcony without empty geometry',()=>{
    for(const kind of ['shop','dwelling','warehouse','gallery','upper-storey']){
      const house=buildReferenceHouse(5.4,3.1,kind==='upper-storey'?2.3:1.5,kind);
      expect(house.userData.upperStorey).toBe(kind==='upper-storey');
      expect(house.getObjectByName('reference-curved-tile-roof')).toBeDefined();
      inspect(house,5.4,3.1);
    }
  });
  it('makes the roof slope flatten toward its eaves',()=>{
    const house=buildReferenceHouse(5,4,1.6),roof=house.getObjectByName('reference-curved-tile-roof') as THREE.Mesh;
    const p=roof.geometry.getAttribute('position');
    const vertices=Array.from({length:p.count},(_,i)=>({x:p.getX(i),y:p.getY(i),z:p.getZ(i)})).filter(p=>Math.abs(p.x)<.1&&p.z>=0);
    const nearest=(z:number)=>vertices.reduce((a,b)=>Math.abs(b.z-z)<Math.abs(a.z-z)?b:a);
    const a=nearest(0),b=nearest(1.1),c=nearest(2.2);
    expect((a.y-b.y)/(b.z-a.z)).toBeGreaterThan((b.y-c.y)/(c.z-b.z));
    house.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line)o.geometry.dispose();});
  });
});
