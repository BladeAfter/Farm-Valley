import Phaser from "phaser";
import { orderReady } from "../../types/orders";
import type { Farm } from "../../types/game";
import { toIso } from "../map/isometric";

export class OrderNoticeBoard {
  private image?: Phaser.GameObjects.Image;
  private badge?: Phaser.GameObjects.Container;
  private count?: Phaser.GameObjects.Text;
  constructor(private scene: Phaser.Scene) {}
  sync(farm: Farm) {
    const position = farm.orderBoard?.position;
    if (!position) return;
    const p = toIso(position.x, position.y);
    if (!this.image) {
      this.image = this.scene.add.image(p.x, p.y, "village-noticeboard").setOrigin(.5, .94);
      const source = this.image.texture.getSourceImage();
      this.image.setDisplaySize(70, 70 * source.height / source.width);
      this.count = this.scene.add.text(0,0,"",{ fontFamily:"Trebuchet MS",fontSize:"11px",fontStyle:"bold",color:"#fff8d9" }).setOrigin(.5);
      this.badge = this.scene.add.container(p.x + 22, p.y - 48, [this.scene.add.circle(0,0,10,0x7e9f49).setStrokeStyle(1.5,0xf8e5aa), this.count]);
    }
    this.image.setPosition(p.x,p.y).setDepth(p.y + .2);
    const ready = farm.orderBoard!.slots.filter(slot => slot.order && orderReady(slot.order, farm.inventory)).length;
    this.count!.setText(new Intl.NumberFormat(document.documentElement.lang || "pt-BR").format(ready)); this.badge!.setPosition(p.x + 22,p.y - 48).setDepth(p.y + 1).setVisible(ready > 0);
    this.scene.game.canvas.dataset.orderBoardPosition = JSON.stringify(position);
  }
  at(x: number,y: number) { return !!this.image?.getBounds().contains(x,y); }
}
