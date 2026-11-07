import { AnimalFeeding } from "./AnimalFeeding";
import { constrainAnimal, animalHome } from "../../data/pens";
import Phaser from "phaser";
import { animalRemaining } from "../../types/game";
import { farmNow, useFarm } from "../../store/useFarm";

type Behavior = "IDLE" | "WALK" | "EAT" | "REST" | "PRODUCE";

/** Complete anatomical poses replace the cow's detached cutout parts. */
export class CowSprite {
  readonly root: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  readonly feeding: AnimalFeeding;
  private badge: Phaser.GameObjects.Container;
  private origin: Phaser.Math.Vector2;
  private target: Phaser.Math.Vector2;
  private behavior: Behavior = "IDLE";
  private nextBehavior = 0;
  private fedAt: number | null | undefined;
  private direction = 1;
  private pausedOffscreen = false;

  constructor(
    private scene: Phaser.Scene,
    readonly id: string,
    x: number,
    y: number,
  ) {
    this.feeding = new AnimalFeeding(scene, id, "cow");
    this.origin = new Phaser.Math.Vector2(x, y);
    this.target = this.origin.clone();
    this.root = scene.add.container(x, y).setDepth(y + 1);
    this.root.setData("animalId", id);
    this.root.setData("visualVersion", 4);
    this.root.add(scene.add.ellipse(0, 1, 52, 12, 0x33452a, 0.15));
    this.sprite = scene.add.sprite(0, 0, "cow-v4", 0).setOrigin(0.5, 184 / 192);
    this.sprite.setDisplaySize(84, 63);
    this.root.add(this.sprite);

    for (const [name, frames, rate] of [
      ["walk", [2, 3], 4],
      ["eat", [4, 5], 2.5],
    ] as const) {
      const key = "cow-v4-" + name;
      if (!scene.anims.exists(key))
        scene.anims.create({
          key,
          frames: frames.map((frame) => ({ key: "cow-v4", frame })),
          frameRate: rate,
          repeat: -1,
        });
    }
    this.badge = scene.add.container(5, -60).setVisible(false);
    const icon = scene.add.graphics();
    icon.fillStyle(0xfff6db).fillCircle(0, 0, 12);
    icon.lineStyle(1.5, 0xc4a771).strokeCircle(0, 0, 12);
    icon.fillStyle(0xe8ede4).fillRoundedRect(-5, -5, 10, 13, 3);
    icon.fillStyle(0x91b8b8).fillRoundedRect(-4, -9, 8, 5, 1);
    icon.fillStyle(0x77a5a6).fillRect(-5, 1, 10, 4);
    icon.lineStyle(1, 0x799593).strokeRoundedRect(-5, -5, 10, 13, 3);
    this.badge.add(icon);
    this.root.add(this.badge);
  }

  private setBehavior(behavior: Behavior) {
    if (this.behavior === behavior) return;
    this.behavior = behavior;
    if (behavior === "WALK") this.sprite.play("cow-v4-walk");
    else if (behavior === "EAT") this.sprite.play("cow-v4-eat");
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
      new Phaser.Geom.Rectangle(this.root.x - 48, this.root.y - 72, 96, 85),
    );
    if (!visible) {
      this.feeding.setVisible(false);
      this.sprite.anims.pause();
      this.pausedOffscreen = true;
      return;
    }
    if (this.pausedOffscreen) {
      this.sprite.anims.resume();
      this.pausedOffscreen = false;
    }
    const animal = useFarm
      .getState()
      .snapshot?.farm.animals.find((a) => a.id === this.id);
    if (!animal) return;
    const ready = animalRemaining(animal, farmNow()) === 0;
    this.feeding.setVisible(true);
    const eating = this.feeding.update(
      animal,
      farmNow(),
      delta,
      this.root,
      useFarm.getState().snapshot?.farm.penPositions,
    );
    if (eating) {
      this.setBehavior(eating);
      this.direction = 1;
      this.root.setDepth(this.root.y + 1).setScale(this.direction, 1);
      this.badge.setVisible(false);
      return;
    }

    if (this.fedAt !== animal.fedAt) {
      this.fedAt = animal.fedAt;
      this.nextBehavior = 0;
    }
    if (time >= this.nextBehavior) {
      const cycle: Behavior[] = ready
        ? ["PRODUCE", "IDLE"]
        : animal.fedAt !== null
          ? ["IDLE", "REST", "WALK", "IDLE"]
          : ["IDLE", "WALK", "IDLE", "REST"];
      const behavior = cycle[Math.floor(time / 6000) % cycle.length];
      this.setBehavior(behavior);
      this.nextBehavior = time + 5500;
      if (behavior === "WALK") {
        this.target.set(
          this.origin.x + Math.sin(time * 0.0006) * 8,
          this.origin.y + Math.cos(time * 0.0006) * 4,
        );
        const dx = this.target.x - this.root.x;
        if (Math.abs(dx) > 4) this.direction = dx < 0 ? -1 : 1;
      }
    }
    if (this.behavior === "WALK") {
      const step = Math.min(1, delta * 0.0009);
      this.root.x = Phaser.Math.Linear(this.root.x, this.target.x, step);
      this.root.y = Phaser.Math.Linear(this.root.y, this.target.y, step);
    } else if (this.behavior === "IDLE" || this.behavior === "PRODUCE") {
      const phase = time % 6000;
      this.sprite.setFrame(
        phase > 5650 && phase < 5800 ? 1 : phase > 5000 && phase < 5300 ? 7 : 0,
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
    this.badge.setVisible(ready);
  }
}
