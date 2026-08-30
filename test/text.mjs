/* Text that is not words: punctuation standing alone, lines with nothing to
   read, characters no child can say. Each of these once stopped a session dead
   — the strict setting could not pass a lone dash, and a line of asterisks left
   the cursor beyond the last word with nothing able to move it. */
import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';

const b = await chromium.launch();
const page = await (await b.newContext()).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(600);

const fails = [];
const check = (ok, what) => { console.log(`  ${ok ? 'OK  ' : 'FEL '} ${what}`); if(!ok) fails.push(what); };

console.log('normalisering:');
const norms = await page.evaluate(() => ({
  dash: norm('—'), ellips: norm('...'), stjärnor: norm('***'),
  citat: norm('"'), emoji: norm('🦊'), slash: norm('/'),
  bindestreck: norm('Räv-ungen'), siffra: norm('3'), punkt: norm('sover.'),
  svenska: norm('FÖNSTRET'), accent: norm('café')
}));
console.log('   ' + JSON.stringify(norms));
check(!norms.dash && !norms.ellips && !norms.stjärnor && !norms.citat &&
      !norms.emoji && !norms.slash, 'allt utan bokstäver blir tomt');
check(norms.bindestreck === 'rävungen' && norms.siffra === '3' &&
      norms.punkt === 'sover' && norms.svenska === 'fönstret' &&
      norms.accent === 'café', 'bokstäver och siffror bevaras, åäö och accenter med');

console.log('\nett ensamt skiljetecken hindrar inte markören:');
const cursor = await page.evaluate(() => {
  const out = {};
  ['mild','normal','strict'].forEach(st => {
    S.strict = st;
    $('txt').value = 'Katten – sover.';
    applyText();
    S.pos = 0; S.posSince = performance.now() - 60000;
    out[st] = align(['katten','sover'], 0, 0).pos + '/' + S.words.length;
  });
  return out;
});
console.log('   ' + JSON.stringify(cursor));
check(Object.values(cursor).every(v => v === '3/3'), 'alla stränghetsnivåer når radens slut');

console.log('\nrader utan något läsbart tas bort:');
const lines = await page.evaluate(() => {
  $('txt').value = 'Katten sover.\n—\n***\n\nHunden springer.';
  applyText();
  const efter = { rader: S.lines.slice(), pos: S.pos, ord: S.words.length };
  $('txt').value = 'Bara skräp.';   // ett läsbart utgångsläge
  applyText();
  const innan = S.lines.slice();
  $('txt').value = '—\n***\n"';      // ingenting läsbart alls
  applyText();
  return { efter, behöllTidigare: JSON.stringify(S.lines) === JSON.stringify(innan) };
});
console.log('   ' + JSON.stringify(lines));
check(lines.efter.rader.length === 2 && lines.efter.pos < lines.efter.ord,
      'skräpraderna borta, markören har någonstans att stå');
check(lines.behöllTidigare, 'en text helt utan läsbart lämnar den förra kvar');

console.log('\nbanken av svåra ord samlar inte skiljetecken:');
const bank = await page.evaluate(() => {
  S.hard.clear();
  ['–','...','"','🦊','fönstret.','Fönstret'].forEach(w => noteHard(w));
  return { nycklar: [...S.hard.keys()], repetition: hardList(6) };
});
console.log('   ' + JSON.stringify(bank));
check(bank.nycklar.length === 1 && bank.nycklar[0] === 'fönstret',
      'bara riktiga ord, och samma ord räknas som ett');

console.log('\npaus tystar rösten:');
const paused = await page.evaluate(() => {
  let cancels = 0;
  const real = speechSynthesis.cancel.bind(speechSynthesis);
  speechSynthesis.cancel = () => { cancels++; return real(); };
  S.running = true; S.speaking = true;
  stop();
  speechSynthesis.cancel = real;
  return { cancels, speaking: S.speaking };
});
console.log('   ' + JSON.stringify(paused));
check(paused.cancels > 0 && !paused.speaking, 'uppläsningen avbryts och turen släpps');

verdict(fails.length === 0 && errors.length === 0,
        `${fails.length ? fails.join('; ') : 'alla kontroller gröna'}, sidfel ${errors.length}`);
await b.close();
