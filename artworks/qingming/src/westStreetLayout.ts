import type { HallLayout } from "./passageLayout";

// The crossroads crop shows a continuous north/south street between facing
// shop rows, opening into an east/west lane. The previous scattered houses
// described isolated objects but left no readable street wall.
// Rotations preserve rectangular footprints: west shops face east, east
// shops face west, and the foreground joined roofs face the cross street.
export const WEST_STREET_HOUSES: Record<number, Partial<HallLayout>> = {
  34: {s:-42.3,d:-18,width:7,depth:5,angle:-Math.PI/2},
  33: {s:-42.3,d:-10,width:7,depth:5,angle:-Math.PI/2},
  29: {s:-42.3,d:-3.7,width:4,depth:5,angle:-Math.PI/2},
  31: {s:-33,d:-17,width:6.2,depth:4.8,angle:Math.PI/2},
  23: {s:-33,d:-10,width:6.4,depth:4.8,angle:Math.PI/2},
  7: {s:-33,d:-3.3,width:6,depth:4.6,angle:Math.PI/2},
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
