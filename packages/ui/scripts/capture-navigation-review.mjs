import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1700,height:1100}});
  await page.goto("http://127.0.0.1:4173/?section=applicationnavigation");
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>document.querySelectorAll(".application-nav-source-scroll").forEach(element=>{element.style.overflow="visible";}));
  await mkdir(new URL("../design/review",import.meta.url),{recursive:true});
  const ids=process.argv.slice(2);
  for(const theme of ["light","dark","sepia"]){
    await page.getByLabel("Appearance").selectOption(theme);
    for(const id of ids)await page.locator(`[data-app-nav-source-id="${id}"]`).screenshot({path:new URL(`../design/review/nav-layout-${id.replace(":","-")}-${theme}.png`,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,"$1")});
  }
  console.log(`Saved ${ids.length*3} navigation layout captures.`);
} finally {await browser.close();}
