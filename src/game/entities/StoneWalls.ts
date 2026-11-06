import Phaser from "phaser";
import { toIso } from "../map/isometric";
import {
  buildWallGraph,
  wallPathsFromCells,
  type WallPath,
  type WallPoint,
} from "../map/walls";

const HEIGHT = 22,
  HALF = 0.13;
const noise = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const tint = (color: number, delta: number) =>
  "#" +
  [16, 8, 0]
    .map((s) =>
      Phaser.Math.Clamp(((color >> s) & 255) + delta, 0, 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

/** Shared organic stone material, projected in grid space onto continuous 3D faces.
 * Only built on placement changes; the world renders cached small sprites afterwards.
 */
export class StoneWalls {
  private objects: Phaser.GameObjects.Image[] = [];
  private textures: string[] = [];
  private serial = 0;
  private prefix = "stone-" + Phaser.Utils.String.UUID();
  private context!: CanvasRenderingContext2D;
  private origin!: WallPoint;
  constructor(
    private scene: Phaser.Scene,
    paths: readonly WallPath[],
  ) {
    this.replace(paths);
  }
  destroy() {
    for (const o of this.objects) o.destroy();
    for (const k of this.textures) this.scene.textures.remove(k);
    this.objects = [];
    this.textures = [];
  }
  replace(paths: readonly WallPath[]) {
    const graph = buildWallGraph(paths);
    this.destroy();
    const consumed = new Set<object>();
    for (const first of graph.edges) {
      if (consumed.has(first)) continue;
      consumed.add(first);
      let a = first.a,
        b = first.b;
      for (const side of ["a", "b"] as const) {
        let current = side === "a" ? a : b;
        while (current.shape.startsWith("straight")) {
          const next = graph.edges.find(
            (e) =>
              !consumed.has(e) &&
              (e.a.key === current.key || e.b.key === current.key),
          );
          if (!next) break;
          consumed.add(next);
          current = next.a.key === current.key ? next.b : next.a;
        }
        if (side === "a") a = current;
        else b = current;
      }
      this.run(a, b, !a.shape.startsWith("end"), !b.shape.startsWith("end"));
    }
    for (const n of graph.nodes) {
      if (n.shape === "single")
        this.run(
          { x: n.x - 0.34, y: n.y },
          { x: n.x + 0.34, y: n.y },
          false,
          false,
        );
      else if (n.shape.startsWith("corner") || n.shape === "connection")
        this.bake(n, () => {
          this.block(
            n.x - HALF,
            n.y - HALF,
            n.x + HALF,
            n.y + HALF,
            0,
            19.6,
            n.x + n.y,
            true,
          );
          this.block(
            n.x - HALF,
            n.y - HALF,
            n.x + HALF,
            n.y + HALF,
            19.3,
            2.7,
            n.x * 31 + n.y,
            false,
          );
        });
    }
    this.scene.game.canvas.dataset.wallsVersion = "2";
  }
  replaceCells(cells: readonly WallPoint[], step = 0.5) {
    this.replace(wallPathsFromCells(cells, step));
  }
  private bake(origin: WallPoint, draw: () => void) {
    const key = this.prefix + "-" + this.serial++,
      texture = this.scene.textures.createCanvas(key, 224, 192)!;
    this.context = texture.context;
    this.origin = toIso(origin.x, origin.y);
    this.context.scale(2, 2);
    this.context.translate(56, 72);
    draw();
    texture.refresh();
    this.objects.push(
      this.scene.add
        .image(this.origin.x, this.origin.y, key)
        .setOrigin(0.5, 0.75)
        .setDisplaySize(112, 96)
        .setDepth(this.origin.y + 1),
    );
    this.textures.push(key);
  }
  private project(x: number, y: number, z: number) {
    const p = toIso(x, y);
    return { x: p.x - this.origin.x, y: p.y - this.origin.y - z };
  }
  private polygon(points: WallPoint[], color: string) {
    const ctx = this.context;
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  private face(
    a: WallPoint,
    b: WallPoint,
    z: number,
    height: number,
    shade: number,
  ) {
    const ctx = this.context,
      topA = this.project(a.x, a.y, z + height),
      topB = this.project(b.x, b.y, z + height);
    const bottomA = this.project(a.x, a.y, z),
      bottomB = this.project(b.x, b.y, z);
    this.polygon([topA, topB, bottomB, bottomA], "#b7b09b");
    ctx.save();
    ctx.clip();
    const source = this.scene.textures
      .get("wall-stone")
      .getSourceImage() as HTMLImageElement;
    // World-coordinate phase aligns material at cached strip boundaries and through corners.
    const scale = source.width / 2.6,
      u0 = (a.x + a.y) * scale,
      u1 = (b.x + b.y) * scale;
    if (Math.abs(u1 - u0) > 0.001) {
      const sx = (topB.x - topA.x) / (u1 - u0),
        sy = (topB.y - topA.y) / (u1 - u0);
      ctx.transform(
        sx,
        sy,
        0,
        height / source.height,
        topA.x - sx * u0,
        topA.y - sy * u0,
      );
      ctx.fillStyle = ctx.createPattern(source, "repeat")!;
      ctx.fillRect(Math.min(u0, u1), 0, Math.abs(u1 - u0), source.height);
    }
    ctx.restore();
    if (shade) {
      ctx.save();
      ctx.globalAlpha = Math.abs(shade);
      this.polygon(
        [topA, topB, bottomB, bottomA],
        shade > 0 ? "#fff0ce" : "#474b42",
      );
      ctx.restore();
    }
  }
  private block(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    z: number,
    h: number,
    seed: number,
    material: boolean,
    skipStart = false,
    skipEnd = false,
    axis = "x",
  ) {
    const bevel = material
      ? 0.009
      : Math.min(0.075, (x2 - x1) * 0.28, (y2 - y1) * 0.28);
    const v = Array.from(
      { length: 4 },
      (_, i) => bevel * (0.7 + noise(seed + i * 21) * 0.6),
    );
    const pts = [
      { x: x1 + v[0], y: y1 },
      { x: x2 - v[1], y: y1 },
      { x: x2, y: y1 + v[1] },
      { x: x2, y: y2 - v[2] },
      { x: x2 - v[2], y: y2 },
      { x: x1 + v[3], y: y2 },
      { x: x1, y: y2 - v[3] },
      { x: x1, y: y1 + v[0] },
    ];
    const palette = [0xc5c1ae, 0xbdbdae, 0xc8c0aa, 0xb5baa9, 0xc6c2b2],
      color = palette[Math.floor(noise(seed) * 5)];
    for (const i of [0, 7, 1, 6, 2, 5, 3, 4]) {
      if (
        material &&
        ((axis === "x" && i === 6) || (axis === "y" && i === 0)) &&
        skipStart
      )
        continue;
      if (
        material &&
        ((axis === "x" && i === 2) || (axis === "y" && i === 4)) &&
        skipEnd
      )
        continue;
      const a = pts[i],
        b = pts[(i + 1) % 8];
      if (material)
        this.face(
          a,
          b,
          z,
          h,
          i === 2 || i === 3 ? -0.16 : i === 4 || i === 5 ? -0.035 : 0,
        );
      else
        this.polygon(
          [
            this.project(a.x, a.y, z),
            this.project(b.x, b.y, z),
            this.project(b.x, b.y, z + h - 0.9),
            this.project(a.x, a.y, z + h - 0.9),
          ],
          tint(color, i < 4 ? -15 : -4),
        );
    }
    const cx = (x1 + x2) / 2,
      cy = (y1 + y2) / 2;
    const inset = pts.map((p) => ({
      x: Phaser.Math.Linear(p.x, cx, 0.1),
      y: Phaser.Math.Linear(p.y, cy, 0.1),
    }));
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      this.polygon(
        [
          this.project(pts[i].x, pts[i].y, z + h - 0.9),
          this.project(pts[j].x, pts[j].y, z + h - 0.9),
          this.project(inset[j].x, inset[j].y, z + h),
          this.project(inset[i].x, inset[i].y, z + h),
        ],
        tint(color, i < 2 ? 24 : 10),
      );
    }
    this.polygon(
      inset.map((p) => this.project(p.x, p.y, z + h)),
      tint(color, 20),
    );
    if (!material) {
      const ctx = this.context;
      for (let i = 0; i < 5; i++) {
        const p = this.project(
          x1 + (x2 - x1) * (0.2 + noise(seed + i * 13) * 0.6),
          y1 + (y2 - y1) * (0.2 + noise(seed + i * 29) * 0.6),
          z + h,
        );
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = i % 2 ? "#fff5de" : "#888b7c";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 1.2 + noise(seed + i), 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  private run(
    start: WallPoint,
    end: WallPoint,
    trimStart: boolean,
    trimEnd: boolean,
  ) {
    const axis = start.x !== end.x ? "x" : "y";
    if (start[axis] > end[axis]) {
      [start, end] = [end, start];
      [trimStart, trimEnd] = [trimEnd, trimStart];
    }
    const from = start[axis] + (trimStart ? HALF : 0),
      to = end[axis] - (trimEnd ? HALF : 0);
    if (to <= from) return;
    const seed = Math.round(start.x * 107 + start.y * 173);
    const caps: { lo: number; hi: number; seed: number }[] = [];
    for (let t = from, i = 0; t < to - 1e-6; i++) {
      const hi = Math.min(to, t + 0.32 + noise(seed + i * 17) * 0.23);
      caps.push({ lo: t, hi, seed: seed + i * 17 });
      t = hi;
    }
    const chunks = Math.ceil(to - from);
    for (let c = 0; c < chunks; c++) {
      const lo = from + ((to - from) * c) / chunks,
        hi = from + ((to - from) * (c + 1)) / chunks;
      const center = { ...start, [axis]: (lo + hi) / 2 };
      this.bake(center, () => {
        const ctx = this.context,
          a = this.project(
            axis === "x" ? lo : start.x,
            axis === "y" ? lo : start.y,
            0,
          ),
          b = this.project(
            axis === "x" ? hi : start.x,
            axis === "y" ? hi : start.y,
            0,
          );
        ctx.strokeStyle = "#33492c18";
        ctx.lineWidth = 9;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(a.x + 3, a.y + 3);
        ctx.lineTo(b.x + 3, b.y + 3);
        ctx.stroke();
        this.block(
          axis === "x" ? lo : start.x - HALF,
          axis === "y" ? lo : start.y - HALF,
          axis === "x" ? hi : start.x + HALF,
          axis === "y" ? hi : start.y + HALF,
          0,
          19.6,
          seed,
          true,
          c > 0,
          c < chunks - 1,
          axis,
        );
        for (const s of caps) {
          const mid = (s.lo + s.hi) / 2;
          if (mid < lo || mid >= hi) continue;
          this.block(
            axis === "x" ? s.lo + 0.004 : start.x - HALF,
            axis === "y" ? s.lo + 0.004 : start.y - HALF,
            axis === "x" ? s.hi - 0.004 : start.x + HALF,
            axis === "y" ? s.hi - 0.004 : start.y + HALF,
            19.3,
            2.7,
            s.seed,
            false,
          );
        }
      });
    }
  }
}
