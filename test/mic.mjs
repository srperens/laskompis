import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await chromium.launch({ args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
const page = await (await b.newContext({ permissions:['microphone'] })).newPage();
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
verdict(!!cfg && cfg.live === 'live' && cfg.echoCancellation === false &&
        cfg.noiseSuppression === false && cfg.autoGainControl === false && max > 0,
        `röstbehandling av, spåret lever, mätaren nådde ${max}%`);
await b.close();
