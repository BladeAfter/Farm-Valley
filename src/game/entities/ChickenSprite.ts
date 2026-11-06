import { constrainAnimal, animalHome } from "../../data/pens";
import Phaser from "phaser";
import { animalRemaining } from "../../types/game";
import { farmNow, useFarm } from "../../store/useFarm";
type Behavior = "IDLE" | "WALK" | "EAT" | "REST" | "PRODUCE";

/** Foot-aligned, complete hen poses, using the same pipeline as the cow. */
export class ChickenSprite {
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
  private size: number;

  constructor(
    private scene: Phaser.Scene,
    readonly id: string,
    x: number,
    y: number,
  ) {
    this.origin = new Phaser.Math.Vector2(x, y);
    this.target = this.origin.clone();
    this.phase = id.endsWith("2") ? 2700 : 0;
    this.size = id.endsWith("2") ? 0.94 : 1;
    this.root = scene.add
      .container(x, y)
      .setDepth(y + 1)
      .setScale(this.size);
    this.root.setData("animalId", id).setData("visualVersion", 3);
    this.root.add(scene.add.ellipse(0, 1, 22, 6, 0x33452a, 0.15));
    this.sprite = scene.add
      .sprite(0, 0, "chicken-v3", 0)
      .setOrigin(0.5, 184 / 192)
      .setDisplaySize(36, 36);
    this.root.add(this.sprite);
    for (const [name, frames, rate] of [
      ["walk", [2, 3], 6],
      ["eat", [4, 5], 3.5],
    ] as const) {
      const key = "chicken-v3-" + name;
      if (!scene.anims.exists(key))
        scene.anims.create({
          key,
          frames: frames.map((frame) => ({ key: "chicken-v3", frame })),
          frameRate: rate,
          repeat: -1,
        });
    }
    this.badge = scene.add.container(0, -43).setScale(0.65).setVisible(false);
    const icon = scene.add.graphics();
    icon.fillStyle(0xfff6db).fillCircle(0, 0, 12);
    icon.lineStyle(1.5, 0xc4a771).strokeCircle(0, 0, 12);
    icon.fillStyle(0xe9d4aa).fillEllipse(0, 1, 11, 15);
    icon.fillStyle(0xfffbeb).fillEllipse(-1, -1, 8, 12);
    icon.lineStyle(1, 0xc3aa7c).strokeEllipse(0, 1, 11, 15);
    this.badge.add(icon);
    this.root.add(this.badge);
  }
  private setBehavior(behavior: Behavior) {
    if (this.behavior === behavior) return;
    this.behavior = behavior;
    if (behavior === "WALK") this.sprite.play("chicken-v3-walk");
    else if (behavior === "EAT") this.sprite.play("chicken-v3-eat");
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
      new Phaser.Geom.Rectangle(this.root.x - 27, this.root.y - 50, 54, 60),
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
        this.nextBehavior = time + 5500;
      }
    }
    const localTime = time + this.phase;
    if (time >= this.nextBehavior) {
      const cycle: Behavior[] = ready
        ? ["PRODUCE", "IDLE"]
        : animal.fedAt !== null
          ? ["EAT", "WALK", "REST", "IDLE"]
          : ["IDLE", "WALK", "IDLE", "REST"];
      const behavior = cycle[Math.floor(localTime / 4500) % cycle.length];
      this.setBehavior(behavior);
      this.nextBehavior = time + 3600;
      if (behavior === "WALK") {
        this.target.set(
          this.origin.x + Math.sin(localTime * 0.0008) * 8,
          this.origin.y + Math.cos(localTime * 0.0008) * 4,
        );
        const dx = this.target.x - this.root.x;
        if (Math.abs(dx) > 3) this.direction = dx < 0 ? -1 : 1;
      }
    }
    if (this.behavior === "WALK") {
      const step = Math.min(1, delta * 0.0013);
      this.root.x = Phaser.Math.Linear(this.root.x, this.target.x, step);
      this.root.y = Phaser.Math.Linear(this.root.y, this.target.y, step);
    } else if (this.behavior === "IDLE" || this.behavior === "PRODUCE") {
      const phase = localTime % 5100;
      this.sprite.setFrame(
        phase > 4800 && phase < 4950 ? 1 : phase > 3900 && phase < 4100 ? 7 : 0,
      );
    }
    const safe = constrainAnimal(
      this.id,
      this.root.x,
      this.root.y,
      useFarm.getState().snapshot?.farm.penPositions,
    );
    this.root.setPosition(safe.x, safe.y);
    this.root
      .setDepth(this.root.y + 1)
      .setScale(this.direction * this.size, this.size);
    this.badge.setVisible(ready);
  }
}
