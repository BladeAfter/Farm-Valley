import Phaser from "phaser";
import {
  pens,
  containsPen,
  penLayout,
  type PenPositions,
} from "../../data/pens";
import type { AnimalKind } from "../../types/game";
import { toIso } from "../map/isometric";

/** Static shared geometry, separate foot-depth segments interleave correctly with animals. */
export class AnimalPens {
  private byKind = new Map<AnimalKind, Phaser.GameObjects.GameObject[]>();
  objectsFor(kind: AnimalKind) {
    return this.byKind.get(kind) ?? [];
  }
  private positions?: PenPositions;
  private signature = "";
  private objects: Phaser.GameObjects.GameObject[] = [];
  sync(
    positions: PenPositions,
    owned: AnimalKind[] = ["cow", "chicken", "goat", "pig"],
  ) {
    const signature = JSON.stringify([positions, owned]);
    if (signature === this.signature) return;
    this.signature = signature;
    this.scene.game.canvas.dataset.penPositions = JSON.stringify(positions);
    this.positions = positions;
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
    this.byKind.clear();
    for (const kind of owned) this.draw(kind);
  }
  constructor(private scene: Phaser.Scene) {
    for (const kind of ["cow", "chicken", "goat", "pig"] as AnimalKind[])
      this.draw(kind);
    scene.game.canvas.dataset.pensVersion = "1";
  }
  at(x: number, y: number) {
    const shelter = this.objects.find(
      (o) =>
        o instanceof Phaser.GameObjects.Image &&
        o.getData("penKind") &&
        o.getBounds().contains(x, y),
    );
    if (shelter) return shelter.getData("penKind") as AnimalKind;
    return [...this.byKind.keys()].find((kind) =>
      containsPen(kind, x, y, this.positions),
    );
  }
  private draw(kind: AnimalKind) {
    const previous = new Set(this.scene.children.list);
    const pen = penLayout(kind, this.positions);
    const p = (x: number, y: number) => toIso(pen.x + x, pen.y + y);
    const ground = this.scene.add.graphics().setDepth(-810);
    const corners = [p(0, 0), p(3, 0), p(3, 3), p(0, 3)];
    ground.fillStyle(0x4c6230, 0.13).fillPoints(
      corners.map((q) => ({ x: q.x + 4, y: q.y + 4 })),
      true,
    );
    ground
      .fillStyle(
        kind === "pig" ? 0xac925d : kind === "chicken" ? 0xc2af70 : 0xa9bb69,
        0.78,
      )
      .fillPoints(corners, true);
    // Broken patches blend into the existing grass rather than making a solid board.
    for (let i = 0; i < 48; i++) {
      const q = p(0.12 + ((i * 37) % 277) / 100, 0.12 + ((i * 67) % 277) / 100);
      ground
        .fillStyle(i % 3 ? 0x83a24b : 0xd9c183, 0.3)
        .fillEllipse(q.x, q.y, 6 + (i % 7), 2 + (i % 3));
    }
    // Low, deterministic pasture accents stay clear of the approach to the feeder.
    for (let i = 0; i < 14; i++) {
      const x = i % 2 ? .22 + ((i * 31) % 55) / 100 : 2.5 + ((i * 17) % 25) / 100;
      const y = .25 + ((i * 43) % 240) / 100;
      const q = p(x,y), height = kind === "pig" ? 3 : 4 + i % 3;
      for (let blade = -1; blade <= 1; blade++) ground.lineStyle(1,blade ? 0x729446 : 0xa7bf65,.8)
        .lineBetween(q.x,q.y,q.x + blade * 3,q.y - height + Math.abs(blade));
      if(kind === "cow" && i % 6 === 0) ground.fillStyle(0xf0df9a,.8).fillCircle(q.x+2,q.y-height,1.2);
    }
    const home = p(0.72, 0.72);
    const image = this.scene.add
      .image(home.x, home.y, "pen-" + kind)
      .setOrigin(0.5, 0.94)
      .setDepth(home.y + 2);
    image.setDisplaySize(pen.width, (pen.width * image.height) / image.width);
    image.setData("penKind", kind);
    // Four complete sides; the front-right side has a short hinged gate.
    const rail = (
      ax: number,
      ay: number,
      bx: number,
      by: number,
      gate = false,
    ) => {
      const a = p(ax, ay),
        b = p(bx, by);
      const f = this.scene.add.graphics().setDepth(Math.max(a.y, b.y) + 2);
      f.lineStyle(5, 0x3b4d28, 0.16).lineBetween(
        a.x + 3,
        a.y + 3,
        b.x + 3,
        b.y + 3,
      );
      for (const h of [10, 21]) {
        f.lineStyle(gate ? 7 : 5, 0x88552f).lineBetween(
          a.x,
          a.y - h,
          b.x,
          b.y - h,
        );
        f.lineStyle(gate ? 5 : 3, 0xc79554).lineBetween(
          a.x,
          a.y - h - 1,
          b.x,
          b.y - h - 1,
        );
        f.lineStyle(1, 0xf2ce8b).lineBetween(
          a.x,
          a.y - h - 3,
          b.x,
          b.y - h - 3,
        );
      }
      if (gate) {
        f.fillStyle(0xb77f43).fillPoints(
          [
            { x: a.x, y: a.y - 26 },
            { x: b.x, y: b.y - 26 },
            { x: b.x, y: b.y - 3 },
            { x: a.x, y: a.y - 3 },
          ],
          true,
        );
        for (let i = 1; i < 6; i++) {
          const x = Phaser.Math.Linear(a.x, b.x, i / 6),
            y = Phaser.Math.Linear(a.y, b.y, i / 6);
          f.lineStyle(1, 0x84572f, 0.7).lineBetween(x, y - 25, x, y - 4);
          f.lineStyle(0.7, 0xeac18a, 0.7).lineBetween(
            x + 1,
            y - 24,
            x + 1,
            y - 5,
          );
        }
        f.lineStyle(2, 0xe2b777).lineBetween(a.x, a.y - 26, b.x, b.y - 26);
        f.lineStyle(3, 0x9a6536).lineBetween(a.x, a.y - 9, b.x, b.y - 23);
        f.fillStyle(0x4b4c44).fillCircle(b.x - 3, b.y - 17, 2);
        for (const h of [8, 22])
          f.lineStyle(2, 0x5b5b4c).lineBetween(
            a.x,
            a.y - h,
            a.x - 7,
            a.y - h + 3.5,
          );
      }
    };
    const post = (x: number, y: number, stone = false) => {
      const q = p(x, y),
        f = this.scene.add.graphics().setDepth(q.y + 3);
      const w = stone ? 5 : 3.5,
        h = stone ? 31 : 28;
      f.fillStyle(stone ? 0xa29d7d : 0x9f6839).fillPoints(
        [
          { x: q.x - w, y: q.y - h },
          { x: q.x, y: q.y - h + 3 },
          { x: q.x, y: q.y + 2 },
          { x: q.x - w, y: q.y - 1 },
        ],
        true,
      );
      f.fillStyle(stone ? 0xc3b997 : 0xd1a063).fillPoints(
        [
          { x: q.x, y: q.y - h + 3 },
          { x: q.x + w, y: q.y - h },
          { x: q.x + w, y: q.y - 1 },
          { x: q.x, y: q.y + 2 },
        ],
        true,
      );
      f.fillStyle(stone ? 0xe4dbb7 : 0xf0ce8e).fillPoints(
        [
          { x: q.x - w, y: q.y - h },
          { x: q.x, y: q.y - h - 3 },
          { x: q.x + w, y: q.y - h },
          { x: q.x, y: q.y - h + 3 },
        ],
        true,
      );
      f.lineStyle(0.7, 0x775e3e, 0.4).lineBetween(
        q.x + 2,
        q.y - h + 6,
        q.x + 2,
        q.y - 3,
      );
    };
    for (let i = 0; i < 3; i++) {
      rail(i, 0, i + 1, 0);
      rail(0, i, 0, i + 1);
      rail(i, 3, i + 1, 3);
      rail(3, i, 3, i + 1, i === 1);
    }
    for (let i = 0; i <= 3; i++) {
      post(i, 0, i === 0 || i === 3);
      post(i, 3, i === 0 || i === 3);
      if (i > 0 && i < 3) {
        post(0, i);
        post(3, i);
      }
    }
    // Species-specific flowers/rocks remain low and do not block the roaming area.
    for (const [x, y] of [
      [0.18, 2.7],
      [2.7, 0.18],
    ]) {
      const q = p(x, y),
        g = this.scene.add.graphics().setDepth(q.y + 1);
      if (kind === "goat")
        g.fillStyle(0xaaa48b)
          .fillEllipse(q.x, q.y - 2, 12, 7)
          .fillStyle(0xd9d1b2)
          .fillEllipse(q.x - 2, q.y - 4, 7, 3);
      else {
        g.fillStyle(0x698b37).fillEllipse(q.x, q.y - 2, 14, 8);
        for (let i = 0; i < 3; i++)
          g.fillStyle(kind === "cow" ? 0xe9cc69 : 0xf5e5ba).fillCircle(
            q.x - 4 + i * 4,
            q.y - 5 - (i % 2) * 2,
            1.7,
          );
      }
    }
    const created = this.scene.children.list.filter((o) => !previous.has(o));
    this.byKind.set(kind, created);
    this.objects.push(...created);
  }
}
