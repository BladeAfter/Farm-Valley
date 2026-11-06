import {chromium} from "@playwright/test";
import {mkdir} from "node:fs/promises";
import assert from "node:assert/strict";
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto(process.env.FARM_BASE_URL||"http://localhost:5173");
 await page.locator('canvas[data-barn-facing="road"]').waitFor();
 await page.getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.").waitFor();
 await page.mouse.move(800,450);await page.mouse.down();await page.mouse.move(1054,551,{steps:15});await page.mouse.up();
 for(let i=0;i<6;i++)await page.getByRole("button",{name:"Aproximar",exact:true}).click();
 await page.waitForTimeout(500);
 await mkdir("docs/screenshots",{recursive:true});
 await page.screenshot({path:"docs/screenshots/barn-road-facing.png",clip:{x:420,y:200,width:650,height:400}});
 // The new front door still selects the actual inventory.
 await page.mouse.click(682,375);
 await page.getByRole("dialog",{name:"Do campo ao celeiro"}).waitFor();
 assert.deepEqual(errors,[]);
 console.log("PASS: barn front faces the access road, entrance selects inventory, no JS errors.");
}finally{await browser.close();}

