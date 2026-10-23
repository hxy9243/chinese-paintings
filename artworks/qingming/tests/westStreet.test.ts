import {expect,it} from "vitest";
import {HALLS} from "../src/passageLayout";
import {CROSSROADS_ROUTES,CROSSROADS_PEOPLE} from "../src/crossroads";

it("forms a continuous street between inward-facing rectangular shop rows",()=>{
  const west=[34,33,29].map(i=>HALLS[i]);
  const east=[31,23,7].map(i=>HALLS[i]);
  for(const h of west)expect(-Math.sin(h.angle)).toBeGreaterThan(.99);
  for(const h of east)expect(-Math.sin(h.angle)).toBeLessThan(-.99);
  // Each sampled street station has a frontage on both sides, allowing only
  // narrow alleys between adjacent houses instead of a dispersed house grid.
  for(let d=-20;d<=-2;d+=.25){
    const nearest=(row:typeof west)=>row.reduce((best,h)=>{
      const gap=Math.max(0,Math.abs(d-h.d)-h.width/2);
      return gap<best.gap?{h,gap}:best;
    },{h:row[0],gap:Infinity});
    const a=nearest(west),b=nearest(east);
    expect(a.gap,`west frontage at ${d}`).toBeLessThan(.6);
    expect(b.gap,`east frontage at ${d}`).toBeLessThan(.6);
    const left=a.h.s+a.h.depth/2,right=b.h.s-b.h.depth/2;
    expect(right-left).toBeGreaterThan(3.5);
    expect(right-left).toBeLessThan(5);
    expect(-37.7-left).toBeGreaterThan(1.2);
    expect(right+37.7).toBeGreaterThan(1.2);
  }
  expect(CROSSROADS_ROUTES[1].at(-1)![1]).toBeGreaterThan(25);
  for(const i of [19,10,30])expect(Math.cos(HALLS[i].angle)).toBeLessThan(-.99);
});

it("keeps crossroads residents clear of the complete ox-cart footprints",()=>{
  for(const [s,d,angle]of [[-40.3,6.5,.05],[-37.6,12.4,Math.PI/2]])
    for(const p of CROSSROADS_PEOPLE){
      const ds=p.s-s,dd=p.d-d,u=ds*Math.cos(angle)+dd*Math.sin(angle),v=-ds*Math.sin(angle)+dd*Math.cos(angle);
      expect(Math.abs(u)>2.1||Math.abs(v)>.97,`resident ${p.s},${p.d} beside cart ${s},${d}`).toBe(true);
    }
});
