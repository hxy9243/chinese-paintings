import type { HallLayout } from "./passageLayout";

// The crossroads crop shows a continuous north/south street between facing
// shop rows, opening into an east/west lane. The previous scattered houses
// described isolated objects but left no readable street wall.
// Rotations preserve rectangular footprints: west shops face east, east
// shops face west with their backs to the bank, and the foreground joined
// roofs face the cross street.
export const WEST_STREET_HOUSES: Record<number, Partial<HallLayout>> = {
  34: {s:-42.3,d:-18,width:7,depth:5,angle:-Math.PI/2},
  33: {s:-42.3,d:-10,width:7,depth:5,angle:-Math.PI/2},
  29: {s:-42.3,d:-3.7,width:4,depth:5,angle:-Math.PI/2},
  // The east row stands on the river bend, as painted: each house runs from
  // the street front back to the bank and turns with it, so the backs line the
  // water behind a strip of open bank about 1.3 wide, above the moored boats.
  31: {s:-33.2,d:-16.68,width:6.2,depth:4.31,angle:1.34},
  23: {s:-32.42,d:-9.46,width:6.4,depth:5.81,angle:1.428},
  7: {s:-31.88,d:-2.31,width:6,depth:6.99,angle:1.36},
  19: {s:-43.3,d:11.8,width:8,depth:5.4,angle:Math.PI},
  10: {s:-30.4,d:12.5,width:8.2,depth:5.8,angle:Math.PI},
  30: {s:-52,d:11.9,width:8,depth:5.2,angle:Math.PI},
  28: {s:-43.5,d:20.4,width:8,depth:5.2,angle:-Math.PI/2},
  32: {s:-32.8,d:21,width:7.5,depth:5,angle:Math.PI/2},
};

export function applyWestStreetLayout(halls: HallLayout[]) {
  for (const [index, placement] of Object.entries(WEST_STREET_HOUSES))
    Object.assign(halls[Number(index)], placement);
}
