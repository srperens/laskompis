import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
import { TYST } from './tyst.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await chromium.launch({ args:[
  '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
  '--autoplay-policy=no-user-gesture-required']});
const page = await (await b.newContext({ permissions:['microphone'] })).newPage();
await page.addInitScript(TYST);
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));

/* Talet lämnar aldrig appen ostört: sessionen ska överleva att appen pratar,
   och dövheten framkallas här på de två sätt den uppstår i verkligheten.

   Attrappen är kumulativ inom en session (se test/README.md) och levererar
   bara resultat från en session som faktiskt lever — en död session som ändå
   skickar onresult vore att testa en värld där dövhet inte finns. */
await page.addInitScript(() => {
  window.__sr = { instances: [], starts: 0, wedge: false };
  class FakeSR {
    constructor(){ window.__sr.instances.push(this); this.live = false; this.rows = []; }
    start(){
      if (window.__sr.wedge) return;            // returns without throwing, never begins
      window.__sr.starts++;
      this.live = true; this.rows = [];         // a new session empties the list
      setTimeout(() => this.onstart && this.onstart(), 5);
    }
    stop(){ this.live = false; setTimeout(() => this.onend && this.onend(), 5); }
    abort(){ this.stop(); }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
  const last = () => window.__sr.instances[window.__sr.instances.length - 1];
  window.__sr.say = (text, isFinal) => {
    const i = last();
    if (!i || !i.live || !i.onresult) return false;
    const r = [{ transcript: text }]; r.isFinal = !!isFinal;
    if (isFinal) i.rows.push(r);
    const results = i.rows.concat(isFinal ? [] : [r]);
    i.onresult({ results, resultIndex: results.length - 1 });
    return true;
  };
  /* Sessionen dör som Chrome avslutar en: onend kommer, och med wedge på gör
     varje start() ingenting — utan att kasta. */
  window.__sr.die = () => { const i = last(); if(!i) return; i.live = false; i.onend && i.onend(); };
  /* Det elakare dödssättet: inget onend alls. Appens flagga säger fortfarande
     att sessionen lever, och bara tillsynens klocka kan avslöja motsatsen. */
  window.__sr.vanish = () => { const i = last(); if(!i) return; i.live = false; };
});

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(1200);
/* A long help delay on purpose: within this test's window the supervisor is the
   only thing that can bring recognition back. Without it the test must fail. */
await page.evaluate(() => setHold(30000));
await page.locator('#startBtn').click();
await page.waitForFunction(() => S.running && !S.speaking, null, { timeout: 20000 });
// wait out the discard window that swallows the intro's tail
await page.waitForFunction(() => performance.now() >= S.ignoreUntil, null, { timeout: 10000 });

const st = () => page.evaluate(() => ({
  pos: S.pos, recLive: S.recLive,
  ignoreUntil: Math.max(0, Math.round(S.ignoreUntil - performance.now())),
  speaking: S.speaking, instanser: window.__sr.instances.length, starts: window.__sr.starts
}));
const say = w => page.evaluate(w => window.__sr.say(w, true), w);
/* recLive sätts av onstart, och attrappen låter start() och onstart ligga 5 ms
   isär precis som en riktig igenkännare gör. Ett ord som levereras i det
   glappet nollställs av onstart som hör till den nya sessionen. Det är inte
   ett appfel — en session som just börjat har inte hört något än — men testet
   måste låta den komma igång, annars mäter det sin egen kapplöpning. */
const gate = async () => {
  await page.waitForFunction(
    () => S.running && !S.speaking && performance.now() >= S.ignoreUntil && S.recLive,
    null, { timeout: 30000 });
  await page.waitForTimeout(250);
};

const words = await page.evaluate(() => S.words.map(w => w.raw));
console.log('1. igång:', JSON.stringify(await st()));
console.log('   raden:', words.join(' '));

// read the first two words correctly
await say(words.slice(0,2).join(' '));
await page.waitForTimeout(600);
const afterTwo = await st();
console.log('2. efter två ord:', JSON.stringify(afterTwo));

/* ---- death #1: the session ends (onend arrives), every restart silently
   fails. The retry chain runs out; only the supervisor can come back. ---- */
console.log('\n3. sessionen dör med onend, omstarterna misslyckas tyst');
await page.evaluate(() => { window.__sr.wedge = true; window.__sr.die(); });
await page.waitForTimeout(1500);              // let the onend retry chain run out
const delivered = await say(words[2]);
await page.waitForTimeout(400);
const whileDead = await st();
console.log('   ord sagt medan döv (levererat: ' + delivered + '):', JSON.stringify(whileDead));

console.log('\n4. världen friskar till sig — tillsynen ska hitta tillbaka (< 14 s)');
await page.evaluate(() => { window.__sr.wedge = false; });
let recovered1 = true;
await page.waitForFunction(() => S.recLive, null, { timeout: 14000 })
  .then(()=>console.log('   kom tillbaka'))
  .catch(()=>{ recovered1 = false; console.log('   KOM INTE TILLBAKA'); });
await gate().catch(()=>{});
await say(words[2]);
await page.waitForTimeout(600);
const afterFirst = await st();
console.log('   läser vidare:', JSON.stringify(afterFirst));

/* ---- death #2: no onend at all. recLive stays true, so only staleness can
   give the death away — the supervisor must stop trusting the flag. ---- */
console.log('\n5. sessionen försvinner utan onend — flaggan ljuger');
await page.evaluate(() => window.__sr.vanish());
const delivered2 = await say(words[3]);
const stuck = await st();
console.log('   ord sagt medan döv (levererat: ' + delivered2 + '), recLive ljuger:', JSON.stringify(stuck));

console.log('\n6. väntar på tillsynen (upp till 30 s) …');
const startsBefore = await page.evaluate(() => window.__sr.starts);
let recovered2 = true;
await page.waitForFunction(n => window.__sr.starts > n, startsBefore, { timeout: 30000 })
  .then(()=>console.log('   ny session startad'))
  .catch(()=>{ recovered2 = false; console.log('   INGEN NY SESSION'); });
await gate().catch(()=>{});
await say(words[3]);
await page.waitForTimeout(600);
const fin = await st();
console.log('   läser vidare:', JSON.stringify(fin));

/* How it came back is the app's business — a nudge to the existing recognizer is
   the better answer and costs no audio session. That it came back both times,
   that nothing moved while it was deaf, and that reading continued afterwards
   is the property worth holding. */
verdict(afterTwo.pos === 2 && !delivered && whileDead.pos === 2 &&
        recovered1 && afterFirst.pos === 3 &&
        !delivered2 && stuck.recLive &&
        recovered2 && fin.recLive && fin.pos === 4,
        `stod still som döv (${whileDead.pos}===2), tillbaka efter onend-död (${recovered1}, pos ${afterFirst.pos}), ` +
        `tillbaka efter tyst död (${recovered2}, pos ${fin.pos})`);
await b.close();
