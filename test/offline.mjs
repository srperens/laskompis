import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await chromium.launch();
const ctx = await b.newContext();
const page = await ctx.newPage();
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(1500);
await page.reload({ waitUntil:'load' });          // service worker in control
await page.waitForTimeout(2000);
console.log('sw kontrollerar:', await page.evaluate(() => !!navigator.serviceWorker.controller));

console.log('\nskalcachen:');
console.log(await page.evaluate(async () => {
  const c = await caches.open('laskompis-v1');
  return (await c.keys()).map(k => '  ' + k.url.replace(BASE + '/','')).sort().join('\n');
}));

console.log('\n--- kopplar bort nätet och laddar om ---');
await ctx.setOffline(true);
await page.reload({ waitUntil:'load' }).catch(e => console.log('[reload] ' + e.message.split('\n')[0]));
await page.waitForTimeout(2500);

const fin = await page.evaluate(() => ({
  css: !!getComputedStyle(document.body).backgroundColor &&
       getComputedStyle(document.querySelector('.card') || document.body).borderRadius,
  jsKörde: typeof S !== 'undefined',
  profilLäst: typeof store !== 'undefined' && !!store,
  textVisas: (document.getElementById('sentence') || {}).childElementCount || 0,
  version: (document.getElementById('build') || {}).textContent
}));
console.log('offline-status:', JSON.stringify(fin));
verdict(fin.jsKörde && fin.profilLäst && fin.textVisas > 0 && !!fin.css,
        `stil ${fin.css}, kod körde, profil läst, ${fin.textVisas} ord renderade utan nät`);
await ctx.setOffline(false);
await b.close();
