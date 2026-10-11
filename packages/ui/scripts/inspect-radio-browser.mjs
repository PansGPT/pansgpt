import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto("http://127.0.0.1:4174/?section=radios");
await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode())); });
for (const id of ["1142:93577", "1142:94643", "1142:94170", "1142:83113", "1142:83043"]) console.log(id, await page.locator(`[data-radio-source-id="${id}"]`).evaluate(figure => [...figure.querySelectorAll('.p-selection-card, .p-selection-card-header, .p-selection-card-body, .p-selection-card-plan-copy, .p-selection-card-price, .p-selection-card-description, .p-badge, .p-selection-card-actions')].map(node => { const rect=node.getBoundingClientRect(); const style=getComputedStyle(node); return { class:node.className, size:[rect.width,rect.height], gap:style.gap,lineHeight:style.lineHeight,padding:style.padding }; })));
await browser.close();
