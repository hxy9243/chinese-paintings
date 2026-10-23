import {BUILDING_KINDS} from "../src/passageLife";
import { FIGURE_HEIGHT } from "../src/figures";
import { describe, expect, it } from "vitest";
import {
  BRIDGE,
  TERRAIN_BOUNDS,
  passageOutline,
  BOATS,
  HALLS,
  GROUND_Y,
  PERSON_SCALE,
  bridgePoint,
  bridgeHeight,
  onBank,
  roofFootprint,
  shoreDepth,
} from "../src/passageLayout";

describe("reference passage geometry", () => {
  it("keeps the river open through the top and right crop and turns the bridge across the bank", () => {
    expect(passageOutline()).toHaveLength(4);
    expect(onBank("far", {s:-22,d:-16})).toBe(false);
    expect(onBank("near", {s:-22,d:-16})).toBe(false);
    expect(onBank("far", {s:24,d:0})).toBe(false);
    expect(onBank("near", {s:24,d:0})).toBe(false);
    expect(BRIDGE.far.s-BRIDGE.near.s).toBeGreaterThan(12);
    expect(BRIDGE.angle).toBeGreaterThan(-.7);
    expect(BRIDGE.angle).toBeLessThan(-.5);
  });
  it("keeps every roof overhang on its own riverbank", () => {
    for (const h of HALLS)
      for (const p of roofFootprint(h)) {
        expect(
          onBank(h.side, p, 0.24),
          `house at ${h.s}, roof at ${p.s},${p.d}`,
        ).toBe(true);
        expect(p.s).toBeGreaterThan(TERRAIN_BOUNDS.sMin);expect(p.s).toBeLessThan(TERRAIN_BOUNDS.sMax);
        expect(p.d).toBeGreaterThan(TERRAIN_BOUNDS.dMin);expect(p.d).toBeLessThan(TERRAIN_BOUNDS.dMax);
      }
  });
  const separation=(a:typeof HALLS[number],b:typeof HALLS[number],eave=false)=>{
    let gap=-Infinity;
    for(const angle of [a.angle,a.angle+Math.PI/2,b.angle,b.angle+Math.PI/2]){
      const radius=(h:typeof a)=>Math.abs(Math.cos(h.angle-angle))*(h.width/2+(eave?.2:0))+
        Math.abs(Math.sin(h.angle-angle))*(h.depth/2+(eave?.23:0));
      gap=Math.max(gap,Math.abs((a.s-b.s)*Math.cos(angle)+(a.d-b.d)*Math.sin(angle))-radius(a)-radius(b));
    }
    return gap;
  };
  it("keeps unrelated wall footprints separate",()=>{
    for(let i=0;i<HALLS.length;i++)for(let j=i+1;j<HALLS.length;j++){
      const a=HALLS[i],b=HALLS[j];if(a.attachedTo===j||b.attachedTo===i)continue;
      expect(separation(a,b),`walls ${i}/${j}`).toBeGreaterThanOrEqual(0);
    }
  });
  it("allows only minor eave overlap between distinct buildings",()=>{
    for(let i=0;i<HALLS.length;i++)for(let j=i+1;j<HALLS.length;j++){
      const a=HALLS[i],b=HALLS[j];if(a.attachedTo===j||b.attachedTo===i)continue;
      expect(separation(a,b,true),`eaves ${i}/${j}`).toBeGreaterThanOrEqual(-.15);
    }
  });
  it("attaches only the four shallow frontage galleries to their parent houses",()=>{
    const attachments=HALLS.flatMap((h,i)=>h.attachedTo===undefined?[]:[[i,h.attachedTo]]);
    expect(attachments).toEqual([[5,0],[6,1],[13,3],[14,4]]);
    for(const [index,parent]of attachments){
      const a=HALLS[index],b=HALLS[parent];
      expect(a.side).toBe(b.side);expect(a.angle).toBeCloseTo(b.angle);
      expect(a.depth).toBeLessThan(b.depth*.4);expect(a.width).toBeLessThanOrEqual(b.width);
      expect(Math.abs(a.s-b.s)).toBeLessThan(.25);
      expect(separation(a,b)).toBeLessThan(0);
      expect(Math.abs(a.d-b.d)).toBeGreaterThan(b.depth*.35);
    }
  });
  it("seats the entire bridge landing width on both banks", () => {
    for (const [sign, side] of [
      [-1, "near"],
      [1, "far"],
    ] as const) {
      for (let i = 0; i <= 20; i++) {
        const p = bridgePoint(
          (sign * BRIDGE.length) / 2,
          (i / 20 - 0.5) * (BRIDGE.width + 0.18),
        );
        expect(onBank(side, p, 0.1), `${side} landing ${p.s},${p.d}`).toBe(
          true,
        );
      }
      expect(bridgeHeight((sign * BRIDGE.length) / 2)).toBeCloseTo(GROUND_Y);
    }
    expect(bridgePoint(-BRIDGE.length / 2).s).toBeCloseTo(BRIDGE.near.s);
    expect(bridgePoint(-BRIDGE.length / 2).d).toBeCloseTo(BRIDGE.near.d);
    expect(bridgePoint(BRIDGE.length / 2).s).toBeCloseTo(BRIDGE.far.s);
    expect(bridgePoint(BRIDGE.length / 2).d).toBeCloseTo(BRIDGE.far.d);
  });
  it("keeps all boat hulls between the shorelines", () => {
    for (const b of BOATS)
      for (let i = 0; i <= 30; i++)
        for (const side of [-1, 1]) {
          const u = (i / 30 - 0.5) * b.length,
            v = side * b.width * 0.66;
          const s = b.s + u * Math.cos(b.angle) - v * Math.sin(b.angle),
            d = b.d + u * Math.sin(b.angle) + v * Math.cos(b.angle);
          expect(d, `boat ${b.s},${b.d}`).toBeGreaterThan(shoreDepth("far", s));
          expect(d, `boat ${b.s},${b.d}`).toBeLessThan(shoreDepth("near", s));
        }
  });
  it("preserves the reference's broad bridge and low roofs relative to people", () => {
    const figureHeight = FIGURE_HEIGHT * PERSON_SCALE;
    expect(BRIDGE.width / BRIDGE.length).toBeGreaterThan(0.2);
    expect(BRIDGE.width / figureHeight).toBeGreaterThan(3.5);
    expect(BRIDGE.width / figureHeight).toBeLessThan(4.1);
    expect(Math.min(...HALLS.map(h=>h.height))*.875).toBeGreaterThan(figureHeight*1.08);
    expect(Math.max(...HALLS.filter((_,i)=>!["construction","ornate-gate"].includes(BUILDING_KINDS[i])).map((h) => h.height)) / figureHeight).toBeLessThan(
      3,
    );
    expect(bridgeHeight(0)).toBeCloseTo(GROUND_Y + BRIDGE.rise);
  });
});
