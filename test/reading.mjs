import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
import { TYST } from './tyst.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await chromium.launch({ args:[
  '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
  '--autoplay-policy=no-user-gesture-required']});
const ctx = await b.newContext({ permissions:['microphone'] });
await ctx.addInitScript(TYST);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type()==='error') errors.push(m.text().slice(0,150)); });

await page.addInitScript(() => {
  window.__sr = { instances: [] };
  class FakeSR {
    constructor(){ window.__sr.instances.push(this); }
    start(){ setTimeout(() => this.onstart && this.onstart(), 3); }
    stop(){ setTimeout(() => this.onend && this.onend(), 3); }
    abort(){ this.stop(); }
  }
  window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
  /* The recognizer's result list is cumulative within a session, and the app
     anchors into it — so the fake must be cumulative too, or the alignment is
     being tested against a shape it never sees in life. */
  window.__session = [];
  window.__say = (text, isFinal) => {
    const i = window.__sr.instances[window.__sr.instances.length - 1];
    if (!i) return;
    const r = [{ transcript: text }]; r.isFinal = !!isFinal;
    if (isFinal) window.__session.push(r);
    const results = window.__session.concat(isFinal ? [] : [r]);
    i.onresult && i.onresult({ results, resultIndex: Math.max(0, results.length - 1) });
  };
  // a new session empties the list, exactly as the real API does
  window.__newSession = () => { window.__session = []; };
});

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(1000);
// reset the recognizer's cumulative list whenever a session restarts
await page.evaluate(() => {
  const orig = window.SpeechRecognition;
  window.SpeechRecognition = window.webkitSpeechRecognition = class extends orig {
    start(){ window.__newSession(); super.start(); }
  };
});

// a short, known text and a long help delay so nothing is spoken unprompted
await page.evaluate(() => {
  $('txt').value = 'Katten sover.\nHunden springer.';
  applyText();
  setHold(20000);
});
await page.locator('#startBtn').click();

const gateOpen = () => page.waitForFunction(
  () => S.running && !S.speaking && performance.now() >= S.ignoreUntil && S.recLive,
  null, { timeout: 20000 });

const st = () => page.evaluate(() => ({
  line: S.line, pos: S.pos, ord: S.words.map(w=>w.raw).join(' '),
  score: S.score, reviewing: S.reviewing, svåra: [...S.hard.keys()]
}));

await gateOpen();
console.log('start:', JSON.stringify(await st()));

async function readWord(i){
  await gateOpen();
  const w = await page.evaluate(i => S.words[i] && S.words[i].raw, i);
  if (!w) return null;
  await page.evaluate(w => window.__say(w, true), w);
  await page.waitForTimeout(250);
  return w;
}

console.log('\n--- läser rad 1 ord för ord ---');
for (let i = 0; i < 3; i++) {
  const w = await readWord(i);
  if (!w) break;
  console.log(`  sa "${w}" ->`, JSON.stringify(await st()));
}
await page.waitForTimeout(2200);      // the pause before the line advances
console.log('efter rad 1:', JSON.stringify(await st()));

console.log('\n--- läser rad 2, men säger fel på första ordet ---');
await gateOpen();
await page.evaluate(() => window.__say('hästen', true));
await page.waitForTimeout(400);
console.log('  efter felläsning:', JSON.stringify(await st()));
for (let i = 0; i < 3; i++) {
  const w = await readWord(i);
  if (!w) break;
  console.log(`  sa "${w}" ->`, JSON.stringify(await st()));
}
await page.waitForTimeout(2600);
console.log('\nefter sista raden:', JSON.stringify(await st()));
const fin = await page.evaluate(() => ({ score: S.score, reviewing: S.reviewing }));
verdict(errors.length === 0 && fin.score >= 4 && fin.reviewing,
        `poäng ${fin.score} (>=4), repetition startad ${fin.reviewing}, sidfel ${errors.length}`);
await b.close();
