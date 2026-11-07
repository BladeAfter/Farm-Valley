import type { Farm, Cell } from "../../src/types/game.js";
import { occupancyIssue } from "../../src/data/land.js";
/** Adds a free roadside kiosk without moving or replacing existing player objects. */
export function synchronizeMarketStand(farm:Farm):Farm{
 if(farm.marketStand!==undefined)return farm;
 const candidates:Cell[]=[];
 for(let x=1;x<=20;x+=.5)for(let y=1;y<=20;y+=.5)candidates.push({x,y});
 const score=({x,y}:Cell)=>Math.min(Math.abs(x-5),Math.abs(y-5),Math.abs(y-12))+Math.hypot(x-5,y-7)*.2;
 candidates.sort((a,b)=>score(a)-score(b));
 const position=candidates.find(p=>!occupancyIssue(farm,{x:p.x-.75,y:p.y-.75,w:1.5,h:1.5}));
 return {...farm,marketStand:position??null};
}
