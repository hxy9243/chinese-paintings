// Seeded schedules vary by person and visit, while remaining repeatable for tests.
export function randomUnit(seed: number, step: number) {
  const n = Math.sin(seed * 127.1 + step * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
export function activityClock(person: number, time: number, seed = 0) {
  const id = person + seed * 101,
    offset = randomUnit(id, 4) * 18;
  const sample = (t: number) => {
    const cycle = Math.floor(t / 18),
      local = t - cycle * 18,
      pause = 1.2 + randomUnit(id, cycle + 11) * 2;
    return {
      progress: cycle * 18 + (Math.max(0, local - pause) * 18) / (18 - pause),
      moving: local > pause,
    };
  };
  const current = sample(time + offset);
  return {
    progress: current.progress - sample(offset).progress,
    moving: current.moving,
  };
}
export function wander(person: number, time: number, radius: number, seed = 0) {
  const id = person + seed * 101,
    clock = time + randomUnit(id, 3) * 16,
    cycle = Math.floor(clock / 16),
    local = clock - cycle * 16;
  const pause = 3 + randomUnit(id, cycle + 9) * 4;
  const target = (step: number) => {
    const a = randomUnit(id, step * 2 + 31) * Math.PI * 2,
      r = radius * (0.35 + 0.65 * randomUnit(id, step * 2 + 32));
    return { s: Math.cos(a) * r, d: Math.sin(a) * r };
  };
  const from = target(cycle),
    to = target(cycle + 1),
    t = Math.max(0, (local - pause) / (16 - pause));
  const blend = t * t * (3 - 2 * t),
    ds = to.s - from.s,
    dd = to.d - from.d;
  return {
    s: from.s + ds * blend,
    d: from.d + dd * blend,
    angle: Math.atan2(dd, ds),
    moving: local > pause,
    stride: blend * Math.hypot(ds, dd) * 38,
  };
}
export function idleMotion(person: number, time: number, seed = 0) {
  const phase = randomUnit(person + seed * 101, 17) * Math.PI * 2;
  return {
    lean: Math.sin(time * 0.9 + phase) * 0.025,
    breath: (1 + Math.sin(time * 1.7 + phase)) * 0.003,
    look: Math.sin(time * 0.37 + phase) * 0.14,
  };
}
