export type WallPoint = { x: number; y: number };
export type WallPath = readonly WallPoint[];
export type WallNode = WallPoint & { key: string; mask: number; shape: string };
export type WallEdge = { a: WallNode; b: WallNode };
const key = (p: WallPoint) =>
  `${Math.round(p.x * 10000)},${Math.round(p.y * 10000)}`;
export const wallShape = (mask: number) => {
  const n = [1, 2, 4, 8].filter((bit) => mask & bit).length;
  if (!n) return "single";
  if (n === 1) return mask & 3 ? "end-start" : "end-final";
  if (n > 2) return "connection";
  if (mask === 5) return "straight-x";
  if (mask === 10) return "straight-y";
  return mask === 3 || mask === 12 ? "corner-outer" : "corner-inner";
};

/** Tile-placement adapter: neighbours connect automatically, regardless of input order. */
export function wallPathsFromCells(
  cells: readonly WallPoint[],
  step = 0.5,
): WallPath[] {
  if (!Number.isFinite(step) || step <= 0)
    throw new Error("Invalid wall grid spacing");
  const unique = new Map(cells.map((p) => [key(p), p]));
  const paths: WallPath[] = [];
  for (const p of unique.values()) {
    let linked = false;
    for (const [dx, dy] of [
      [step, 0],
      [0, step],
      [-step, 0],
      [0, -step],
    ]) {
      const neighbor = unique.get(key({ x: p.x + dx, y: p.y + dy }));
      if (!neighbor) continue;
      linked = true;
      if (dx > 0 || dy > 0) paths.push([p, neighbor]);
    }
    if (!linked) paths.push([p]);
  }
  return paths;
}

/** Split at every endpoint/intersection, deduplicate shared edges, then infer neighbours. */
export function buildWallGraph(paths: readonly WallPath[]) {
  const segments: { a: WallPoint; b: WallPoint }[] = [];
  for (const path of paths)
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1],
        b = path[i];
      if (![a.x, a.y, b.x, b.y].every(Number.isFinite))
        throw new Error("Invalid wall coordinates");
      if (a.x !== b.x && a.y !== b.y)
        throw new Error("Walls must follow the isometric grid axes");
      if (key(a) !== key(b)) segments.push({ a, b });
    }
  const nodes = new Map<string, WallNode>();
  const node = (p: WallPoint) => {
    if (![p.x, p.y].every(Number.isFinite))
      throw new Error("Invalid wall coordinates");
    const k = key(p);
    if (!nodes.has(k)) nodes.set(k, { ...p, key: k, mask: 0, shape: "single" });
    return nodes.get(k)!;
  };
  for (const path of paths) for (const p of path) node(p);
  const on = (p: WallPoint, s: { a: WallPoint; b: WallPoint }) =>
    Math.abs(
      (s.b.x - s.a.x) * (p.y - s.a.y) - (s.b.y - s.a.y) * (p.x - s.a.x),
    ) < 1e-8 &&
    p.x >= Math.min(s.a.x, s.b.x) - 1e-8 &&
    p.x <= Math.max(s.a.x, s.b.x) + 1e-8 &&
    p.y >= Math.min(s.a.y, s.b.y) - 1e-8 &&
    p.y <= Math.max(s.a.y, s.b.y) + 1e-8;
  for (const s of segments)
    for (const t of segments) {
      if ((s.a.x === s.b.x) === (t.a.x === t.b.x)) continue;
      const p =
        s.a.x === s.b.x ? { x: s.a.x, y: t.a.y } : { x: t.a.x, y: s.a.y };
      if (on(p, s) && on(p, t)) node(p);
    }
  const edges = new Map<string, WallEdge>();
  for (const s of segments) {
    const points = [...nodes.values()]
      .filter((p) => on(p, s))
      .sort((a, b) => a.x - b.x || a.y - b.y);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      edges.set([a.key, b.key].sort().join("|"), { a, b });
    }
  }
  for (const { a, b } of edges.values()) {
    const bit = b.x > a.x ? 1 : b.y > a.y ? 2 : b.x < a.x ? 4 : 8;
    a.mask |= bit;
    b.mask |= bit === 1 ? 4 : bit === 2 ? 8 : bit === 4 ? 1 : 2;
  }
  for (const n of nodes.values()) n.shape = wallShape(n.mask);
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

export const farmWalls: WallPath[] = [
  [
    { x: 6.6, y: 6.5 },
    { x: 12.8, y: 6.5 },
  ],
  [
    { x: 6.6, y: 10.8 },
    { x: 10.7, y: 10.8 },
  ],
];

/** Shared footprint for future placement tools: continuous cell coordinates, no rounded hitboxes. */
export function wallContainsPoint(
  paths: readonly WallPath[],
  p: WallPoint,
  clearance = 0,
) {
  const radius = 0.13 + clearance;
  for (const path of paths) {
    if (
      path.length === 1 &&
      Math.hypot(p.x - path[0].x, p.y - path[0].y) <= radius
    )
      return true;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1],
        b = path[i],
        dx = b.x - a.x,
        dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
      if (Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy) <= radius)
        return true;
    }
  }
  return false;
}
