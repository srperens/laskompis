/* Diagnostiken ska vara gömd, men gå att få fram.

   Mätraden och händelseloggen är till för den vuxna som felsöker, inte för
   barnet som läser, och på en telefon finns ingen konsol att flytta dem till.
   Så de finns kvar bakom ett debugläge: fem tryck på versionsraden, eller
   #debug i adressen.

   Två fel vore lika illa: att de syns för ett barn, och att de inte går att
   få fram när något beter sig konstigt på en telefon. Båda prövas här. */
import { webkit, devices } from 'playwright';
import { verdict } from './verdict.mjs';
import { TYST } from './tyst.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';

const b = await webkit.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
await ctx.addInitScript(TYST);
await ctx.addInitScript(() => {
  class F { constructor(){ this.live=false; } start(){ this.live=true;
      setTimeout(()=>this.onstart&&this.onstart(),5); }
    stop(){ this.live=false; setTimeout(()=>this.onend&&this.onend(),5); } abort(){ this.stop(); } }
  window.SpeechRecognition = F; window.webkitSpeechRecognition = F;
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

const fails = [];
const check = (ok,what)=>{ console.log(`  ${ok?'OK  ':'FEL '} ${what}`); if(!ok) fails.push(what); };

/* Rutan kan redan stå öppen — appen öppnar den själv när något behöver sägas.
   Att trycka på knappen igen träffar då bara överlägget. */
const öppna = async () => {
  const öppen = await page.evaluate(() => $('sheet').classList.contains('open'));
  if(!öppen) await page.locator('#setupBtn').click();
  await page.locator('.tab[data-tab="reading"]').click();
  await page.waitForTimeout(250);
};
const syns = async () => ({
  logg:    await page.locator('#recLog').isVisible(),
  reglage: await page.locator('#recTuning').isVisible(),
  mätrad:  await page.locator('.panel .readouts').isVisible()
});
const inget = o => !o.logg && !o.reglage && !o.mätrad;
const allt  = o => o.logg && o.reglage && o.mätrad;

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(800);
await öppna();
const normalt = await syns();
console.log('1. normalt läge:', JSON.stringify(normalt));
check(inget(normalt), 'ingenting av diagnostiken syns för ett barn');

console.log('\n2. fem tryck på versionsraden');
for(let i=0;i<5;i++){ await page.locator('#build').click(); await page.waitForTimeout(70); }
await page.waitForTimeout(250);
const på = await syns();
console.log('   ' + JSON.stringify(på));
check(allt(på), 'loggen, reglagen och mätraden kommer fram');

console.log('\n3. färre än fem tryck ska inte råka slå på det');
for(let i=0;i<5;i++){ await page.locator('#build').click(); await page.waitForTimeout(70); }
await page.waitForTimeout(200);
check(inget(await syns()), 'fem tryck till stänger av igen');
for(let i=0;i<3;i++){ await page.locator('#build').click(); await page.waitForTimeout(70); }
await page.waitForTimeout(200);
check(inget(await syns()), 'tre tryck gör ingenting');
/* Och trycken får inte samlas på hög över lång tid — ett barn som petar på
   skärmen då och då ska aldrig hamna här. */
await page.waitForTimeout(1500);
for(let i=0;i<3;i++){ await page.locator('#build').click(); await page.waitForTimeout(70); }
await page.waitForTimeout(200);
check(inget(await syns()), 'trycken räknas inte ihop över en paus');

console.log('\n4. valet överlever omladdning, och #debug fungerar');
for(let i=0;i<5;i++){ await page.locator('#build').click(); await page.waitForTimeout(70); }
await page.waitForTimeout(200);
await page.reload({ waitUntil:'load' }); await page.waitForTimeout(800);
await öppna();
check(allt(await syns()), 'debugläget är kvar efter omladdning');

/* Rent utgångsläge, så #debug prövas för sig och inte på det sparade valet. */
await page.evaluate(()=>{ try{ localStorage.removeItem('laskompis.debug'); }catch(e){} });
await page.goto(BASE + '/index.html', { waitUntil:'load' }); await page.waitForTimeout(800);
await öppna();
check(inget(await syns()), 'och går att glömma');
/* Två vägar in, och båda ska duga: hashen på en färsk sidladdning, och hashen
   satt på en sida som redan är öppen — den senare laddar inte om något. */
await page.goto(BASE + '/index.html#debug', { waitUntil:'load' });
await page.reload({ waitUntil:'load' }); await page.waitForTimeout(800);
await öppna();
check(allt(await syns()), '#debug vid sidladdning tar fram den utan tryckandet');

await page.evaluate(()=>{ try{ localStorage.removeItem('laskompis.debug'); }catch(e){} });
await page.goto(BASE + '/index.html', { waitUntil:'load' }); await page.waitForTimeout(800);
await page.evaluate(()=>{ location.hash = 'debug'; });
await page.waitForTimeout(300);
await öppna();
check(allt(await syns()), '#debug på en redan öppen sida fungerar också');

console.log('\n5. loggen fylls med något användbart');
await page.locator('#closeBtn').click();
await page.waitForTimeout(300);
await page.locator('#startBtn').click();
await page.waitForTimeout(1200);
await öppna();
const logg = await page.locator('#recLog').inputValue();
console.log('   ' + logg.split('\n').slice(0,4).join('\n   '));
check(/bygger igenkännare/.test(logg) && /start/.test(logg),
      'igenkännarens händelser står i loggen');

verdict(fails.length === 0 && errors.length === 0,
        `${fails.length ? fails.join('; ') : 'alla kontroller gröna'}, sidfel ${errors.length}`);
await b.close();
