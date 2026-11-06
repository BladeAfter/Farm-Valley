/** Rectangular batches cover only actual plots, never the free land between separate beds. */
export function fieldBatches(plots: { x: number; y: number }[]) {
  const pending = new Set(plots.map((p) => `${p.x},${p.y}`)),
    result: { minX: number; maxX: number; minY: number; maxY: number }[] = [];
  for (const p of [...plots].sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (!pending.has(`${p.x},${p.y}`)) continue;
    let w = 1,
      h = 1;
    while (pending.has(`${p.x + w},${p.y}`)) w++;
    while (
      Array.from({ length: w }, (_, x) =>
        pending.has(`${p.x + x},${p.y + h}`),
      ).every(Boolean)
    )
      h++;
    for (let x = 0; x < w; x++)
      for (let y = 0; y < h; y++) pending.delete(`${p.x + x},${p.y + y}`);
    result.push({ minX: p.x, maxX: p.x + w - 1, minY: p.y, maxY: p.y + h - 1 });
  }
  return result;
}
