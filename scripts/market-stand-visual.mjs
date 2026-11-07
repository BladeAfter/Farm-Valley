import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
try{
 const page=await browser.newPage({locale:"pt-BR",viewport:{width:1280,height:800}}),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto("http://localhost:5173");await page.locator('canvas[data-scene="farm"]').waitFor();
 await page.waitForFunction(()=>!!document.querySelector("canvas")?.dataset.marketStand);
 const position=await page.locator("canvas").evaluate(canvas=>JSON.parse(canvas.dataset.marketStand));
 await page.waitForTimeout(600);await page.screenshot({path:"docs/screenshots/market-stand-desktop.png"});
 await page.mouse.click(640+position.worldX-12,400+position.worldY-310-25);
 await page.getByRole("heading",{name:"Mercado",exact:true}).waitFor();
 await page.getByRole("button",{name:"Fechar",exact:true}).click();
 await page.reload();await page.locator('canvas[data-scene="farm"]').waitFor();
 await page.waitForFunction(()=>!!document.querySelector("canvas")?.dataset.marketStand);
 assert.deepEqual(await page.locator("canvas").evaluate(canvas=>JSON.parse(canvas.dataset.marketStand)),position);
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(500);
 await page.screenshot({path:"docs/screenshots/market-stand-mobile.png"});
 assert.deepEqual(errors,[]);console.log("PASS: market stand in scene opens real market and retains position after reload; desktop/mobile screenshots.");
}finally{await browser.close();}
