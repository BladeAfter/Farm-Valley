/// <reference types="vite/client" />
// Isolated development visual fixture. No player state, API commands or production UI.
import Phaser from "phaser";
import { StoneWalls } from "../entities/StoneWalls";
import { toIso } from "../map/isometric";
import { wallPathsFromCells, type WallPath } from "../map/walls";

export const wallCases: { title: string; paths: WallPath[] }[] = [
  { title: "01 · Peça isolada", paths: [[{ x: 0, y: 0 }]] },
  {
    title: "02 · Linha de 10 peças",
    paths: wallPathsFromCells(
      Array.from({ length: 10 }, (_, x) => ({ x: x * 0.5, y: 0 })),
    ),
  },
  {
    title: "03 · Canto de 90 graus",
    paths: [
      [
        { x: 0, y: 0 },
        { x: 2.5, y: 0 },
        { x: 2.5, y: 2.5 },
      ],
    ],
  },
  {
    title: "04 · Quadrado fechado",
    paths: [
      [
        { x: 0, y: 0 },
        { x: 2.5, y: 0 },
        { x: 2.5, y: 2.5 },
        { x: 0, y: 2.5 },
        { x: 0, y: 0 },
      ],
    ],
  },
  {
    title: "05 · Conexão de dois muros",
    paths: [
      [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
      ],
      [
        { x: 2, y: 0 },
        { x: 2, y: 2.5 },
      ],
    ],
  },
  {
    title: "06 · Caminho e plantação",
    paths: [
      [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
      ],
      [
        { x: 0, y: 3 },
        { x: 4, y: 3 },
      ],
    ],
  },
];
class WallPreview extends Phaser.Scene {
  preload() {
    this.load.image("wall-stone", "/assets/terrain/walls/fieldstone-v1.webp");
    for (const [key, path] of Object.entries({
      grass: "terrain/grass-v3.webp",
      dirt: "terrain/dirt-v2.webp",
      wheat: "crops/wheat/ready-v2.webp",
    }))
      this.load.image(key, "/assets/" + path);
  }
  create() {
    this.add
      .tileSprite(640, 540, 1280, 1080, "grass")
      .setTileScale(0.48)
      .setDepth(-1000);
    wallCases.forEach((entry, i) => {
      const ox = (i % 2) * 640 + 200,
        oy = Math.floor(i / 2) * 350 + 125;
      this.add
        .text((i % 2) * 640 + 28, Math.floor(i / 2) * 350 + 25, entry.title, {
          fontFamily: "Trebuchet MS",
          fontSize: "21px",
          color: "#fff7dd",
          stroke: "#54683c",
          strokeThickness: 3,
        })
        .setDepth(10000);
      // Translate logical positions through the same projection, not a screen-space skew.
      const dx = ox / 88 + oy / 44,
        dy = oy / 44 - ox / 88;
      const paths = entry.paths.map((path) =>
        path.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      );
      if (i === 5) {
        const road = this.add.graphics().setDepth(-900);
        const a = toIso(dx - 1, dy - 1),
          b = toIso(dx + 5, dy - 1);
        road.lineStyle(25, 0xc7a16a).lineBetween(a.x, a.y, b.x, b.y);
        for (let x = 0; x < 4; x++)
          for (let y = 1; y < 3; y++) {
            const p = toIso(dx + x + 0.5, dy + y - 0.2);
            this.add
              .image(p.x, p.y, "wheat")
              .setOrigin(0.5, 0.94)
              .setDisplaySize(48, 43)
              .setDepth(p.y);
          }
      }
      new StoneWalls(this, paths);
    });
    this.game.canvas.dataset.wallPreview = "ready";
  }
}
if (import.meta.env.DEV)
  new Phaser.Game({
    type: Phaser.AUTO,
    width: 1280,
    height: 1050,
    scene: WallPreview,
    backgroundColor: "#759f4c",
    render: { antialias: true },
  });
