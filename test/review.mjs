import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
import { TYST } from './tyst.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await chromium.launch({ args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
const page = await (await b.newContext({ permissions:['microphone'] })).newPage();
await page.addInitScript(TYST);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => {
  window.__sr = { instances: [] };
  class FakeSR {
    constructor(){ window.__sr.instances.push(this); }
    start(){ window.__session = []; setTimeout(() => this.onstart && this.onstart(), 3); }
    stop(){ setTimeout(() => this.onend && this.onend(), 3); }
    abort(){ this.stop(); }
  }
  window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
  window.__session = [];
  window.__say = (t, f) => {
    const i = window.__sr.instances[window.__sr.instances.length-1]; if(!i) return;
    const r = [{transcript:t}]; r.isFinal = !!f;
    if(f) window.__session.push(r);
    const results = window.__session.concat(f ? [] : [r]);
    i.onresult && i.onresult({ results, resultIndex: Math.max(0, results.length-1) });
  };
});
await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(900);
await page.evaluate(() => { $('txt').value = 'Katten sover.\nHunden springer.'; applyText(); setHold(20000); });
await page.locator('#startBtn').click();

const gate = () => page.waitForFunction(() => S.running && !S.speaking && performance.now() >= S.ignoreUntil && S.recLive, null, {timeout:20000});
const st = () => page.evaluate(() => ({ line:S.line, pos:S.pos, rad:S.words.map(w=>w.raw).join(' '),
  reviewing:S.reviewing, källa:S.source && S.source.join(' | '), rader:S.lines.join(' | '), svåra:[...S.hard.keys()] }));

// misread every first word so both lines contribute a hard word
for (const [line, miss] of [[0,'hästen'],[1,'hästen']]) {
  await gate();
  await page.evaluate(m => window.__say(m, true), miss);
  await page.waitForTimeout(350);
  for (let i=0;i<2;i++){
    await gate();
    const w = await page.evaluate(i => S.words[i] && S.words[i].raw, i);
    if(!w) break;
    await page.evaluate(w => window.__say(w, true), w);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(2400);
}
console.log('repetitionen börjar:', JSON.stringify(await st()));

// read every review word until the review is over
for (let n = 0; n < 10; n++) {
  const done = await page.evaluate(() => !S.reviewing);
  if (done) break;
  await gate();
  const w = await page.evaluate(() => S.words.map(x=>x.raw).join(' '));
  await page.evaluate(w => window.__say(w, true), w);
  await page.waitForTimeout(2500);
  console.log(`  läste "${w}" ->`, JSON.stringify(await st()));
}
console.log('\nefter repetitionen:', JSON.stringify(await st()));
const fin = await page.evaluate(() => ({ rev: S.reviewing, rader: S.lines.join('|'),
  källa: S.source && S.source.join('|'), hard: S.hard.size }));
verdict(errors.length === 0 && !fin.rev && fin.rader === fin.källa && fin.hard === 0,
        `repetition avslutad, text återställd (${fin.rader === fin.källa}), bank tömd (${fin.hard})`);
await b.close();
