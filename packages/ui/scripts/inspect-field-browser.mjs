import { chromium } from "@playwright/test";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on("pageerror", error => console.log(error.stack));
  await page.goto("http://127.0.0.1:4173/?section=fields");
  await page.waitForTimeout(1000);
  console.log(await page.evaluate(() => ({ fonts: document.fonts.status, images: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => ({ src: image.src, complete: image.complete, loading: image.loading })), fields: document.querySelectorAll("[data-field-source-id]").length })));
  console.log((await page.locator("body").innerText()).slice(0, 1500));
} finally { await browser.close(); }
