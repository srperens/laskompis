import { webkit } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await webkit.launch();
const page = await (await b.newContext()).newPage();
page.on('pageerror', e => console.log(`[pageerror] ${e.message}`));
await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(2000);
await page.locator('#setupBtn').click();
await page.locator('.tab[data-tab="voice"]').click();
await page.locator('#voice').selectOption('piper:sv_SE-nst-medium');
for (let i=0;i<120;i++){
  const t = await page.locator('#piperNote').textContent() || '';
  if (/aktiv|kunde inte|inte nedladdad/.test(t)) break;
  await page.waitForTimeout(2000);
}
console.log('1. aktiverad:', (await page.locator('#piperNote').textContent()).slice(0,30));

// force the neural path to fail and make sure the system voice takes over
console.log('\n2. sabbar syntesen och kallar speak()');
await page.evaluate(() => {
  window.__spoke = [];
  const real = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = u => { window.__spoke.push({ text:u.text, rate:+u.rate.toFixed(3), voice:u.voice && u.voice.name }); return real(u); };
  piper.session = { predict: () => Promise.reject(new Error('framtvingat fel')) };
  speak('fönstret', 'word');
});
await page.waitForTimeout(2500);
const fell = await page.evaluate(() => ({
  piperState: piper.state, speaking: S.speaking,
  spoke: (window.__spoke || []).slice(-1)[0] }));
console.log('   piperState:', fell.piperState);
console.log('   note:', await page.locator('#piperNote').textContent());
console.log('   speechSynthesis fick:', JSON.stringify(await page.evaluate(() => window.__spoke)));
console.log('   S.speaking:', await page.evaluate(() => S.speaking));

// switch back to a system voice
console.log('\n3. byter tillbaka till Alva');
await page.locator('#voice').selectOption('com.apple.voice.compact.sv-SE.Alva');
await page.waitForTimeout(1500);
const fin = await page.evaluate(() => ({
  piperState: piper.state, piperFor: piper.voice, voiceURI: S.voiceURI, voiceName: S.voiceName,
  note: document.getElementById('piperNote').textContent,
  noteHidden: document.getElementById('piperNote').hidden,
  spoke: window.__spoke.slice(-1)
}));
console.log('   ', JSON.stringify(fin));
verdict(fell.piperState === 'failed' && fell.spoke && fell.spoke.voice &&
        !fell.speaking && fin.piperState === 'off' && fin.noteHidden,
        `föll till systemrösten (${fell.spoke && fell.spoke.voice}), turen släppt, avstängd efter byte`);
await b.close();
