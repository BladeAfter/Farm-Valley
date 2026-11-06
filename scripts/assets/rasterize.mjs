import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage();
  for (const name of ["feed", "milk", "egg"]) {
    const svg = await readFile(
      "public/assets/products/" + name + ".svg",
      "utf8",
    );
    const src =
      "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
    const png = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 96;
      canvas.getContext("2d").drawImage(image, 0, 0, 96, 96);
      return canvas.toDataURL("image/png").split(",")[1];
    }, src);
    await writeFile(
      "public/assets/products/" + name + ".png",
      Buffer.from(png, "base64"),
    );
  }
  console.log("3 native vector icons rasterized for WebGL.");
} finally {
  await browser.close();
}
