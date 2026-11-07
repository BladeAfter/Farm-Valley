import Phaser from "phaser";
import {
  animalHome,
  constrainAnimal,
  type PenPositions,
} from "../../data/pens";
import { feedingStage, feedingVisuals } from "../../data/feeding";
import type { Animal, AnimalKind } from "../../types/game";

/** A bounded station + food layer per animal. No commands, timers or economy writes. */
export class AnimalFeeding {
  readonly base: Phaser.GameObjects.Graphics;
  readonly food: Phaser.GameObjects.Graphics;
  private lastStage = -1;
  private visible = true;
  readonly state = {
    phase: "idle",
    foodStage: 0,
    targetX: 0,
    targetY: 0,
    foodX: 0,
    foodY: 0,
  };
  constructor(
    private scene: Phaser.Scene,
    private id: string,
    private kind: AnimalKind,
  ) {
    this.base = scene.add.graphics().setData("feedingStation", id);
    this.food = scene.add.graphics().setData("feedingFood", id);
    this.drawBase();
  }
  setVisible(visible: boolean) {
    this.visible = visible;
    this.base.setVisible(visible);
    this.food.setVisible(visible && this.lastStage > 0);
  }
  objects() {
    return [this.base, this.food];
  }
  update(
    animal: Animal,
    now: number,
    delta: number,
    root: Phaser.GameObjects.Container,
    positions?: PenPositions,
  ): "WALK" | "EAT" | null {
    const home = animalHome(this.id, positions),
      config = feedingVisuals[this.kind];
    const target = constrainAnimal(
      this.id,
      home.x - (this.kind === "chicken" ? 16 : 17),
      home.y + 8,
      positions,
    );
    const food = { x: target.x + config.mouth, y: target.y - 3 };
    this.base.setPosition(food.x, food.y).setDepth(food.y - 0.2);
    this.food.setPosition(food.x, food.y).setDepth(food.y + 0.1);
    const stage = feedingStage(animal, now);
    if (stage !== this.lastStage) {
      this.drawFood(stage);
      this.lastStage = stage;
    }
    this.food.setVisible(this.visible && stage > 0);
    Object.assign(this.state, {
      foodStage: stage,
      targetX: target.x,
      targetY: target.y,
      foodX: food.x,
      foodY: food.y,
    });
    root.setData("feeding", this.state);
    if (!stage) {
      this.state.phase = "idle";
      return null;
    }
    const distance = Phaser.Math.Distance.Between(
      root.x,
      root.y,
      target.x,
      target.y,
    );
    const age = now - animal.fedAt!;
    if (distance > 1.5) {
      const step = Math.min(distance, delta * 0.022);
      root.setPosition(
        root.x + ((target.x - root.x) / distance) * step,
        root.y + ((target.y - root.y) / distance) * step,
      );
      this.state.phase = "walk";
      return "WALK";
    }
    if (age < config.approach) {
      this.state.phase = "eat";
      return "EAT";
    }
    this.state.phase = "eat";
    return "EAT";
  }
  private drawBase() {
    const g = this.base;
    if (this.kind === "chicken") {
      if (this.id.endsWith("2")) return; // One hopper, two separate grain patches.
      g.fillStyle(0x8c5134).fillEllipse(0, 0, 24, 10);
      g.fillStyle(0xc76d47).fillEllipse(0, -2, 24, 9);
      g.fillStyle(0xf3e2b7).fillRoundedRect(-7, -20, 14, 18, 4);
      g.fillStyle(0xd2bd94).fillRect(1, -18, 6, 13);
      g.fillStyle(0xb6623c).fillTriangle(-10, -18, 0, -27, 10, -18);
      g.lineStyle(1, 0xf4ce8d).strokeEllipse(0, -2, 24, 9);
      return;
    }
    const rack = this.kind === "goat" || this.kind === "sheep",
      width = this.kind === "cow" ? 22 : 17;
    g.fillStyle(0x996337).fillPoints(
      [
        { x: -width, y: -6 },
        { x: 0, y: 4 },
        { x: 0, y: 12 },
        { x: -width, y: 2 },
      ],
      true,
    );
    g.fillStyle(0x70452c).fillPoints(
      [
        { x: 0, y: 4 },
        { x: width, y: -5 },
        { x: width, y: 3 },
        { x: 0, y: 12 },
      ],
      true,
    );
    g.fillStyle(0x5e4829).fillPoints(
      [
        { x: -width, y: -6 },
        { x: -2, y: -14 },
        { x: width, y: -5 },
        { x: 0, y: 4 },
      ],
      true,
    );
    g.lineStyle(2.5, 0xd5aa6c).strokePoints(
      [
        { x: -width, y: -6 },
        { x: -2, y: -14 },
        { x: width, y: -5 },
        { x: 0, y: 4 },
      ],
      true,
    );
    for (let i = 0; i < 4; i++)
      g.lineStyle(0.8, 0xe0b77a, 0.7).lineBetween(
        -width + 3 + i * 4,
        -3 + i * 1.8,
        -width + 3 + i * 4,
        1 + i * 1.8,
      );
    if (rack)
      for (const x of [-width + 3, width - 3]) {
        g.lineStyle(3, 0x956738).lineBetween(x, 1, x, -18);
        g.lineStyle(1, 0xe4bd7c).lineBetween(x - 1, 0, x - 1, -18);
      }
  }
  private drawFood(stage: number) {
    const g = this.food;
    g.clear();
    if (!stage) return;
    if (this.kind === "chicken") {
      for (let i = 0; i < stage * 6; i++) {
        const x = ((i * 17) % 29) - 14,
          y = ((i * 11) % 13) - 5;
        g.fillStyle(i % 3 ? 0xe7b642 : 0xf5d76c).fillEllipse(x, y, 2.8, 1.6);
        if (i % 4 === 0)
          g.fillStyle(0xffe8a3).fillCircle(x - 0.4, y - 0.4, 0.6);
      }
      return;
    }
    if (this.kind === "pig") {
      g.fillStyle(0xb79b52).fillEllipse(0, -5, stage * 5, stage * 1.7);
      for (let i = 0; i < stage * 4; i++)
        g.fillStyle(
          i % 3 === 0 ? 0xdb8a3d : i % 2 ? 0xc7ad64 : 0x8e8d45,
        ).fillCircle(((i * 7) % 23) - 11, -8 + ((i * 11) % 6), 1.5);
      return;
    }
    const green = this.kind !== "cow";
    for (let i = 0; i < stage * 8; i++) {
      const x = ((i * 13) % 29) - 14,
        y = -7 + ((i * 7) % 8);
      g.lineStyle(
        1.4,
        green ? (i % 2 ? 0xa9bb58 : 0x76994a) : i % 2 ? 0xe4c45b : 0xcda647,
      );
      g.lineBetween(x, y, x + 3 + (i % 4), y - 5 - (i % 3));
      if (i % 3 === 0)
        g.lineStyle(0.7, green ? 0xc7d77a : 0xffdf7a).lineBetween(
          x,
          y - 1,
          x + 4,
          y - 5,
        );
    }
  }
}
