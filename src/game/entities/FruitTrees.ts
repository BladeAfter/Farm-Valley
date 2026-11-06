import Phaser from "phaser";
import {
  fruitSpecies,
  fruitStage,
  fruitFrame,
  type FruitSpecies,
  type FruitTree,
} from "../../types/orchard";
import type { Farm } from "../../types/game";
import { useFarm } from "../../store/useFarm";
import { toIso } from "../map/isometric";

type Actor = {
  sprite: Phaser.GameObjects.Sprite;
  badge: Phaser.GameObjects.Graphics;
  count: number;
  stage: string;
};
export class FruitTrees {
  private actors = new Map<string, Actor>();
  private pending = new Set<string>();
  private seed = -1;
  constructor(private scene: Phaser.Scene) {
    scene.game.canvas.dataset.orchardVersion = "1";
  }
  private ensure(species: FruitSpecies) {
    const key = "fruit-tree-" + species;
    if (this.scene.textures.exists(key)) return true;
    if (!this.pending.has(key)) {
      this.pending.add(key);
      this.scene.load.spritesheet(
        key,
        "/assets/trees/orchard/" + species + "/stages-v1.webp",
        { frameWidth: 192, frameHeight: 192 },
      );
      this.scene.load.once("filecomplete-spritesheet-" + key, () =>
        this.pending.delete(key),
      );
      if (!this.scene.load.isLoading()) this.scene.load.start();
    }
    return false;
  }
  at(x: number, y: number) {
    for (const [id, actor] of [...this.actors.entries()].sort(
      (a, b) => b[1].sprite.depth - a[1].sprite.depth,
    )) {
      const s = actor.sprite,
        b = s.getBounds();
      if (!b.contains(x, y)) continue;
      const u = (x - b.x) / b.width,
        v = (y - b.y) / b.height;
      if (
        (this.scene.textures.getPixelAlpha(
          Math.floor(u * s.frame.width),
          Math.floor(v * s.frame.height),
          s.texture.key,
          s.frame.name,
        ) ?? 0) > 50
      )
        return id;
    }
    return undefined;
  }
  sync(farm: Farm, now: number) {
    if (this.seed !== farm.landSeed) {
      for (const a of this.actors.values()) {
        a.sprite.destroy();
        a.badge.destroy();
      }
      this.actors.clear();
      this.seed = farm.landSeed;
    }
    const states: Record<string, number | string> = {};
    for (const tree of farm.fruitTrees) {
      const stage = fruitStage(tree, now),
        config = fruitSpecies[tree.species];
      let actor = this.actors.get(tree.id);
      if (stage === "removed") {
        if (actor) {
          this.scene.tweens.add({
            targets: actor.sprite,
            alpha: 0,
            duration: 550,
            onComplete: () => actor!.sprite.destroy(),
          });
          actor.badge.destroy();
          this.actors.delete(tree.id);
        }
        continue;
      }
      if (!this.ensure(tree.species)) continue;
      if (!actor) {
        const p = toIso(tree.x, tree.y),
          sprite = this.scene.add
            .sprite(p.x, p.y, "fruit-tree-" + tree.species)
            .setOrigin(0.5, 184 / 192)
            .setDisplaySize(config.width, config.width)
            .setDepth(p.y + 0.4);
        const badge = this.scene.add
          .graphics()
          .setPosition(p.x, p.y - config.width * 0.87)
          .setDepth(p.y + 1);
        badge
          .fillStyle(0xfff5d6)
          .fillCircle(0, 0, 7)
          .lineStyle(1, 0xbba66b)
          .strokeCircle(0, 0, 7)
          .lineStyle(1.6, 0x7d9650)
          .lineBetween(-3, 0, -1, 2)
          .lineBetween(-1, 2, 3, -3);
        actor = { sprite, badge, count: tree.harvestCount, stage: "" };
        this.actors.set(tree.id, actor);
      }
      if (actor.stage !== stage) {
        if (stage === "dry") {
          actor.sprite.setTexture("obstacle-dead-tree");
          const s = actor.sprite.texture.getSourceImage();
          actor.sprite
            .setOrigin(0.5, 0.94)
            .setDisplaySize(80, (80 * s.height) / s.width);
        } else
          actor.sprite
            .setTexture("fruit-tree-" + tree.species, fruitFrame(stage))
            .setOrigin(0.5, 184 / 192)
            .setDisplaySize(config.width, config.width);
        actor.stage = stage;
      }
      actor.badge.setVisible(stage === "ready");
      const selected =
        useFarm.getState().panel === "fruitTree" &&
        useFarm.getState().fruitTreeId === tree.id;
      actor.sprite.setTint(selected ? 0xffedc3 : 0xffffff);
      if (tree.harvestCount > actor.count) this.reward(tree, actor);
      actor.count = tree.harvestCount;
      states[tree.id] = stage === "dry" ? "dry" : fruitFrame(stage);
    }
    const signature = JSON.stringify(states);
    if (this.scene.game.canvas.dataset.orchardFrames !== signature)
      this.scene.game.canvas.dataset.orchardFrames = signature;
  }
  private reward(tree: FruitTree, actor: Actor) {
    const sprite = actor.sprite;
    if (!this.scene.cameras.main.worldView.contains(sprite.x, sprite.y)) return;
    this.scene.tweens.add({
      targets: sprite,
      angle: { from: -1.5, to: 1.5 },
      yoyo: true,
      repeat: 2,
      duration: 65,
      onComplete: () => sprite.setAngle(0),
    });
    const config = fruitSpecies[tree.species];
    for (let i = 0; i < config.yield; i++) {
      const icon = this.scene.add
        .image(
          sprite.x + (i - 1) * 10,
          sprite.y - 50,
          "fruit-icon-" + tree.species,
        )
        .setDisplaySize(15, 15)
        .setDepth(sprite.depth + 20);
      this.scene.tweens.add({
        targets: icon,
        x: icon.x + (i - 1) * 13,
        y: icon.y - 40 - i * 7,
        alpha: 0,
        duration: 750,
        onComplete: () => icon.destroy(),
      });
    }
    const label = this.scene.add
      .text(sprite.x, sprite.y - 60, "+" + config.yield, {
        fontFamily: "Trebuchet MS",
        fontSize: "19px",
        fontStyle: "bold",
        color: "#fff5b2",
        stroke: "#6c803e",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(sprite.depth + 21);
    this.scene.tweens.add({
      targets: label,
      y: label.y - 45,
      alpha: 0,
      duration: 950,
      onComplete: () => label.destroy(),
    });
  }
}
