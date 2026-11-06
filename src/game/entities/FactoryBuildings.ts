import Phaser from "phaser";
import {
  machineImage,
  machineKinds,
  type MachineKind,
} from "../../data/production";
import type { Farm } from "../../types/game";
import { toIso } from "../map/isometric";

type Actor = {
  image: Phaser.GameObjects.Image;
  effect: Phaser.GameObjects.Graphics;
  badge: Phaser.GameObjects.Image;
  readyId: string | null;
  running: boolean;
};
/** Only owned/selected buildings are loaded. Smoke and gears pause outside the viewport. */
export class FactoryBuildings {
  private actors = new Map<string, Actor>();
  private pending = new Set<string>();
  constructor(private scene: Phaser.Scene) {}
  ensure(kind: MachineKind) {
    const key = "machine-" + kind;
    if (this.scene.textures.exists(key)) return true;
    if (!this.pending.has(key)) {
      this.pending.add(key);
      this.scene.load.image(key, machineImage(kind));
      this.scene.load.once("filecomplete-image-" + key, () =>
        this.pending.delete(key),
      );
      if (!this.scene.load.isLoading()) this.scene.load.start();
    }
    return false;
  }
  at(x: number, y: number) {
    return [...this.actors.entries()]
      .sort((a, b) => b[1].image.depth - a[1].image.depth)
      .find(
        ([, a]) =>
          a.image.getBounds().contains(x, y) ||
          (a.badge.visible && a.badge.getBounds().contains(x, y)),
      )?.[0];
  }
  objectsFor(id: string) {
    const a = this.actors.get(id);
    return a ? [a.image, a.effect, a.badge].filter((o) => o.visible) : [];
  }
  sync(farm: Farm, now: number, time: number) {
    for (const machine of farm.machines) {
      if (!this.ensure(machine.kind)) continue;
      const config = machineKinds[machine.kind],
        p = toIso(machine.x, machine.y);
      let actor = this.actors.get(machine.id);
      if (!actor) {
        const image = this.scene.add
          .image(p.x, p.y, "machine-" + machine.kind)
          .setOrigin(0.5, 0.94)
          .setData("machineId", machine.id);
        image.setDisplaySize(
          config.width,
          (config.width * image.height) / image.width,
        );
        actor = {
          image,
          effect: this.scene.add.graphics(),
          badge: this.scene.add
            .image(p.x, p.y - 75, "__WHITE")
            .setDisplaySize(25, 25)
            .setVisible(false),
          readyId: null,
          running: false,
        };
        this.actors.set(machine.id, actor);
        if (now - machine.builtAt < 5000)
          this.scene.tweens.add({
            targets: image,
            alpha: { from: 0, to: 1 },
            scaleX: { from: image.scaleX * 0.85, to: image.scaleX },
            scaleY: { from: image.scaleY * 0.85, to: image.scaleY },
            duration: 450,
            ease: "Back.Out",
          });
      }
      actor.image.setPosition(p.x, p.y).setDepth(p.y + 1);
      actor.effect.setDepth(p.y + 2);
      actor.badge
        .setPosition(p.x + config.width * 0.22, p.y - config.width * 0.61)
        .setDepth(p.y + 3);
      const ready = machine.jobs.find((job) => now >= job.readyAt);
      if (actor.readyId && actor.readyId !== ready?.id) {
        const reward = this.scene.add
          .image(actor.badge.x, actor.badge.y, actor.badge.texture.key)
          .setDisplaySize(25, 25)
          .setDepth(3500);
        this.scene.tweens.add({
          targets: reward,
          y: reward.y - 35,
          alpha: 0,
          duration: 650,
          onComplete: () => reward.destroy(),
        });
      }
      actor.readyId = ready?.id ?? null;
      actor.running = machine.jobs.some(
        (job) => now >= job.startedAt && now < job.readyAt,
      );
      if (ready) {
        const key = "product-" + ready.recipe;
        if (this.scene.textures.exists(key))
          actor.badge.setTexture(key).setVisible(true).setDisplaySize(25, 25);
        else if (!this.pending.has(key)) {
          this.pending.add(key);
          this.scene.load.svg(
            key,
            "/assets/products/production/" + ready.recipe + ".svg",
            { width: 64, height: 64 },
          );
          this.scene.load.once("filecomplete-svg-" + key, () =>
            this.pending.delete(key),
          );
          if (!this.scene.load.isLoading()) this.scene.load.start();
        }
      } else actor.badge.setVisible(false);
      actor.effect.clear();
      if (!this.scene.cameras.main.worldView.contains(p.x, p.y)) continue;
      if (ready)
        actor.effect
          .fillStyle(0xfff5d8, 0.95)
          .fillCircle(actor.badge.x, actor.badge.y, 15)
          .lineStyle(1.5, 0xc6aa72)
          .strokeCircle(actor.badge.x, actor.badge.y, 15);
      if (!actor.running) continue;
      if (config.effect === "gear") {
        const x = p.x + config.width * 0.23,
          y = p.y - config.width * 0.3;
        actor.effect
          .lineStyle(2, 0xcfa75c)
          .strokeCircle(x, y, 6)
          .fillStyle(0x87613e)
          .fillCircle(x, y, 2);
        for (let i = 0; i < 8; i++) {
          const angle = time * 0.001 + (i * Math.PI) / 4;
          actor.effect
            .lineStyle(2.5, 0xd4ad62)
            .lineBetween(
              x + Math.cos(angle) * 4,
              y + Math.sin(angle) * 4,
              x + Math.cos(angle) * 8,
              y + Math.sin(angle) * 8,
            );
        }
      } else
        for (let i = 0; i < 3; i++) {
          const phase = (time * 0.00022 + i * 0.32) % 1,
            x = p.x - config.width * 0.2 + Math.sin(phase * 5) * 5,
            y = p.y - config.width * 0.8 - phase * 24;
          actor.effect
            .fillStyle(
              config.effect === "steam" ? 0xfaf1d6 : 0xe9e1cf,
              (1 - phase) * 0.38,
            )
            .fillCircle(x, y, 3 + phase * 5);
        }
    }
    this.scene.game.canvas.dataset.machineCount = String(this.actors.size);
    this.scene.game.canvas.dataset.machinePositions = JSON.stringify(
      farm.machines.map((m) => ({ id: m.id, x: m.x, y: m.y })),
    );
  }
}
