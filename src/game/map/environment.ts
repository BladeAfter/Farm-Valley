import Phaser from "phaser";
import { toIso } from "./isometric";
import { StoneWalls } from "../entities/StoneWalls";
import { farmWalls } from "./walls";
import { buildingLayout } from "../../data/buildings";

export function drawEnvironment(scene: Phaser.Scene) {
  scene.add
    .tileSprite(0, 420, 4400, 2600, "grass")
    .setTileScale(0.48)
    .setDepth(-1000);
  const ground = scene.add.graphics().setDepth(-900);
  ground.fillStyle(0x96b854, 0.1).fillRect(-2200, -900, 4400, 2600);
  const river = [
    { x: -1700, y: -520 },
    { x: 1450, y: -520 },
    { x: 1450, y: -320 },
    { x: 200, y: -260 },
    { x: -120, y: -160 },
    { x: -270, y: -30 },
    { x: -530, y: 155 },
    { x: -920, y: 310 },
    { x: -1700, y: 750 },
  ];
  ground.fillStyle(0x8dba65).fillPoints(river, true);
  const water = river.map((p, i) =>
    i < 4 ? { x: p.x, y: p.y } : { x: p.x - 28, y: p.y - 25 },
  );
  ground.fillStyle(0x438b9c).fillPoints(water, true);
  ground.lineStyle(12, 0xc5d696, 0.65);
  ground.beginPath();
  ground.moveTo(-920, 310);
  ground.lineTo(-530, 155);
  ground.lineTo(-270, -30);
  ground.lineTo(-120, -160);
  ground.lineTo(200, -260);
  ground.strokePath();
  ground.lineStyle(2, 0x9edbd8, 0.25);
  for (let i = 0; i < 95; i++) {
    const x = -1400 + ((i * 137) % 2600),
      y = -450 + ((i * 47) % 250);
    ground.lineBetween(x, y, x + 20 + (i % 4) * 12, y);
  }
  const roadMask = new Phaser.GameObjects.Graphics(scene);
  const roadSurface = scene.add
    .tileSprite(0, 420, 4400, 2600, "dirt")
    .setTileScale(0.55)
    .setDepth(-880)
    .setAlpha(0.8);
  roadSurface.setMask(roadMask.createGeometryMask());
  scene.events.once("shutdown", () => roadMask.destroy());
  const path = (cells: [number, number][]) => {
    const points = cells.map(([x, y]) => toIso(x, y));
    ground.lineStyle(51, 0xad7e43, 0.25).strokePoints(points, false);
    ground.lineStyle(43, 0xcb9c59).strokePoints(points, false);
    ground.lineStyle(33, 0xd7af70, 0.65).strokePoints(points, false);
    roadMask.lineStyle(40, 0xffffff).strokePoints(points, false);
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i],
        b = points[i + 1];
      for (let j = 0; j < 7; j++) {
        const t = j / 7;
        const x = Phaser.Math.Linear(a.x, b.x, t),
          y = Phaser.Math.Linear(a.y, b.y, t);
        ground
          .fillStyle(j % 2 ? 0xb58a56 : 0xe0bd83, 0.5)
          .fillEllipse(x + (j % 3) * 4, y, 3 + (j % 3), 1.5);
      }
    }
  };
  path([
    [5, -2],
    [5, 4],
    [5, 13],
    [5, 22],
  ]);
  path([
    [1, 5],
    [5, 5],
    [14, 5],
    [20, 5],
  ]);
  path([
    [5, 12],
    [11, 12],
    [17, 12],
  ]);
  path([
    [6.5, 2.6],
    [5, 2.6],
  ]);
  path([
    [buildingLayout.barn.entrance.x, buildingLayout.barn.entrance.y],
    [buildingLayout.barn.roadAccess.x, buildingLayout.barn.roadAccess.y],
  ]);
  path([
    [3, 11.5],
    [5, 11.5],
  ]);
  const walls = new StoneWalls(scene, farmWalls);
  scene.events.once("shutdown", () => walls.destroy());
  // Small hay bales stay beside the starter barn instead of dominating it.
  for (const [x, y, lift] of [
    [1.4, 8.6, 0],
    [1.8, 8.6, 0],
    [1.4, 8.6, 13],
  ]) {
    const p = toIso(x, y),
      h = scene.add.graphics().setDepth(p.y + lift * 0.01);
    const cy = p.y - lift;
    h.fillStyle(0x53612d, 0.13).fillEllipse(p.x + 1, p.y + 3, 22, 7);
    h.fillStyle(0xbe8d30).fillPoints(
      [
        { x: p.x - 10, y: cy - 8 },
        { x: p.x, y: cy - 3 },
        { x: p.x, y: cy + 6 },
        { x: p.x - 10, y: cy + 1 },
      ],
      true,
    );
    h.fillStyle(0xd7a744).fillPoints(
      [
        { x: p.x, y: cy - 3 },
        { x: p.x + 10, y: cy - 8 },
        { x: p.x + 10, y: cy + 1 },
        { x: p.x, y: cy + 6 },
      ],
      true,
    );
    h.fillStyle(0xeac25f).fillPoints(
      [
        { x: p.x - 10, y: cy - 8 },
        { x: p.x, y: cy - 13 },
        { x: p.x + 10, y: cy - 8 },
        { x: p.x, y: cy - 3 },
      ],
      true,
    );
    h.lineStyle(1.6, 0x96773d)
      .lineBetween(p.x - 5, cy - 10, p.x + 5, cy - 5)
      .lineBetween(p.x + 5, cy - 5, p.x + 5, cy + 3);
    h.lineStyle(0.7, 0xf2d588, 0.7)
      .lineBetween(p.x - 7, cy - 8, p.x - 2, cy - 6)
      .lineBetween(p.x + 2, cy - 7, p.x + 6, cy - 9);
  }
}
