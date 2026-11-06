import { constrainAnimal, animalHome } from "../../data/pens";
import Phaser from "phaser";
import {
  animalRemaining,
  animalOutput,
  type AnimalKind,
} from "../../types/game";
import { farmNow, useFarm } from "../../store/useFarm";

type Kind = Extract<AnimalKind, "goat" | "pig" | "sheep">;
type Behavior = "IDLE" | "WALK" | "EAT" | "REST" | "PRODUCE";
export class PastureAnimal {
  readonly root: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private badge: Phaser.GameObjects.Container;
  private origin: Phaser.Math.Vector2;
  private target: Phaser.Math.Vector2;
  private behavior: Behavior = "IDLE";
  private nextBehavior = 0;
  private fedAt: number | null | undefined;
  private direction = 1;
  private phase: number;
  private paused = false;

  constructor(
    private scene: Phaser.Scene,
    readonly id: string,
    private kind: Kind,
    x: number,
    y: number,
  ) {
    this.origin = new Phaser.Math.Vector2(x, y);
    this.target = this.origin.clone();
    this.phase = kind === "goat" ? 700 : 2100;
    this.root = scene.add
      .container(x, y)
      .setDepth(y + 1)
      .setData("animalId", id)
      .setData("visualVersion", 1);
    if (kind === "goat")
      this.root.add(scene.add.ellipse(0, 1, 38, 9, 0x33452a, 0.15));
    const key = kind + "-v1",
      width = kind === "goat" ? 64 : kind === "sheep" ? 64 : 58;
    this.sprite = scene.add
      .sprite(0, 0, key, 0)
      .setOrigin(0.5, 184 / 192)
      .setDisplaySize(width, (width * 192) / 256);
    this.root.add(this.sprite);
    for (const [name, frames, rate] of [
      ["walk", [2, 3], kind === "goat" ? 4 : 4.5],
      ["eat", [4, 5], 3],
    ] as const) {
      const anim = key + "-" + name;
      if (!scene.anims.exists(anim))
        scene.anims.create({
          key: anim,
          frames: frames.map((frame) => ({ key, frame })),
          frameRate: rate,
          repeat: -1,
        });
    }
    this.badge = scene.add
      .container(3, kind === "goat" ? -52 : -43)
      .setVisible(false);
    const g = scene.add.graphics();
    g.fillStyle(0xfff6db).fillCircle(0, 0, 10);
    g.lineStyle(1.2, 0xc4a771).strokeCircle(0, 0, 10);
    if (kind === "goat") {
      g.fillStyle(0xeee8db).fillRoundedRect(-4, -4, 8, 11, 2);
      g.fillStyle(0x9d8bb5).fillRoundedRect(-3, -7, 6, 4, 1);
      g.fillStyle(0x9d8bb5).fillRect(-4, 1, 8, 3);
      g.lineStyle(0.7, 0x897799).strokeRoundedRect(-4, -4, 8, 11, 2);
    } else {
      g.fillStyle(0x67503b).fillCircle(-3, 1, 4.5).fillCircle(3, 2, 4);
      g.fillStyle(0xc6ad87).fillCircle(2, -2, 4);
      g.lineStyle(0.7, 0x74543b)
        .lineBetween(0, -4, 3, 0)
        .lineBetween(2, -5, 1, -1)
        .lineBetween(1, -2, 5, -1);
    }
    if (kind !== "goat") {
      g.clear();
      this.badge.add(
        scene.add
          .image(
            0,
            0,
            "animal-product-" + (kind === "sheep" ? "wool" : "bacon"),
          )
          .setDisplaySize(22, 22),
      );
    }
    this.badge.add(g);
    this.root.add(this.badge);
  }
  private setBehavior(behavior: Behavior) {
    if (this.behavior === behavior) return;
    this.behavior = behavior;
    if (behavior === "WALK") this.sprite.play(this.kind + "-v1-walk");
    else if (behavior === "EAT") this.sprite.play(this.kind + "-v1-eat");
    else this.sprite.stop().setFrame(behavior === "REST" ? 6 : 0);
    this.root.setData("behavior", behavior);
  }
  update(time: number, delta: number) {
    const home = animalHome(
      this.id,
      useFarm.getState().snapshot?.farm.penPositions,
    );
    const dxHome = home.x - this.origin.x,
      dyHome = home.y - this.origin.y;
    if (dxHome || dyHome) {
      this.root.x += dxHome;
      this.root.y += dyHome;
      this.target.x += dxHome;
      this.target.y += dyHome;
      this.origin.set(home.x, home.y);
      this.root.setDepth(this.root.y + 1);
    }
    const visible = Phaser.Geom.Rectangle.Overlaps(
      this.scene.cameras.main.worldView,
      new Phaser.Geom.Rectangle(this.root.x - 38, this.root.y - 64, 76, 78),
    );
    if (!visible) {
      this.sprite.anims.pause();
      this.paused = true;
      return;
    }
    if (this.paused) {
      this.sprite.anims.resume();
      this.paused = false;
    }
    const animal = useFarm
      .getState()
      .snapshot?.farm.animals.find((a) => a.id === this.id);
    if (!animal) return;
    const ready = animalRemaining(animal, farmNow()) === 0;
    if (this.fedAt !== animal.fedAt) {
      this.fedAt = animal.fedAt;
      if (animal.fedAt !== null && !ready) {
        this.setBehavior("EAT");
        this.nextBehavior = time + 6000;
      }
    }
    const local = time + this.phase;
    if (time >= this.nextBehavior) {
      const cycle: Behavior[] = ready
        ? ["PRODUCE", "IDLE"]
        : animal.fedAt !== null
          ? ["EAT", "REST", "WALK", "IDLE"]
          : ["IDLE", "WALK", "REST", "IDLE"];
      const behavior = cycle[Math.floor(local / 5300) % cycle.length];
      this.setBehavior(behavior);
      this.nextBehavior = time + 4100;
      if (behavior === "WALK") {
        this.target.set(
          this.origin.x + Math.sin(local * 0.0007) * 7,
          this.origin.y + Math.cos(local * 0.0007) * 3,
        );
        const dx = this.target.x - this.root.x;
        if (Math.abs(dx) > 3) this.direction = dx < 0 ? -1 : 1;
      }
    }
    if (this.behavior === "WALK") {
      const step = Math.min(1, delta * 0.001);
      this.root.x = Phaser.Math.Linear(this.root.x, this.target.x, step);
      this.root.y = Phaser.Math.Linear(this.root.y, this.target.y, step);
    } else if (this.behavior === "IDLE" || this.behavior === "PRODUCE") {
      const phase = local % 5700;
      this.sprite.setFrame(
        phase > 5350 && phase < 5500 ? 1 : phase > 4400 && phase < 4700 ? 7 : 0,
      );
    }
    const safe = constrainAnimal(
      this.id,
      this.root.x,
      this.root.y,
      useFarm.getState().snapshot?.farm.penPositions,
    );
    this.root.setPosition(safe.x, safe.y);
    this.root.setDepth(this.root.y + 1).setScale(this.direction, 1);
    if (this.kind !== "goat" && ready) {
      const icon = this.badge.list.find(
        (o) => o instanceof Phaser.GameObjects.Image,
      ) as Phaser.GameObjects.Image | undefined;
      icon?.setTexture("animal-product-" + animalOutput(animal));
    }
    this.badge.setVisible(ready);
  }
}
