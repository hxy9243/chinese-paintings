// Exact local broad phase: every pair that could violate clearance is within
// adjacent unit cells. This preserves long schedule sweeps as crowds grow.
export function localClearance(
  points: { s: number; d: number; radius: number; observer?: boolean }[],
  skipObserverPairs = false,
) {
  const cells = new Map<string, typeof points>();
  let minimum = Infinity;
  for (const p of points) {
    const x = Math.floor(p.s),
      y = Math.floor(p.d);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const q of cells.get(`${x + dx}:${y + dy}`) ?? []) {
          if (skipObserverPairs && p.observer && q.observer) continue;
          minimum = Math.min(
            minimum,
            Math.hypot(p.s - q.s, p.d - q.d) - p.radius - q.radius,
          );
        }
    const key = `${x}:${y}`,
      cell = cells.get(key) ?? [];
    cell.push(p);
    cells.set(key, cell);
  }
  return minimum;
}
