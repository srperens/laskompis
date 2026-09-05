import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
import { TYST } from './tyst.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await chromium.launch({ args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
const page = await (await b.newContext({ permissions:['microphone'] })).newPage();
await page.addInitScript(TYST);
await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(1200);
await page.locator('#startBtn').click();
await page.waitForFunction(() => S.running, null, { timeout: 15000 });
const seen = await page.evaluate(() => new Promise(res => {
  const vals = []; const t0 = performance.now();
  const id = setInterval(() => {
    vals.push(parseFloat(document.getElementById('lvl').style.width) || 0);
    if (performance.now() - t0 > 6000) { clearInterval(id); res(vals); }
  }, 60);
}));
const max = Math.max(...seen), nonzero = seen.filter(v=>v>0).length;
console.log(`nivåmätaren: ${seen.length} prov, max ${max}%, ${nonzero} över noll`);
const cfg = await page.evaluate(() => {
  const t = micStream && micStream.getAudioTracks()[0];
  return t ? { ...t.getSettings(), live: t.readyState } : null;
});
console.log('spårets inställningar:', JSON.stringify(cfg));
/* And with the meter off — the default on iPhone, where any capture moves the
   audio to the earpiece — the app must still start and still hear. Nothing may
   be captured at all: that is the entire point of the setting. */
console.log('\n--- mätaren av: ingen inspelning, men lyssningen kvar ---');
const off = await page.evaluate(async () => {
  stop();
  setMeter(false);
  await start();
  await new Promise(r => setTimeout(r, 1200));
  return { micStream: !!micStream, rafId: rafId !== null, running: S.running,
           mätare: document.getElementById('lvl').style.width,
           recByggd: !!rec };
});
console.log('   ' + JSON.stringify(off));
verdict(!!cfg && cfg.live === 'live' && cfg.echoCancellation === false &&
        cfg.noiseSuppression === false && cfg.autoGainControl === false && max > 0 &&
        off.running && off.recByggd && !off.micStream && !off.rafId,
        `röstbehandling av, mätaren nådde ${max}%; med mätaren av: igång utan inspelning`);
await b.close();
