import { chromium, webkit } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const eng = (process.argv[2]||'chromium') === 'webkit' ? webkit : chromium;
const b = await eng.launch();
const page = await (await b.newContext()).newPage();
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));
const net = [];
page.on('request', r => { if (/huggingface/.test(r.url())) net.push(r.url().split('/').slice(-1)[0]); });

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(1200);
await page.reload({ waitUntil:'load' });          // ensure the SW is in control
await page.waitForTimeout(2000);

async function pick(id, label){
  net.length = 0;
  const value = 'piper:' + id;
  // the sheet stays open between picks; only open it if it is closed
  if (!(await page.locator('#sheet').evaluate(e => e.classList.contains('open')))) {
    await page.locator('#setupBtn').click();
    await page.locator('.tab[data-tab="voice"]').click();
  }
  const t = Date.now();
  await page.locator('#voice').selectOption(value);
  await page.waitForFunction(
    id => piper.state === 'failed' || piper.state === 'off' ||
          (piper.state === 'ready' && piper.voice === id),
    id, { timeout: 300000, polling: 500 });
  const secs = ((Date.now()-t)/1000).toFixed(1);
  await page.locator('#testVoiceBtn').click();
  await page.waitForTimeout(7000);
  const st = await page.evaluate(() => ({
    piperState: piper.state, piperFor: piper.voice,
    dur: isFinite(piperPlayer.duration) ? +piperPlayer.duration.toFixed(2) : null,
    rate: piperPlayer.playbackRate, speaking: S.speaking }));
  console.log(`\n${label} — ${secs} s`);
  console.log(`  note: ${await page.locator('#piperNote').textContent()}`);
  console.log(`  HF: ${net.length ? net.join(', ') : 'INGA nätfrågor'}`);
  console.log(`  ${JSON.stringify(st)}`);
}

async function cacheState(){
  return page.evaluate(async () => {
    const c = await caches.open('laskompis-models-v1');
    const out = [];
    for (const k of await c.keys()) {
      const r = await c.match(k);
      out.push(`  ${k.url.split('/').slice(-1)[0]}  ${((await r.clone().arrayBuffer()).byteLength/1048576).toFixed(1)} MB`);
    }
    return out.join('\n') || '  (tom)';
  });
}

await pick('sv_SE-alma-medium', 'ALMA första gången');
console.log('\ncache:\n' + await cacheState());
await pick('sv_SE-lisa-medium', 'LISA första gången');
console.log('\ncache:\n' + await cacheState());
await pick('sv_SE-alma-medium', 'ALMA igen');
await page.reload({ waitUntil:'load' });
await page.waitForTimeout(2500);
const fin = await page.evaluate(() => ({ piperState: piper.state, piperFor: piper.voice, voiceURI: S.voiceURI }));
console.log('\nefter omladdning: ' + JSON.stringify(fin));
console.log('note: ' + await page.locator('#piperNote').textContent());
const cache = await cacheState();
console.log('\nslutlig cache:\n' + cache);
/* Two distinct models in the cache, the voice alive again after a reload without
   fetching anything: that is the whole question this file exists to answer. */
verdict(fin.piperState === 'ready' && /alma-medium\.onnx\s/.test(cache) &&
        /lisa-medium\.onnx\s/.test(cache),
        `aktiv efter omladdning, båda modellerna cachade`);
await b.close();
