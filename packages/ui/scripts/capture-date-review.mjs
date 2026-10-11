import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1700,height:1100}}); await page.goto("http://127.0.0.1:4173/?section=datepickers"); await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>document.querySelectorAll(".date-source-scroll").forEach(element=>{element.style.overflow="visible";}));
  await mkdir(new URL("../design/review",import.meta.url),{recursive:true});
  for(const theme of ["light","dark","sepia"]){await page.getByLabel("Appearance").selectOption(theme);for(const id of process.argv.slice(2))await page.locator(`[data-date-source-id="${id}"]`).screenshot({path:new URL(`../design/review/date-${id.replace(":","-")}-${theme}.png`,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")});}
  console.log("Date picker review captures saved.");
} finally {await browser.close();}
