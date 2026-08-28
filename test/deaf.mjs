import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await chromium.launch({ args:[
  '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
  '--autoplay-policy=no-user-gesture-required']});
const page = await (await b.newContext({ permissions:['microphone'] })).newPage();
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));

await page.addInitScript(() => {
  window.__sr = { instances: [], starts: 0, wedge: false, autoStart: true };
  class FakeSR {
    constructor(){ window.__sr.instances.push(this); this.continuous=false; }
    start(){
      if (window.__sr.wedge) return;            // returns without throwing, never begins
      window.__sr.starts++;
      setTimeout(() => this.onstart && this.onstart(), 5);
    }
    stop(){ setTimeout(() => this.onend && this.onend(), 5); }
    abort(){ this.stop(); }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
  window.__sr.say = (text, isFinal) => {
    const i = window.__sr.instances[window.__sr.instances.length - 1];
    const r = [{ transcript: text }]; r.isFinal = !!isFinal;
    i && i.onresult && i.onresult({ results: [r], resultIndex: 0 });
  };
  window.__sr.err = (code) => {
    const i = window.__sr.instances[window.__sr.instances.length - 1];
    i && i.onerror && i.onerror({ error: code });
  };
});

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(1200);
/* A long help delay on purpose: the older rescue in tick() only fires after twice
   that, so within this test's window the supervisor is the only thing that can
   bring recognition back. Without it the test must fail. */
await page.evaluate(() => setHold(20000));
await page.locator('#startBtn').click();
await page.waitForFunction(() => S.running && !S.speaking, null, { timeout: 20000 });
// wait out the deadline that discards the previous session's tail
await page.waitForFunction(() => performance.now() >= S.ignoreUntil, null, { timeout: 10000 });

const st = () => page.evaluate(() => ({
  pos: S.pos, ord: S.words.map(w=>w.raw).join(' '),
  recLive: S.recLive, ignoreUntil: Math.max(0, Math.round(S.ignoreUntil - performance.now())),
  speaking: S.speaking, instanser: window.__sr.instances.length, starts: window.__sr.starts
}));

console.log('1. igång:', JSON.stringify(await st()));

// read the first two words correctly
const words = await page.evaluate(() => S.words.map(w => w.raw));
console.log('   raden:', words.join(' '));
await page.evaluate(w => window.__sr.say(w, true), words.slice(0,2).join(' '));
await page.waitForTimeout(600);
console.log('2. efter två ord:', JSON.stringify(await st()));

// ---- the wedge: onstart never comes again, and start() does not throw ----
console.log('\n3. framkallar låsningen (start() gör ingenting, onstart uteblir)');
await page.evaluate(() => { window.__sr.wedge = true; });
// force a restart the way a spoken word does
await page.evaluate(() => resetTranscript());
await page.waitForFunction(() => performance.now() >= S.ignoreUntil, null, { timeout: 10000 });
console.log('   direkt efter:', JSON.stringify(await st()));
await page.evaluate(w => window.__sr.say(w, true), words.slice(2,3).join(' '));
await page.waitForTimeout(400);
console.log('   ord sagt medan låst — pos ska stå still:', JSON.stringify(await st()));

console.log('\n4. väntar på tillsynen (upp till 12 s) …');
const before = await page.evaluate(() => window.__sr.instances.length);
await page.evaluate(() => { window.__sr.wedge = false; });   // the world recovers
/* Twelve seconds, not twenty. The help timer heals this too — it speaks the
   current word after the help delay, and that utterance's cleanup rebuilds a
   dead recognizer — but only after a whole holdoff of silence, and that is set
   to twenty here. Inside this window the supervisor is the only way back, so the
   bound is the assertion: the app must come back quickly, not eventually. */
let recovered = true;
await page.waitForFunction(n => window.__sr.instances.length > n || S.recLive, before, { timeout: 12000 })
  .then(()=>console.log('   kom tillbaka inom 12 s'))
  .catch(()=>{ recovered = false; console.log('   KOM INTE TILLBAKA inom 12 s'); });
await page.waitForTimeout(1200);
console.log('   efter:', JSON.stringify(await st()));

console.log('\n5. läser vidare efter återhämtningen');
await page.evaluate(w => window.__sr.say(w, true), words.slice(0,4).join(' '));
await page.waitForTimeout(600);
const fin = await st();
verdict(recovered && fin.instanser > 1 && fin.recLive && fin.pos > 0,
        `kom tillbaka inom 12 s (${recovered}), byggde om (${fin.instanser} instanser), läste till ord ${fin.pos}`);
await b.close();
