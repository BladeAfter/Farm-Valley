import Phaser from "phaser";
import type { Farm } from "../../types/game";
import { deliveryTruckState } from "../../data/deliveryTruck";
import { toIso } from "../map/isometric";
export class DeliveryTruck {
  private image: Phaser.GameObjects.Image;
  private crates: Phaser.GameObjects.Graphics;
  constructor(private scene: Phaser.Scene) {
    this.image = scene.add.image(0, 0, "truck-out").setOrigin(0.5, 0.88);
    this.crates = scene.add.graphics();
  }
  sync(farm: Farm, now: number) {
    const state = deliveryTruckState(farm.orderBoard?.truck, now);
    const p = toIso(5, 3.2 + state.progress * 23);
    this.image.setTexture(
      state.phase === "returning" ? "truck-in" : "truck-out",
    );
    const source = this.image.texture.getSourceImage();
    this.image
      .setDisplaySize(91, (91 * source.height) / source.width)
      .setPosition(p.x, p.y)
      .setDepth(p.y + 0.4)
      .setVisible(state.visible);
    this.crates.clear().setDepth(p.y + 1);
    if (state.phase === "loading") {
      const t = (now - farm.orderBoard!.truck!.departedAt) / 1500;
      for (let i = 0; i < 3; i++) {
        const progress = Phaser.Math.Clamp(t * 2 - i * 0.35, 0, 1);
        if (progress <= 0 || progress >= 1) continue;
        const x = p.x + 52 * (1 - progress) + i * 3,
          y = p.y - 25 - 18 * Math.sin(progress * Math.PI);
        this.crates
          .fillStyle(0xb9813f)
          .fillRoundedRect(x - 5, y - 7, 10, 8, 1)
          .lineStyle(1, 0xf1cf83)
          .strokeRect(x - 5, y - 7, 10, 8);
      }
    }
    this.scene.game.canvas.dataset.deliveryTruck = JSON.stringify({
      ...state,
      x: p.x,
      y: p.y,
      returnsAt: farm.orderBoard?.truck?.returnsAt ?? null,
    });
  }
  at(x: number, y: number) {
    return this.image.visible && this.image.getBounds().contains(x, y);
  }
}
