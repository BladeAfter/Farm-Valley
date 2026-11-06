import Phaser from "phaser";
import type { Farm } from "../../types/game";
import { obstacleKinds, type Obstacle } from "../../types/land";
import { toIso } from "../map/isometric";
import { obstacleRect } from "../../data/land";
import { useFarm } from "../../store/useFarm";

export class NaturalObstacles {
  private actors = new Map<string, Phaser.GameObjects.Image>();
  private footprints!: Phaser.GameObjects.Graphics;
  private lastRevision = -1;
  private seed = -1;
  constructor(private scene: Phaser.Scene) {
    this.footprints = scene.add.graphics().setDepth(-790);
    scene.game.canvas.dataset.obstaclesVersion = "1";
  }
  at(x: number, y: number) {
    const sorted = [...this.actors.entries()]
      .filter(([, a]) => !a.getData("removing"))
      .sort((a, b) => b[1].depth - a[1].depth);
    for (const [id, image] of sorted) {
      const bounds = image.getBounds();
      if (!bounds.contains(x, y)) continue;
      const u = (x - bounds.x) / bounds.width,
        v = (y - bounds.y) / bounds.height,
        source = image.texture.getSourceImage();
      if (
        (this.scene.textures.getPixelAlpha(
          Math.floor((image.flipX ? 1 - u : u) * source.width),
          Math.floor(v * source.height),
          image.texture.key,
        ) ?? 0) > 50
      )
        return id;
    }
    return undefined;
  }
  sync(farm: Farm) {
    if (this.seed !== farm.landSeed) {
      for (const actor of this.actors.values()) actor.destroy();
      this.actors.clear();
      this.seed = farm.landSeed;
      this.lastRevision = -1;
    }
    if (import.meta.env.DEV) {
      this.scene.game.canvas.dataset.obstacleCount = String(
        farm.obstacles.filter((o) => o.removedAt === null).length,
      );
      this.scene.game.canvas.dataset.actualFps =
        this.scene.game.loop.actualFps.toFixed(1);
    }
    if (this.lastRevision !== farm.revision) {
      this.lastRevision = farm.revision;
      for (const obstacle of farm.obstacles) {
        let actor = this.actors.get(obstacle.id);
        if (obstacle.removedAt !== null) {
          if (actor && !actor.getData("removing")) this.remove(obstacle, actor);
          continue;
        }
        if (!actor) {
          const def = obstacleKinds[obstacle.kind],
            p = toIso(
              obstacle.x + (def.w - 1) / 2,
              obstacle.y + (def.h - 1) / 2,
            );
          actor = this.scene.add
            .image(p.x, p.y, def.texture)
            .setOrigin(0.5, 0.94)
            .setDepth(p.y + 0.5)
            .setData("obstacleId", obstacle.id);
          const source = actor.texture.getSourceImage(),
            variation = 1 + (obstacle.variant - 1.5) * 0.025;
          actor
            .setDisplaySize(
              def.width * variation,
              (def.width * variation * source.height) / source.width,
            )
            .setFlipX(obstacle.variant % 2 === 1);
          if (obstacle.variant === 3) actor.setTint(0xf3eed7);
          if (!farm.areas.find((a) => a.id === obstacle.areaId)?.unlocked)
            actor.setAlpha(0.72);
          this.actors.set(obstacle.id, actor);
        }
      }
    }
    this.footprints.clear();
    const selected =
      useFarm.getState().panel === "obstacle"
        ? useFarm.getState().obstacleId
        : null;
    for (const [id, actor] of this.actors) {
      if (actor.getData("removing")) continue;
      actor.setTint(
        id === selected ? 0xfff0bb : actor.flipX ? 0xf9f4e7 : 0xffffff,
      );
      if (id === selected) {
        const o = farm.obstacles.find((o) => o.id === id)!;
        const r = obstacleRect(o);
        const points = [
          [r.x, r.y],
          [r.x + r.w, r.y],
          [r.x + r.w, r.y + r.h],
          [r.x, r.y + r.h],
        ].map(([x, y]) => toIso(x, y));
        this.footprints
          .fillStyle(0xffedb3, 0.15)
          .fillPoints(points, true)
          .lineStyle(1.5, 0xffe4a2, 0.9)
          .strokePoints(points, true);
      }
    }
  }
  private remove(obstacle: Obstacle, actor: Phaser.GameObjects.Image) {
    actor.setData("removing", true);
    const config = obstacleKinds[obstacle.kind],
      leaves = config.effect === "leaves",
      wood = config.effect === "wood";
    const visible = this.scene.cameras.main.worldView.contains(
      actor.x,
      actor.y,
    );
    if (!visible) {
      actor.destroy();
      this.actors.delete(obstacle.id);
      return;
    }
    for (let i = 0; i < 10; i++) {
      const particle = leaves
        ? this.scene.add.ellipse(
            actor.x,
            actor.y - 18,
            5,
            2.5,
            i % 2 ? 0x9fb956 : 0xc5c96e,
          )
        : this.scene.add.polygon(
            actor.x,
            actor.y - 12,
            [0, -3, 4, 0, 2, 3, -2, 2],
            wood ? 0xb88c4e : 0xb8b39c,
          );
      particle.setDepth(actor.depth + 10);
      this.scene.tweens.add({
        targets: particle,
        x: actor.x + Math.sin(i * 2.4) * 35,
        y: actor.y - 5 - Math.abs(Math.cos(i * 2)) * 30,
        alpha: 0,
        angle: i * 35,
        duration: 550 + i * 23,
        onComplete: () => particle.destroy(),
      });
    }
    this.scene.tweens.add({
      targets: actor,
      alpha: 0,
      angle: leaves ? 13 : wood ? 7 : 0,
      y: actor.y + (leaves ? 5 : 2),
      scaleX: actor.scaleX * 0.85,
      scaleY: actor.scaleY * 0.85,
      duration: 680,
      ease: "Sine.easeIn",
      onComplete: () => {
        actor.destroy();
        this.actors.delete(obstacle.id);
      },
    });
  }
}
