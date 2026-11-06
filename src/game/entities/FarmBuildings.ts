import Phaser from "phaser";
import {
  buildingLayout,
  storageImage,
  storageTexture,
} from "../../data/buildings";
import { toIso } from "../map/isometric";
import type { Farm, StorageKind } from "../../types/game";

export class FarmBuildings {
  private house!: Phaser.GameObjects.Image;
  private actors = new Map<StorageKind, Phaser.GameObjects.Image>();
  private pending = new Set<string>();
  constructor(private scene: Phaser.Scene) {
    const house = buildingLayout.house;
    this.house = this.create(
      "house",
      house.x,
      house.y,
      house.width,
      "buildings",
    ).setData("buildingId", "house");
    for (const kind of ["barn", "silo"] as const) {
      const layout = buildingLayout[kind];
      this.actors.set(
        kind,
        this.create(
          storageTexture(kind, 1),
          layout.x,
          layout.y,
          layout.widths[0],
          "inventory",
        )
          .setData("buildingId", kind)
          .setFlipX(layout.flipX),
      );
    }
  }
  private create(
    key: string,
    x: number,
    y: number,
    width: number,
    panel: string,
  ) {
    const p = toIso(x, y);
    const image = this.scene.add
      .image(p.x, p.y, key)
      .setOrigin(0.5, 0.94)
      .setDepth(p.y)
      .setData("panel", panel);
    this.fit(image, width);
    return image;
  }
  private fit(image: Phaser.GameObjects.Image, width: number) {
    const source = image.texture.getSourceImage();
    image.setDisplaySize(width, (width * source.height) / source.width);
  }
  sync(farm: Farm) {
    for (const [id, image] of [
      ["house", this.house],
      ...this.actors.entries(),
    ] as const) {
      const p = toIso(
        farm.buildingPositions[id].x,
        farm.buildingPositions[id].y,
      );
      image.setPosition(p.x, p.y).setDepth(p.y);
    }
    for (const kind of ["barn", "silo"] as const) {
      const stage = farm.storage[kind],
        key = storageTexture(kind, stage),
        actor = this.actors.get(kind)!;
      if (this.scene.textures.exists(key)) {
        if (actor.texture.key !== key) actor.setTexture(key);
        actor.setFlipX(buildingLayout[kind].flipX);
        this.fit(actor, buildingLayout[kind].widths[stage - 1]);
        actor.setData("storageStage", stage);
        this.scene.game.canvas.dataset[kind + "Stage"] = String(stage);
        if (kind === "barn") this.scene.game.canvas.dataset.barnFacing = "road";
      } else if (!this.pending.has(key)) {
        this.pending.add(key);
        this.scene.load.image(key, storageImage(kind, stage));
        this.scene.load.once("filecomplete-image-" + key, () =>
          this.pending.delete(key),
        );
        // Loader owns the queue; later tiers are fetched only when required.
        if (!this.scene.load.isLoading()) this.scene.load.start();
      }
    }
  }
}
