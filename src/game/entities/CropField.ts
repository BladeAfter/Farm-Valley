import Phaser from "phaser";
import { toIso } from "../map/isometric";
import { crops, type Plot } from "../../types/game";
export class CropField {
  readonly container: Phaser.GameObjects.Container;
  private signature = "";
  private sprites: Phaser.GameObjects.Image[] = [];
  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
  ) {
    const p = toIso(x, y);
    this.container = scene.add.container(p.x, p.y).setDepth(p.y + 0.5);
  }
  render(plot: Plot, now: number, preview = false) {
    const growth = plot.crop
      ? Math.max(
          0,
          Math.min(1, (now - plot.plantedAt) / crops[plot.crop].duration),
        )
      : 0;
    const stage = growth >= 1 ? 3 : growth >= 0.42 ? 2 : growth >= 0.13 ? 1 : 0;
    const signature = [plot.crop, stage, preview].join();
    if (signature === this.signature) return;
    this.signature = signature;
    this.container.removeAll(true);
    this.sprites = [];
    const g = this.scene.add.graphics();
    this.container.add(g);
    if (preview) {
      g.fillStyle(0xffed9c, 0.3).fillPoints(
        [
          { x: 0, y: -21 },
          { x: 43, y: 0 },
          { x: 0, y: 23 },
          { x: -43, y: 0 },
        ],
        true,
      );
      g.lineStyle(2, 0xffed9c).strokePoints(
        [
          { x: 0, y: -21 },
          { x: 43, y: 0 },
          { x: 0, y: 23 },
          { x: -43, y: 0 },
        ],
        true,
      );
    }
    if (!plot.crop) return;
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        const p = toIso((col - 1) * 0.29, (row - 1) * 0.29);
        if (stage === 0) {
          g.fillStyle(0xd3a564, 0.8).fillEllipse(p.x, p.y, 3, 1.5);
          continue;
        }
        if ((stage === 1 || stage === 2) && plot.crop !== "wheat") {
          // Early wheat has narrow leaf blades and tillers; no mature heads yet.
          const h = stage === 1 ? 9 : 23;
          for (let leaf = 0; leaf < 3; leaf++) {
            const dx = (leaf - 1) * 3;
            g.fillStyle(stage === 1 ? 0x72aa38 : 0x5c982c);
            g.fillTriangle(
              p.x,
              p.y,
              p.x + dx - 4,
              p.y - h * 0.8,
              p.x + dx,
              p.y - h,
            );
            g.fillStyle(0x9dc646).fillTriangle(
              p.x + 1,
              p.y,
              p.x + dx + 5,
              p.y - h * 0.65,
              p.x + dx + 2,
              p.y - h * 0.9,
            );
          }
        } else {
          const key =
            plot.crop === "wheat" && stage < 3
              ? stage === 1
                ? "wheat-sprout"
                : "wheat-growing"
              : plot.crop;
          const im = this.scene.add
            .image(p.x, p.y + 2, key)
            .setOrigin(0.5, 0.98);
          const source = this.scene.textures.get(key).getSourceImage();
          const height =
            stage === 1
              ? 15
              : stage === 2
                ? 31
                : plot.crop === "wheat"
                  ? 46
                  : plot.crop === "carrot"
                    ? 29
                    : plot.crop === "soybean"
                      ? 35
                      : plot.crop === "sugarcane"
                        ? 65
                        : plot.crop === "strawberry"
                          ? 24
                          : plot.crop === "potato"
                            ? 32
                            : 61;
          im.setDisplaySize((height * source.width) / source.height, height);
          this.container.add(im);
          this.sprites.push(im);
        }
      }
  }
  sway(time: number) {
    const rect = this.scene.cameras.main.worldView;
    if (!rect.contains(this.container.x, this.container.y)) return;
    for (let i = 0; i < this.sprites.length; i++)
      this.sprites[i].setRotation(
        Math.sin(time * 0.0014 + this.x * 0.6 + this.y * 0.4 + i * 0.2) * 0.018,
      );
  }
  destroy() {
    this.container.destroy();
  }
}
