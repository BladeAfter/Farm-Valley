import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
try {
 const page=await browser.newPage({baseURL:"http://localhost:5173",locale:"pt-BR",viewport:{width:1280,height:800}}),errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 page.on("console",message=>{if(message.text().includes("Missing translation"))errors.push(message.text());});
 await page.goto("http://localhost:5173");
 await page.locator('canvas[data-scene="farm"]').waitFor();
 await page.evaluate(()=>window.qaCanvas=document.querySelector("canvas"));
 const before=(await (await page.request.get("/api/farm")).json()).farm;
 await page.getByRole("button",{name:"Configurações",exact:true}).click();
 await page.locator("[data-language-picker] > button").click();
 for(const locale of ["en","es","ru","tr","fa","ar","fr","de","it","id","hi","zh-CN","ja","ko","pl","pt-BR"]){
  await page.locator(`[data-locale="${locale}"]`).click();
  await page.waitForFunction(locale=>document.documentElement.lang===locale,locale);
  await page.waitForFunction(async locale=>(await (await fetch("/api/farm")).json()).farm.preferences?.locale===locale,locale);
  assert.equal(await page.evaluate(()=>window.qaCanvas===document.querySelector("canvas")),true);
  assert.equal(await page.locator("canvas").evaluate(element=>getComputedStyle(element).direction),"ltr");
  if(["ar","fa","de"].includes(locale)){
   await page.setViewportSize({width:640,height:360});
   await page.screenshot({path:`docs/screenshots/language-${locale}-small.png`});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.setViewportSize({width:1280,height:800});
  }
 }
 const after=(await (await page.request.get("/api/farm")).json()).farm;
 for(const key of ["coins","diamonds","xp","inventory","animals","plots"])assert.deepEqual(after[key],before[key],key);
 await page.reload();await page.locator('canvas[data-scene="farm"]').waitFor();
 assert.equal(await page.locator("html").getAttribute("lang"),"pt-BR");
 assert.deepEqual(errors,[]);
 console.log("PASS: 16 languages, server/local preference, stable canvas/economy, RTL and 640x360 layouts.");
}finally{await browser.close();}
