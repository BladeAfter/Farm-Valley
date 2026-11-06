import Phaser from "phaser";
import { toIso } from "../map/isometric";
import type { Plot } from "../../types/game";
import { fieldBatches } from "../../data/fields";

/** One textured bed, with an invisible interaction grid over continuous soil. */
export class FieldTerrain {
  private shape = "";
  private soil: Phaser.GameObjects.TileSprite;
  private mask: Phaser.GameObjects.Graphics;
  private detail: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene) {
    this.mask = new Phaser.GameObjects.Graphics(scene);
    this.soil = scene.add
      .tileSprite(0, 0, 1, 1, "soil")
      .setDepth(-710)
      .setTileScale(0.48)
      .setVisible(false);
    this.soil.setMask(this.mask.createGeometryMask());
    this.detail = scene.add.graphics().setDepth(-709);
    scene.events.once("shutdown", () => this.mask.destroy());
  }

  sync(plots: Plot[]) {
    const signature = plots.map((p) => p.x + "," + p.y).join("|");
    if (signature === this.shape) return;
    this.shape = signature;
    this.mask.clear();
    this.detail.clear();
    if (!plots.length) {
      this.soil.setVisible(false);
      return;
    }
    const projected = plots.map((p) => toIso(p.x, p.y));
    const left = Math.min(...projected.map((p) => p.x)) - 50,
      right = Math.max(...projected.map((p) => p.x)) + 50;
    const top = Math.min(...projected.map((p) => p.y)) - 28,
      bottom = Math.max(...projected.map((p) => p.y)) + 28;
    this.soil
      .setPosition((left + right) / 2, (top + bottom) / 2)
      .setSize(right - left, bottom - top)
      .setVisible(true);
    for (const { minX, maxX, minY, maxY } of fieldBatches(plots)) {
      const corners = [
        toIso(minX - 0.49, minY - 0.49),
        toIso(maxX + 0.49, minY - 0.49),
        toIso(maxX + 0.49, maxY + 0.49),
        toIso(minX - 0.49, maxY + 0.49),
      ];
      const contour: Phaser.Types.Math.Vector2Like[] = [];
      for (let side = 0; side < 4; side++) {
        const a = corners[side],
          b = corners[(side + 1) % 4];
        const length = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        const steps = Math.ceil(length / 7);
        const nx = -(b.y - a.y) / length,
          ny = (b.x - a.x) / length;
        for (let i = 0; i < steps; i++) {
          const t = (i + 0.5) / steps;
          const roughness = Math.sin((i + side * 19) * 2.37) * 0.9;
          contour.push({
            x: Phaser.Math.Linear(a.x, b.x, t) + nx * roughness,
            y: Phaser.Math.Linear(a.y, b.y, t) + ny * roughness,
          });
        }
      }
      this.mask.fillStyle(0xffffff).fillPoints(contour, true);
      this.detail.lineStyle(2, 0x58462d, 0.2).strokePoints(contour, true);

      // Continuous plough furrows cross the whole bed. They never outline cells.
      const rows = Math.floor((maxY - minY + 0.8) / 0.26);
      for (let row = 0; row <= rows; row++) {
        const y = minY - 0.38 + row * 0.26;
        const points: Phaser.Types.Math.Vector2Like[] = [];
        for (let j = 0; j <= 30; j++) {
          const p = toIso(
            Phaser.Math.Linear(minX - 0.4, maxX + 0.4, j / 30),
            y,
          );
          points.push({
            x: p.x,
            y: p.y + Math.sin(j * 0.83 + row * 0.9) * 0.55,
          });
        }
        this.detail.lineStyle(2.8, 0x49301f, 0.23).strokePoints(points, false);
        this.detail.lineStyle(1.1, 0xd0a076, 0.25).strokePoints(
          points.map((p) => ({ x: p.x, y: p.y - 1.35 })),
          false,
        );
      }
      // Small crumbs break the outside edge into the surrounding lawn.
      for (let i = 0; i < contour.length; i += 3) {
        const p = contour[i],
          r = 1 + (i % 3) * 0.25;
        this.detail
          .fillStyle(i % 2 ? 0x88613e : 0x6b4a30, 0.6)
          .fillEllipse(
            p.x + Math.sin(i) * 2,
            p.y + Math.cos(i) * 1.2,
            r * 2,
            r,
          );
      }
    }
  }
}
