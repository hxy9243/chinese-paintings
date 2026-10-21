import {expect,it} from "vitest";
import {BEND_BUILDINGS,BEND_BOATS,BEND_PEOPLE,BEND_TREES,BEND_LANDINGS} from "../src/riverBendLayout";
import {roofFootprint,onBank,shoreDepth} from "../src/passageLayout";
it("places the new roofs, trees and towpath workers on dry land around the bend",()=>{
  for(const h of BEND_BUILDINGS)for(const p of roofFootprint(h))expect(onBank(h.side,p,.05),h.id).toBe(true);
  for(const p of [...BEND_PEOPLE,...BEND_TREES]){
    expect(onBank("near",p,.1)||onBank("far",p,.1)).toBe(true);
    expect(BEND_BUILDINGS.some(h=>Math.abs(p.s-h.s)<h.width/2+.1&&Math.abs(p.d-h.d)<h.depth/2+.1)).toBe(false);
  }
  expect(BEND_LANDINGS).toHaveLength(5);
});
it("keeps the complete new moored hulls in the curved channel",()=>{
  for(const b of BEND_BOATS)for(let j=0;j<=20;j++)for(const side of [-1,1]){
    const u=(j/20-.5)*b.length*1.2,v=side*b.width*.65,
      s=b.s+u*Math.cos(b.angle)-v*Math.sin(b.angle),d=b.d+u*Math.sin(b.angle)+v*Math.cos(b.angle);
    expect(d,b.id).toBeGreaterThan(shoreDepth("far",s)+.05);
    expect(d,b.id).toBeLessThan(shoreDepth("near",s)-.05);
  }
});

it("keeps passing boats clear of the new mooring groups",async()=>{
  const {BOATS}=await import("../src/passageLayout"),{boatPose}=await import("../src/passageLife");
  let minimum=Infinity,closest="";
  for(let t=0;t<400;t+=1.5)for(const [i,hull] of BOATS.entries()){
    const p=boatPose(i,t);if(p.s>-22)continue;
    for(const b of BEND_BOATS){
      const gap=Math.max(...[p.angle,p.angle+Math.PI/2,b.angle,b.angle+Math.PI/2].map(a=>{
        const extent=(length:number,width:number,angle:number)=>.62*length*Math.abs(Math.cos(a-angle))+(.7*width+.04)*Math.abs(Math.sin(a-angle));
        return Math.abs((p.s-b.s)*Math.cos(a)+(p.d-b.d)*Math.sin(a))-extent(hull.length,hull.width,p.angle)-extent(b.length,b.width,b.angle);
      }));
      if(gap<minimum){minimum=gap;closest=`boat ${i}, ${b.id}, time ${t}`;}
    }
  }
  expect(minimum,closest).toBeGreaterThan(.02);
});
