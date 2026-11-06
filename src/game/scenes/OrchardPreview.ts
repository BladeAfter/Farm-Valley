/// <reference types="vite/client" />
// Isolated visual fixture for authored art stages. Does not simulate player inventory or timers.
import Phaser from "phaser";
import { fruitIds, fruitSpecies } from "../../types/orchard";
class OrchardPreview extends Phaser.Scene {
  preload() {
    this.load.image("grass", "/assets/terrain/grass-v3.webp");
    for (const id of fruitIds)
      this.load.spritesheet(
        id,
        "/assets/trees/orchard/" + id + "/stages-v1.webp",
        { frameWidth: 192, frameHeight: 192 },
      );
  }
  create() {
    this.add.tileSprite(640, 920, 1280, 1840, "grass").setTileScale(0.48);
    for (const [col, name] of [
      "Muda",
      "Crescimento",
      "Adulta vazia",
      "Frutos pequenos",
      "Amadurecendo",
      "Pronta",
    ].entries())
      this.add
        .text(115 + col * 193, 10, name, {
          fontFamily: "Trebuchet MS",
          fontSize: "16px",
          color: "#fff9dc",
          stroke: "#56723d",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0);
    fruitIds.forEach((id, row) => {
      const y = 70 + row * 220;
      this.add.text(20, y, fruitSpecies[id].name, {
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        color: "#fff9dc",
        stroke: "#56723d",
        strokeThickness: 3,
      });
      for (let frame = 0; frame < 6; frame++)
        this.add
          .sprite(110 + frame * 193, y + 163, id, frame)
          .setDisplaySize(150, 150)
          .setOrigin(0.5, 184 / 192);
    });
    this.game.canvas.dataset.orchardPreview = "ready";
  }
}
if (import.meta.env.DEV)
  new Phaser.Game({
    type: Phaser.AUTO,
    width: 1280,
    height: 1840,
    scene: OrchardPreview,
    backgroundColor: "#759f4c",
    render: { antialias: true },
  });
