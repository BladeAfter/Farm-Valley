import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  await page.goto('http://localhost:5173');
  await page.locator('canvas[data-scene="farm"]').waitFor();
  await page.getByRole('button', { name: 'Modo plantar', exact: true }).click();
  const results = await page.locator('.seed-grid img').evaluateAll(async images => {
    return Promise.all(images.map(async image => {
      await image.decode();
      return { src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight };
    }));
  });
  assert.equal(results.length, 7);
  assert.ok(results.every(r => r.width > 0 && r.height > 0));
  await page.screenshot({ path: 'docs/screenshots/seed-images-fixed.png' });
  console.log('PASS: all seven seed images decode, including the five locked crops at level 1.', results);
} finally { await browser.close(); }
