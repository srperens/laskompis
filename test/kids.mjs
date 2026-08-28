import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await chromium.launch();
const page = await (await b.newContext()).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
let prompts = [];
page.on('dialog', d => { prompts.push(d.type()); d.accept(d.type()==='prompt' ? (globalThis.__answer ?? 'Nytt') : undefined); });
await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(700);

const state = () => page.evaluate(() => ({
  barn: store.profiles.map(p=>p.name), aktiv: profile() && profile().name,
  aktivFinns: store.profiles.some(p=>p.id===store.active),
  namnIRutan: $('kidName').textContent
}));

await page.evaluate(() => { $('setupBtn').click(); document.querySelector('.tab[data-tab="kids"]').click(); });
console.log('start:', JSON.stringify(await state()));

console.log('\n--- ta bort det enda barnet ---');
await page.evaluate(() => $('delKid').click());
await page.waitForTimeout(400);
console.log(' ', JSON.stringify(await state()), 'dialoger:', prompts.join(','));

console.log('\n--- lägg till över taket (12) ---');
await page.evaluate(() => {
  for (let i = 0; i < 20; i++) { $('newName').value = 'B' + i; $('addKid').click(); }
});
await page.waitForTimeout(400);
const s2 = await state();
console.log(`  ${s2.barn.length} barn (tak 12), aktiv finns: ${s2.aktivFinns}`);
console.log('  meddelande:', await page.locator('#kidMsg').textContent());

console.log('\n--- tomt namn och orimligt långt namn ---');
console.log(await page.evaluate(() => {
  const n0 = store.profiles.length;
  $('newName').value = '   '; $('addKid').click();
  const efterTomt = store.profiles.length;
  return `tomt namn lade till: ${efterTomt > n0}`;
}));
await page.evaluate(() => {
  store.profiles.length = 1; renderKids();
  $('newName').value = 'A'.repeat(200); $('addKid').click();
});
await page.waitForTimeout(300);
console.log('  längsta namnet:', (await page.evaluate(() => Math.max(...store.profiles.map(p=>p.name.length)))), 'tecken');

console.log('\n--- byta barn fram och tillbaka behåller var sitt tillstånd ---');
console.log(await page.evaluate(() => {
  store.profiles.length = 1;
  $('newName').value = 'Ett'; $('addKid').click();
  const a = profile().id;
  $('txt').value = 'Text för ett.'; applyText(); S.score = 11; remember();
  $('newName').value = 'Två'; $('addKid').click();
  const c = profile().id;
  $('txt').value = 'Text för två.'; applyText(); S.score = 22; remember();
  switchProfile(a);
  const first = { namn: profile().name, text: S.lines.join(''), poäng: S.score };
  switchProfile(c);
  const second = { namn: profile().name, text: S.lines.join(''), poäng: S.score };
  return JSON.stringify({ first, second });
}));

console.log('\n--- nollställ poäng och svåra ord ---');
console.log(await page.evaluate(() => {
  noteHard('abc'); S.score = 9; remember();
  const före = { poäng: profile().score, svåra: Object.keys(profile().hard).length };
  $('clearScore').click(); $('clearWords').click();
  return JSON.stringify({ före, efter: { poäng: profile().score, svåra: Object.keys(profile().hard).length, S: S.score, hard: S.hard.size } });
}));
verdict(errors.length === 0, `sidfel ${errors.length}`);
await b.close();
