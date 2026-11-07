import Phaser from "phaser";
import { unlockFarmAudio } from "../../services/farmAudio";
import { toIso, fromIso } from "../map/isometric";
import { useFarm, farmNow } from "../../store/useFarm";
import {
  items,
  animalRemaining,
  crops,
  type Crop,
  type Cell,
} from "../../types/game";
import { drawEnvironment } from "../map/environment";
import { CropField } from "../entities/CropField";
import { ChickenSprite } from "../entities/ChickenSprite";
import { CowSprite } from "../entities/CowSprite";
import { FieldTerrain } from "../entities/FieldTerrain";
import { OrderNoticeBoard } from "../entities/OrderNoticeBoard";
import { FarmBuildings } from "../entities/FarmBuildings";
import { PastureAnimal } from "../entities/PastureAnimal";

import { AnimalPens } from "../entities/AnimalPens";
import { animalHome, penKindForAnimal } from "../../data/pens";
import { NaturalObstacles } from "../entities/NaturalObstacles";
import { FactoryBuildings } from "../entities/FactoryBuildings";
import { machineKinds } from "../../data/production";
import { FruitTrees } from "../entities/FruitTrees";
import type { Placement } from "../../types/land";
import { occupancyIssue, placementRect } from "../../data/land";

export class FarmScene extends Phaser.Scene {
  private fields = new Map<string, CropField>();
  private terrain!: FieldTerrain;
  private pens!: AnimalPens;
  private obstacles!: NaturalObstacles;
  private fruitTrees!: FruitTrees;
  private decorations = new Map<string, Phaser.GameObjects.Image>();
  private buildings!: FarmBuildings;
  private factories!: FactoryBuildings;
  private noticeBoard!: OrderNoticeBoard;
  private purchaseGhost?: Phaser.GameObjects.Image;
  private placementPointer: Cell | null = null;
  private sheepLoading = false;
  private animals: (ChickenSprite | CowSprite | PastureAnimal)[] = [];
  private lastDraw = 0;
  private down = { x: 0, y: 0, cx: 0, cy: 0 };
  private dragged = false;
  private painting = false;
  private externalSeed = false;
  private pointerActive = false;
  private stroke = new Map<string, Cell>();
  private previousPoint: { x: number; y: number } | null = null;
  private hover!: Phaser.GameObjects.Graphics;
  private moveGhost?: Phaser.GameObjects.RenderTexture;
  private dimmed: { object: Phaser.GameObjects.Image; alpha: number }[] = [];
  private placementOffset = { x: 0, y: 0 };
  constructor() {
    super("farm");
  }
  preload() {
    this.load.spritesheet(
      "fruit-tree-apple",
      "/assets/trees/orchard/apple/stages-v1.webp",
      { frameWidth: 192, frameHeight: 192 },
    );
    for (const species of [
      "apple",
      "pear",
      "cherry",
      "orange",
      "lemon",
      "peach",
      "mango",
      "avocado",
      "cocoa",
    ])
      this.load.svg(
        "fruit-icon-" + species,
        "/assets/products/fruits/" + species + ".svg",
        { width: 64, height: 64 },
      );
    for (const kind of ["rock", "stump", "dead-tree", "bush", "roots"])
      this.load.image(
        "obstacle-" + kind,
        "/assets/obstacles/" + kind + "-v1.webp",
      );
    const assets: Record<string, string> = {
      grass: "terrain/grass-v3.webp",
      "village-noticeboard": "buildings/order-board/board-v1.webp",
      "wall-stone": "terrain/walls/fieldstone-v1.webp",
      soil: "terrain/soil-v1.webp",
      dirt: "terrain/dirt-v2.webp",
      oak: "trees/oak-v2.webp",
      "barn-stage-1": "buildings/barn/stage-1-v1.webp",
      "silo-stage-1": "buildings/silo/stage-1-v1.webp",
      house: "buildings/farmhouse/house-v3.webp",
      flowers: "decorations/flowers-v2.webp",
      wheat: "crops/wheat/ready-v2.webp",
      "wheat-sprout": "crops/wheat/sprout-v2.webp",
      "wheat-growing": "crops/wheat/growing-v2.webp",
      corn: "crops/corn/ready-v2.webp",
      carrot: "crops/carrot/ready-v2.webp",
      soybean: "crops/soybean/ready-v2.webp",
      sugarcane: "crops/sugarcane/ready-v2.webp",
      strawberry: "crops/strawberry/ready-v1.webp",
      potato: "crops/potato/ready-v1.webp",
    };
    for (const kind of ["cow", "chicken", "goat", "pig"])
      this.load.image(
        "pen-" + kind,
        "/assets/buildings/pens/" + kind + "-v1.webp",
      );
    for (const [key, path] of Object.entries(assets))
      this.load.image(key, "/assets/" + path);
    for (const id of [
      "milk",
      "egg",
      "goatMilk",
      "bacon",
      "wool",
      "truffle",
    ] as const)
      this.load.svg("animal-product-" + id, items[id].image, {
        width: 64,
        height: 64,
      });
    this.load.spritesheet("cow-v4", "/assets/animals/cow/animation-v4.webp", {
      frameWidth: 256,
      frameHeight: 192,
    });
    this.load.spritesheet(
      "chicken-v3",
      "/assets/animals/chicken/animation-v3.webp",
      { frameWidth: 192, frameHeight: 192 },
    );
    for (const kind of ["goat", "pig"])
      this.load.spritesheet(
        kind + "-v1",
        "/assets/animals/" + kind + "/animation-v1.webp",
        { frameWidth: 256, frameHeight: 192 },
      );
  }
  create() {
    drawEnvironment(this);
    this.pens = new AnimalPens(this);
    this.buildings = new FarmBuildings(this);
    this.factories = new FactoryBuildings(this);
    this.noticeBoard = new OrderNoticeBoard(this);
    this.obstacles = new NaturalObstacles(this);
    this.fruitTrees = new FruitTrees(this);
    this.terrain = new FieldTerrain(this);
    this.hover = this.add.graphics().setDepth(3000);
    this.cameras.main.setBackgroundColor("#79a94d");
    this.resetCamera();
    for (const [id, kind] of [
      ["cow-1", "cow"],
      ["chicken-1", "chicken"],
      ["chicken-2", "chicken"],
    ] as const) {
      const p = animalHome(id);
      this.animals.push(
        kind === "cow"
          ? new CowSprite(this, id, p.x, p.y)
          : new ChickenSprite(this, id, p.x, p.y),
      );
    }
    for (const [id, kind] of [
      ["goat-1", "goat"],
      ["pig-1", "pig"],
    ] as const) {
      const p = animalHome(id);
      this.animals.push(new PastureAnimal(this, id, kind, p.x, p.y));
    }
    const coordinates = (e: PointerEvent) => {
      const rect = this.game.canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) * this.scale.width) / rect.width,
        y: ((e.clientY - rect.top) * this.scale.height) / rect.height,
      };
    };
    let holdTimer: number | undefined;
    let held = false;
    let pointerId: number | null = null;
    const stopHold = () => {
      window.clearTimeout(holdTimer);
      holdTimer = undefined;
    };
    const down = (e: PointerEvent) => {
      if (this.pointerActive) {
        stopHold();
        return;
      }
      const target = e.target as HTMLElement;
      const seed = target.closest<HTMLElement>("[data-farm-seed]");
      const sickle = target.closest<HTMLElement>("[data-farm-harvest]");
      const canvas = e.target === this.game.canvas;
      if (
        (!canvas && !seed && !sickle) ||
        useFarm.getState().panel ||
        e.button !== 0
      )
        return;
      unlockFarmAudio();
      if (seed) {
        useFarm.getState().select(seed.dataset.farmSeed as Crop);
        window.dispatchEvent(new Event("farm-seed-picked"));
      }
      if (sickle) useFarm.getState().setTool("harvest");
      this.externalSeed = !!seed || !!sickle;
      const p = coordinates(e);
      this.down = {
        ...p,
        cx: this.cameras.main.scrollX,
        cy: this.cameras.main.scrollY,
      };
      held = false;
      pointerId = e.pointerId;
      this.dragged = false;
      this.pointerActive = true;
      this.stroke.clear();
      this.previousPoint = p;
      if (useFarm.getState().placement) this.placementPreview(p.x, p.y);
      const cell = this.cellAt(p.x, p.y);
      const tool = useFarm.getState().tool;
      this.painting =
        !useFarm.getState().placement &&
        (this.externalSeed || (tool !== "hand" && !!this.plotAt(cell)));
      if (this.painting) this.paintAt(p.x, p.y);
      if (
        canvas &&
        tool === "hand" &&
        !useFarm.getState().placement &&
        !useFarm.getState().busy
      ) {
        const world = this.cameras.main.getWorldPoint(p.x, p.y);
        const candidate = this.moveTarget(world.x, world.y);
        if (candidate)
          holdTimer = window.setTimeout(() => {
            holdTimer = undefined;
            if (
              !this.pointerActive ||
              this.dragged ||
              useFarm.getState().panel ||
              useFarm.getState().busy
            )
              return;
            held = true;
            this.placementOffset = {
              x: cell.x - Math.round(candidate.anchor.x),
              y: cell.y - Math.round(candidate.anchor.y),
            };
            useFarm.getState().startPlacement(candidate.placement);
            this.createMoveGhost(candidate.objects, candidate.anchor);
            this.placementPreview(p.x, p.y);
            this.game.canvas.dataset.holdMove = "active";
          }, 1200);
      }
    };
    const move = (e: PointerEvent) => {
      if (this.pointerActive && e.pointerId !== pointerId) return;
      if (useFarm.getState().placement && e.target === this.game.canvas) {
        const p = coordinates(e);
        this.placementPreview(p.x, p.y);
      }
      if (!this.pointerActive) return;
      const p = coordinates(e),
        dx = p.x - this.down.x,
        dy = p.y - this.down.y;
      if (Math.hypot(dx, dy) > 7) {
        this.dragged = true;
        stopHold();
      }
      if (held) return;
      if (this.painting) {
        const previous = this.previousPoint ?? p;
        const steps = Math.max(
          1,
          Math.ceil(Math.hypot(p.x - previous.x, p.y - previous.y) / 8),
        );
        for (let i = 1; i <= steps; i++)
          this.paintAt(
            Phaser.Math.Linear(previous.x, p.x, i / steps),
            Phaser.Math.Linear(previous.y, p.y, i / steps),
          );
        this.previousPoint = p;
      } else if (this.dragged) {
        this.cameras.main.scrollX = this.down.cx - dx / this.cameras.main.zoom;
        this.cameras.main.scrollY = this.down.cy - dy / this.cameras.main.zoom;
      }
    };
    const up = (e: PointerEvent) => {
      if (!this.pointerActive || e.pointerId !== pointerId) return;
      stopHold();
      this.pointerActive = false;
      const wasHeld = held;
      held = false;
      if (wasHeld && e.target !== this.game.canvas) {
        useFarm.getState().startPlacement(null);
        this.clearMoveGhost();
        this.placementOffset = { x: 0, y: 0 };
        return;
      }
      if (wasHeld && !this.dragged) {
        this.placementOffset = { x: 0, y: 0 };
        return;
      }
      if (this.painting && this.stroke.size) {
        void this.commitStroke();
      } else if (
        (!this.dragged || wasHeld) &&
        !this.externalSeed &&
        e.target === this.game.canvas
      ) {
        const p = coordinates(e);
        const world = this.cameras.main.getWorldPoint(p.x, p.y);
        const state = useFarm.getState();
        if (state.placement) {
          const cell = this.placementCell(p.x, p.y),
            placement = state.placement;
          this.placementOffset = { x: 0, y: 0 };
          const issue = state.snapshot
            ? occupancyIssue(
                state.snapshot.farm,
                placementRect(placement, cell.x, cell.y),
                placement.kind === "building"
                  ? placement.buildingId
                  : undefined,
                placement,
              )
            : "Conectando ao servidor.";
          if (placement.kind === "machine") {
            state.setPlacementTarget(issue ? null : cell);
            if (issue) state.notice(issue);
            return;
          }
          if (issue) state.notice(issue);
          else
            void state
              .act(
                placement.kind === "moveMachine"
                  ? {
                      type: "move-machine",
                      machineId: placement.machineId,
                      ...cell,
                    }
                  : placement.kind === "sheep"
                    ? { type: "buy-sheep", ...cell }
                    : placement.kind === "pen"
                      ? {
                          type: "move-pen",
                          animalKind: placement.animalKind,
                          ...cell,
                        }
                      : placement.kind === "moveField"
                        ? {
                            type: "move-field",
                            from: placement.from,
                            ...cell,
                          }
                        : placement.kind === "building"
                          ? {
                              type: "move-building",
                              buildingId: placement.buildingId,
                              ...cell,
                            }
                          : placement.kind === "fruitTree"
                            ? {
                                type: "plant-fruit-tree",
                                species: placement.species,
                                ...cell,
                              }
                            : {
                                type:
                                  placement.kind === "field"
                                    ? "place-field"
                                    : "place-decoration",
                                ...cell,
                              },
              )
              .then((ok) => {
                if (ok) useFarm.getState().startPlacement(null);
              });
          return;
        }
        if (this.noticeBoard.at(world.x, world.y)) { state.open("orders"); return; }
        const factory = this.factories.at(world.x, world.y);
        if (factory) {
          state.openMachine(factory);
          return;
        }
        const fruitTree = this.fruitTrees.at(world.x, world.y);
        if (fruitTree) {
          state.openFruitTree(fruitTree);
          return;
        }
        const obstacle = this.obstacles.at(world.x, world.y);
        if (obstacle) {
          state.openObstacle(obstacle);
          return;
        }
        const animal = this.animals.find(
          (a) =>
            Math.abs(a.root.x - world.x) < 45 &&
            world.y > a.root.y - 100 &&
            world.y < a.root.y + 10,
        );
        if (animal) {
          const saved = state.snapshot?.farm.animals.find(
            (a) => a.id === animal.id,
          );
          if (saved && animalRemaining(saved, farmNow()) === 0)
            void state.act({ type: "collect-animal", animalId: animal.id });
          else useFarm.getState().openAnimals(penKindForAnimal(animal.id));
          return;
        }
        const pen = this.pens.at(world.x, world.y);
        if (pen) {
          useFarm.getState().openAnimals(pen);
          return;
        }
        const objects = this.children.list.filter(
          (o) => o instanceof Phaser.GameObjects.Image && o.getData("panel"),
        ) as Phaser.GameObjects.Image[];
        const building = objects.find((o) =>
          o.getBounds().contains(world.x, world.y),
        );
        if (building) {
          const kind = building.getData("buildingId");
          if (kind === "barn" || kind === "silo") useFarm.getState().openStorage(kind);
          else useFarm.getState().open(building.getData("panel"));
          return;
        }
        const cell = this.cellAt(p.x, p.y);
        useFarm.getState().setFocus(this.plotAt(cell) ? cell : null);
      }
      this.painting = false;
      this.externalSeed = false;
      this.previousPoint = null;
    };
    const cancel = () => {
      stopHold();
      if (held) useFarm.getState().startPlacement(null);
      held = false;
      this.clearMoveGhost();
      this.placementOffset = { x: 0, y: 0 };
      this.pointerActive = false;
      this.painting = false;
      this.stroke.clear();
      this.hover.clear();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useFarm.getState().startPlacement(null);
        cancel();
      }
    };
    const collected = (event: Event) => {
      for (const { id, item } of (
        event as CustomEvent<{ id: string; item: string }[]>
      ).detail) {
        const animal = this.animals.find((a) => a.id === id);
        if (
          !animal ||
          !this.cameras.main.worldView.contains(animal.root.x, animal.root.y)
        )
          continue;
        const icon = this.add
          .image(animal.root.x, animal.root.y - 40, "animal-product-" + item)
          .setDisplaySize(25, 25)
          .setDepth(3500);
        this.tweens.add({
          targets: icon,
          y: icon.y - 45,
          alpha: 0,
          duration: 700,
          onComplete: () => icon.destroy(),
        });
        this.dust(fromIso(animal.root.x, animal.root.y));
      }
    };
    window.addEventListener("farm-animal-rewards", collected);
    window.addEventListener("keydown", escape);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    this.events.once("shutdown", () => {
      stopHold();
      this.clearMoveGhost();
      window.removeEventListener("farm-animal-rewards", collected);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
    });
    this.input.on(
      "wheel",
      (_p: unknown, _o: unknown, _dx: number, dy: number) =>
        this.zoom(dy > 0 ? -0.08 : 0.08),
    );
    this.game.events.on("zoom", this.zoom, this);
    this.game.events.on("home", this.resetCamera, this);
    this.game.events.on("focus-cell", this.focusCell, this);
    this.events.once("shutdown", () => {
      this.game.events.off("zoom", this.zoom, this);
      this.game.events.off("home", this.resetCamera, this);
      this.game.events.off("focus-cell", this.focusCell, this);
    });
    // Read-only coordinate hook for integration tests; no game state or economy can be modified.
    this.game.canvas.dataset.scene = "farm";
    this.game.canvas.dataset.cowVersion = "4";
    this.game.canvas.dataset.chickenVersion = "3";
    this.game.canvas.dataset.pastureVersion = "1";
    this.game.canvas.dataset.groundVersion = "2";
    this.game.canvas.dataset.buildingsVersion = "2";
  }
  private moveTarget(
    wx: number,
    wy: number,
  ): {
    placement: Placement;
    anchor: Cell;
    objects: Phaser.GameObjects.GameObject[];
  } | null {
    const farm = useFarm.getState().snapshot?.farm;
    if (!farm) return null;
    const animal = this.animals.find(
      (a) =>
        Math.abs(a.root.x - wx) < 40 &&
        wy > a.root.y - 65 &&
        wy < a.root.y + 10,
    );
    const kind = animal ? penKindForAnimal(animal.id) : this.pens.at(wx, wy);
    if (kind)
      return {
        placement: { kind: "pen", animalKind: kind },
        anchor: farm.penPositions[kind],
        objects: [
          ...this.pens.objectsFor(kind),
          ...this.animals
            .filter((a) => penKindForAnimal(a.id) === kind)
            .flatMap((a) => [a.root, ...a.feeding.objects()]),
        ],
      };
    const factoryId = this.factories.at(wx, wy);
    const factory = farm.machines.find((m) => m.id === factoryId);
    if (factory)
      return {
        placement: { kind: "moveMachine", machineId: factory.id },
        anchor: { x: factory.x, y: factory.y },
        objects: this.factories.objectsFor(factory.id),
      };
    const building = this.children.list.find(
      (o) =>
        o instanceof Phaser.GameObjects.Image &&
        o.getData("buildingId") &&
        o.getBounds().contains(wx, wy),
    ) as Phaser.GameObjects.Image | undefined;
    if (building) {
      const buildingId = building.getData(
        "buildingId",
      ) as import("../../types/land").BuildingId;
      return {
        placement: { kind: "building", buildingId },
        anchor: farm.buildingPositions[buildingId],
        objects: [building],
      };
    }
    const cell = fromIso(wx, wy);
    if (this.plotAt(cell))
      return {
        placement: { kind: "moveField", from: cell },
        anchor: cell,
        objects: this.fields.has(cell.x + "," + cell.y)
          ? [this.fields.get(cell.x + "," + cell.y)!.container]
          : [],
      };
    return null;
  }
  private createMoveGhost(
    objects: Phaser.GameObjects.GameObject[],
    anchor: Cell,
  ) {
    this.clearMoveGhost();
    const p = toIso(anchor.x, anchor.y);
    const drawables = objects as Phaser.GameObjects.Image[];
    this.moveGhost = this.add
      .renderTexture(p.x - 175, p.y - 140, 350, 300)
      .setOrigin(0, 0)
      .setDepth(2900)
      .setAlpha(0.9);
    for (const object of [...drawables].sort((a, b) => a.depth - b.depth))
      this.moveGhost.draw(object, object.x - p.x + 175, object.y - p.y + 140);
    this.dimmed = drawables.map((object) => ({ object, alpha: object.alpha }));
    this.dimmed.forEach(({ object }) => object.setAlpha(0));
  }
  private clearMoveGhost() {
    this.purchaseGhost?.destroy();
    this.purchaseGhost = undefined;
    delete this.game.canvas.dataset.purchasePreview;
    this.moveGhost?.destroy();
    this.moveGhost = undefined;
    this.dimmed.forEach(({ object, alpha }) => {
      if (object.scene) object.setAlpha(alpha);
    });
    this.dimmed = [];
    delete this.game.canvas.dataset.holdMove;
  }
  private placementCell(x: number, y: number) {
    const cell = this.cellAt(x, y);
    return {
      x: cell.x - this.placementOffset.x,
      y: cell.y - this.placementOffset.y,
    };
  }
  private cellAt(x: number, y: number) {
    const p = this.cameras.main.getWorldPoint(x, y);
    return fromIso(p.x, p.y);
  }
  private placementPreview(x: number, y: number) {
    const state = useFarm.getState();
    if (!state.placement || !state.snapshot) return;
    this.placementPointer = { x, y };
    const cell =
        state.placement.kind === "machine" &&
        state.placementTarget &&
        !this.pointerActive
          ? state.placementTarget
          : this.placementCell(x, y),
      r = placementRect(state.placement, cell.x, cell.y);
    const issue = occupancyIssue(
      state.snapshot.farm,
      r,
      state.placement.kind === "building"
        ? state.placement.buildingId
        : undefined,
      state.placement,
    );
    if (
      state.placement.kind === "machine" &&
      this.factories.ensure(state.placement.machineKind)
    ) {
      const config = machineKinds[state.placement.machineKind],
        p = toIso(cell.x, cell.y);
      if (!this.purchaseGhost) {
        this.purchaseGhost = this.add
          .image(p.x, p.y, "machine-" + state.placement.machineKind)
          .setOrigin(0.5, 0.94)
          .setDepth(2900)
          .setAlpha(0.85);
        this.purchaseGhost.setDisplaySize(
          config.width,
          (config.width * this.purchaseGhost.height) / this.purchaseGhost.width,
        );
      }
      this.purchaseGhost
        .setPosition(p.x, p.y)
        .setTint(issue ? 0xffb69c : 0xffffff);
      this.game.canvas.dataset.purchasePreview = "ready";
    }
    if (this.moveGhost) {
      const p = toIso(cell.x, cell.y);
      this.moveGhost
        .setPosition(p.x - 175, p.y - 140)
        .setTint(issue ? 0xffb69c : 0xffffff);
    }
    const points = [
      [r.x, r.y],
      [r.x + r.w, r.y],
      [r.x + r.w, r.y + r.h],
      [r.x, r.y + r.h],
    ].map(([x, y]) => toIso(x, y));
    this.hover
      .clear()
      .fillStyle(issue ? 0xd77955 : 0xdbeaa1, 0.24)
      .fillPoints(points, true)
      .lineStyle(2, issue ? 0xe5a16c : 0xf5f4be)
      .strokePoints(points, true);
  }
  private plotAt(cell: Cell) {
    return useFarm
      .getState()
      .snapshot?.farm.plots.find((p) => p.x === cell.x && p.y === cell.y);
  }
  private paintAt(x: number, y: number) {
    const cell = this.cellAt(x, y),
      plot = this.plotAt(cell);
    if (!plot) return;
    const state = useFarm.getState();
    const ready =
      plot.crop && farmNow() - plot.plantedAt >= crops[plot.crop].duration;
    if (state.tool === "plant" && plot.crop) return;
    if (state.tool === "harvest" && !ready) return;
    if (
      state.tool === "plant" &&
      this.stroke.size >= state.snapshot!.farm.inventory[state.selected]
    )
      return;
    this.stroke.set(cell.x + "," + cell.y, cell);
  }
  private async commitStroke() {
    const cells = [...this.stroke.values()];
    const state = useFarm.getState();
    const action = state.tool === "harvest" ? "harvest" : "plant";
    const success = await state.act({
      type: "field-stroke",
      action,
      crop: state.selected,
      cells,
    });
    if (success) {
      cells.forEach((cell, i) => {
        if (action === "harvest") this.reward(cell, "+2", i * 25);
        else this.dust(cell);
      });
    }
    this.stroke.clear();
    this.hover.clear();
  }
  private dust(cell: Cell) {
    const p = toIso(cell.x, cell.y);
    for (let i = 0; i < 5; i++) {
      const dot = this.add
        .circle(p.x + (i - 2) * 6, p.y, 3, 0xcda56e, 0.7)
        .setDepth(2000);
      this.tweens.add({
        targets: dot,
        y: p.y - 14 - i * 2,
        x: dot.x + (i - 2) * 5,
        alpha: 0,
        scale: 0.2,
        duration: 450,
        onComplete: () => dot.destroy(),
      });
    }
  }
  private reward(cell: Cell, text: string, delay: number) {
    const p = toIso(cell.x, cell.y);
    const label = this.add
      .text(p.x, p.y - 35, text, {
        fontFamily: "Trebuchet MS",
        fontSize: "23px",
        fontStyle: "bold",
        color: "#fff6bd",
        stroke: "#6c8029",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(4000);
    this.tweens.add({
      targets: label,
      y: p.y - 100,
      alpha: 0,
      duration: 1100,
      delay,
      onComplete: () => label.destroy(),
    });
    for (let i = 0; i < 5; i++) {
      const star = this.add
        .star(p.x, p.y - 15, 4, 1.5, 4, 0xffe790)
        .setDepth(3000);
      this.tweens.add({
        targets: star,
        x: p.x + Math.sin(i * 2) * 36,
        y: p.y - 20 - Math.cos(i * 2) * 28,
        alpha: 0,
        scale: 0.2,
        duration: 650,
        delay,
        onComplete: () => star.destroy(),
      });
    }
  }
  resetCamera() {
    this.cameras.main.setZoom(
      Math.max(0.6, Math.min(1, this.scale.height / 670)),
    );
    this.cameras.main.centerOn(12, 310);
  }
  focusCell(cell: Cell) {
    const p = toIso(cell.x, cell.y);
    this.cameras.main.pan(p.x, p.y - 25, 250, "Sine.easeInOut");
  }
  zoom(delta: number) {
    this.cameras.main.setZoom(
      Phaser.Math.Clamp(this.cameras.main.zoom + delta, 0.5, 1.8),
    );
  }
  update(time: number, delta: number) {
    for (const animal of this.animals) animal.update(time, delta);
    if (time - this.lastDraw < 120) return;
    this.lastDraw = time;
    this.game.canvas.dataset.feeding = JSON.stringify(this.animals.map(a => ({ id: a.id, x: a.root.x, y: a.root.y, ...a.feeding.state })));
    this.game.canvas.dataset.feedingFoodObjects = String(this.children.list.filter(object => object.getData("feedingFood")).length);
    const state = useFarm.getState(),
      snapshot = state.snapshot;
    if (!snapshot) return;
    this.terrain.sync(snapshot.farm.plots);
    this.buildings.sync(snapshot.farm);
    this.noticeBoard.sync(snapshot.farm);
    const sheep = snapshot.farm.animals.find((a) => a.kind === "sheep");
    if (sheep && !this.animals.some((a) => a.id === sheep.id)) {
      if (
        this.textures.exists("sheep-v1") &&
        this.textures.exists("pen-sheep")
      ) {
        const p = animalHome(sheep.id, snapshot.farm.penPositions);
        this.animals.push(new PastureAnimal(this, sheep.id, "sheep", p.x, p.y));
      } else if (!this.sheepLoading) {
        this.sheepLoading = true;
        this.load.spritesheet(
          "sheep-v1",
          "/assets/animals/sheep/animation-v1.webp",
          { frameWidth: 256, frameHeight: 192 },
        );
        this.load.image("pen-sheep", "/assets/buildings/pens/sheep-v1.webp");
        if (!this.load.isLoading()) this.load.start();
      }
    }
    this.pens.sync(
      snapshot.farm.penPositions,
      [...new Set(snapshot.farm.animals.map((a) => a.kind))].filter((kind) =>
        this.textures.exists("pen-" + kind),
      ),
    );
    this.factories.sync(snapshot.farm, farmNow(), time);
    if (state.placement?.kind === "machine") {
      this.factories.ensure(state.placement.machineKind);
      const p = this.placementPointer ?? {
        x: this.scale.width / 2,
        y: this.scale.height / 2,
      };
      this.placementPreview(p.x, p.y);
    }
    for (const [key, field] of this.fields) {
      if (!snapshot.farm.plots.some((p) => key === p.x + "," + p.y)) {
        field.container.destroy();
        this.fields.delete(key);
      }
    }
    this.obstacles.sync(snapshot.farm);
    this.fruitTrees.sync(snapshot.farm, farmNow());
    for (const d of snapshot.farm.decorations)
      if (!this.decorations.has(d.id)) {
        const p = toIso(d.x, d.y);
        this.decorations.set(
          d.id,
          this.add
            .image(p.x, p.y, "flowers")
            .setOrigin(0.5, 0.94)
            .setDisplaySize(48, 36)
            .setDepth(p.y),
        );
      }
    if (!state.placement) {
      this.hover.clear();
      this.clearMoveGhost();
      this.placementOffset = { x: 0, y: 0 };
    }
    for (const plot of snapshot.farm.plots) {
      const key = plot.x + "," + plot.y;
      let field = this.fields.get(key);
      if (!field) {
        field = new CropField(this, plot.x, plot.y);
        this.fields.set(key, field);
      }
      const selected =
        this.stroke.has(key) ||
        (state.focus?.x === plot.x && state.focus?.y === plot.y);
      field.render(plot, farmNow(), selected);
      field.sway(time);
      if (this.stroke.has(key)) {
        const p = toIso(plot.x, plot.y);
        this.hover.lineStyle(2, 0xffed96, 0.9).strokePoints(
          [
            { x: p.x, y: p.y - 21 },
            { x: p.x + 43, y: p.y },
            { x: p.x, y: p.y + 21 },
            { x: p.x - 43, y: p.y },
          ],
          true,
        );
      }
    }
  }
}
