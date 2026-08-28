import { webkit } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await webkit.launch();
const page = await (await b.newContext()).newPage();
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));
await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(2000);

const dump = () => page.evaluate(() => ({
  groups: [...document.querySelectorAll('#voice optgroup')].map(g =>
    `${g.label}: ${[...g.querySelectorAll('option')].map(o=>o.textContent.split('·')[0].trim()).join(', ')}`),
  selected: document.getElementById('voice').value,
  info: document.getElementById('voiceInfo').textContent,
  sVoice: S.voice && S.voice.name
}));

console.log('=== normalfall (svensk röst finns) ===');
const normal = await dump();
console.log(JSON.stringify(normal, null, 1));

console.log('\n=== enhet utan svensk röst ===');
console.log(JSON.stringify(await page.evaluate(() => {
  const all = speechSynthesis.getVoices().filter(v => !(v.lang||'').toLowerCase().startsWith('sv'));
  speechSynthesis.getVoices = () => all;
  voiceTries = 0; loadVoices();
  return null;
}) ?? {}, null, 1));
await page.waitForTimeout(400);
const utan = await dump();
console.log(JSON.stringify(utan, null, 1));

console.log('\n=== sparat val pekar på en engelsk röst, men svenska finns ===');
console.log(await page.evaluate(() => {
  location.reload; // no-op
  return 'ok';
}));
await page.reload({ waitUntil:'load' });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  S.voiceURI = 'com.apple.speech.synthesis.voice.Albert';
  S.voiceName = 'Albert';
  voiceTries = 0; loadVoices();
});
await page.waitForTimeout(400);
const tredje = await dump();
console.log(JSON.stringify(tredje, null, 1));
verdict(!normal.groups.some(g => /Övriga/.test(g)) &&
        utan.groups.some(g => /Övriga/.test(g)) &&
        normal.groups.some(g => /Neural/.test(g)) &&
        tredje.selected === normal.selected,
        'inga andra språk när svenska finns, nödlösning när den saknas, engelskt sparat val faller tillbaka'),
await b.close();
