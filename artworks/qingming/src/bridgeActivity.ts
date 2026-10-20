import { randomUnit } from "./peopleMotion";
export const BRIDGE_ROLES = [
  "river-watcher",
  "vendor",
  "customer",
  "conversation",
] as const;
export type BridgeRole = (typeof BRIDGE_ROLES)[number];
// Each group of four is a watcher, seller, buyer and neighbour. Their anchored
// feet keep passing lanes clear while torso, shoulders, elbows and heads act.
export function bridgeRole(index: number): BridgeRole {
  return BRIDGE_ROLES[Math.floor(index / 2) % 4];
}
const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
const bump = (p: number, a: number, b: number, c: number, d: number) =>
  smooth((p - a) / (b - a)) * (1 - smooth((p - c) / (d - c)));
export function bridgeActivity(index: number, time: number, seed = 0) {
  const role = bridgeRole(index),
    station = Math.floor(index / 2),
    side = index % 2 ? 1 : -1;
  // Shared seller/buyer timing gives a reaching and handing-over exchange.
  const pair = Math.floor(station / 4),
    id = pair * 2 + (side > 0 ? 1 : 0) + seed * 101;
  const period = 9 + randomUnit(id, 12) * 4;
  const phase = (((time / period + randomUnit(id, 21)) % 1) + 1) % 1;
  const arrange = bump(phase, 0.02, 0.12, 0.25, 0.35),
    offer = bump(phase, 0.3, 0.44, 0.62, 0.75);
  const point = bump(phase, 0.09, 0.22, 0.47, 0.64),
    talk = Math.sin(time * 2.1 + id) * 0.5 + 0.5;
  let torso = 0.03,
    twist = 0,
    leftArm = -0.2,
    rightArm = -0.2,
    leftElbow = -0.1,
    rightElbow = -0.1,
    headPitch = 0.05,
    headTurn = 0;
  let leftSpread = -0.03,
    rightSpread = 0.03,
    facing = (side * Math.PI) / 2;
  if (role === "vendor") {
    facing = ((side * Math.PI) / 2) * (1 - offer * 0.85);
    torso = 0.05 + arrange * 0.28 + offer * 0.08;
    twist = arrange * 0.12;
    leftArm = -0.5 - arrange * 0.22;
    rightArm = -0.35 - arrange * 0.4 - offer * 0.85;
    leftElbow = -0.38 - arrange * 0.35;
    rightElbow = -0.72 + offer * 0.65;
    headPitch = 0.08 + arrange * 0.28;
    headTurn = -side * offer * 0.25;
  } else if (role === "customer") {
    facing =
      Math.atan2(side * 0.43, -0.3) * (1 - offer * 0.8) +
      side * Math.PI * offer * 0.8;
    torso = 0.06 + arrange * 0.16;
    leftArm = -0.24;
    rightArm = -0.25 - offer * 0.75;
    rightElbow = -0.3 - offer * 0.22;
    headPitch = 0.12 + arrange * 0.2;
    headTurn = offer * 0.15;
  } else if (role === "river-watcher") {
    torso = 0.13 + point * 0.23;
    leftArm = -0.6 - point * 0.75;
    rightArm = -0.66;
    leftElbow = -0.55 + point * 0.5;
    rightElbow = -0.32;
    headPitch = 0.2 + point * 0.24;
    headTurn = side * Math.sin(time * 0.7 + id) * 0.22;
    leftSpread = -0.12 - point * 0.18;
    twist = side * point * 0.12;
  } else {
    facing = Math.PI;
    torso = 0.025 + talk * 0.065;
    twist = Math.sin(time * 0.9 + id) * 0.13;
    leftArm = -0.28 - talk * 0.38;
    rightArm = -0.22 - (1 - talk) * 0.32;
    leftElbow = -0.25 - talk * 0.45;
    rightElbow = -0.3 - (1 - talk) * 0.4;
    headTurn = Math.sin(time * 0.65 + id) * 0.2;
    headPitch = Math.sin(time * 1.8 + id) * 0.09;
    leftSpread = -0.12 - talk * 0.1;
    rightSpread = 0.1 + (1 - talk) * 0.12;
  }
  const plantedFacing =
    role === "conversation"
      ? Math.PI
      : role === "customer"
        ? Math.atan2(side * 0.43, -0.3)
        : (side * Math.PI) / 2;
  // Turn at the waist during an exchange; planted feet do not orbit the body.
  twist += plantedFacing - facing;
  facing = plantedFacing;
  return {
    role,
    phase,
    torso,
    twist,
    leftArm,
    rightArm,
    leftElbow,
    rightElbow,
    headPitch,
    headTurn,
    leftSpread,
    rightSpread,
    facing,
  };
}
export function bridgeVariant(index: number) {
  const role = bridgeRole(index),
    station = Math.floor(index / 2);
  return role === "vendor"
    ? 5
    : role === "customer"
      ? [0, 4, 6, 7][Math.floor(station / 4) % 4]
      : role === "river-watcher"
        ? [3, 8, 10, 9][Math.floor(station / 4) % 4]
        : [2, 6, 7, 11][Math.floor(station / 4) % 4];
}
