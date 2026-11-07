import Phaser from "phaser";
import type { Farm } from "../../types/game";
import { toIso } from "../map/isometric";
export class MarketStand {
 private image:Phaser.GameObjects.Image;
 constructor(private scene:Phaser.Scene){
  this.image=scene.add.image(0,0,"market-stand").setOrigin(.5,.94).setVisible(false);
  const source=this.image.texture.getSourceImage();
  this.image.setDisplaySize(112,112*source.height/source.width);
 }
 sync(farm:Farm){
  if(!farm.marketStand){this.image.setVisible(false);return;}
  const p=toIso(farm.marketStand.x,farm.marketStand.y);
  this.image.setPosition(p.x,p.y).setDepth(p.y+.3).setVisible(true);
  this.scene.game.canvas.dataset.marketStand=JSON.stringify({...farm.marketStand,worldX:p.x,worldY:p.y});
 }
 at(x:number,y:number){return this.image.visible&&this.image.getBounds().contains(x,y);}
}
