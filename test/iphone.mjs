/* Appen som den ser ut på en iPhone. Ingen annan test i sviten kör med en
   iPhone-user-agent, och därför är varje `detectOS() === 'ios'`-gren i app.js
   osedd av sviten. Det kostade en dag: tre commits som gjorde appen döv på
   telefonen gick igenom med 13/13 gröna, eftersom ingen av dem körde koden
   de ändrade.

   WebKit är samma motor som Safari, och med iPhone-profilen svarar detectOS()
   'ios' — vilket i sin tur stänger av nivåmätaren, så ingen riktig mikrofon
   behövs. Vad det här testet INTE kan se är iOS ljudsession: att ett yttrande
   faktiskt hörs, och var det kommer ut. Det avgörs bara på riktig enhet, och
   TAL-raden i mätpanelen finns för att kunna läsa av det där.

   Det testet däremot håller är formen på halv-duplexen, och det är där felen
   satt: hör appen, talar appen, och överlever igenkänningssessionen att appen
   pratar — eller rivs den en gång per ord? */
import { webkit, devices } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';

const b = await webkit.launch();
const page = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.addInitScript(() => {
  /* Samma attrapp som deaf.mjs: kumulativ inom en session, och den levererar
     bara från en session som lever. starts räknar hur många gånger appen har
     begärt mikrofonen — talet som avslöjar en rivning per yttrande. */
  window.__sr = { instances: [], starts: 0 };
  class FakeSR {
    constructor(){ window.__sr.instances.push(this); this.live = false; this.rows = []; }
    start(){
      window.__sr.starts++;
      this.live = true; this.rows = [];
      setTimeout(() => this.onstart && this.onstart(), 5);
    }
    stop(){ this.live = false; setTimeout(() => this.onend && this.onend(), 5); }
    abort(){ this.stop(); }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
  window.__sr.say = (text, isFinal) => {
    const i = window.__sr.instances[window.__sr.instances.length - 1];
    if (!i || !i.live || !i.onresult) return false;
    const r = [{ transcript: text }]; r.isFinal = !!isFinal;
    if (isFinal) i.rows.push(r);
    const results = i.rows.concat(isFinal ? [] : [r]);
    i.onresult({ results, resultIndex: results.length - 1 });
    return true;
  };

  /* Syntesen instrumenteras i stället för att bytas ut: headless WebKit ljuder
     ingenting, men händelsekedjan måste löpa hela vägen, annars släpps turen
     bara av vakthunden och testet mäter vakthunden i stället för appen. */
  window.__spoke = [];
  const realSpeak = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = u => {
    window.__spoke.push(u.text);
    /* Kort och förutsägbart — det är turens livscykel som prövas, inte tempot. */
    setTimeout(() => u.onstart && u.onstart(), 10);
    setTimeout(() => u.onend && u.onend(), 300);
    try { realSpeak(u); } catch(e){}
  };
});

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(1200);

const fails = [];
const check = (ok, what) => { console.log(`  ${ok ? 'OK  ' : 'FEL '} ${what}`); if(!ok) fails.push(what); };
const st = () => page.evaluate(() => ({
  pos: S.pos, speaking: S.speaking, recLive: S.recLive,
  starts: window.__sr.starts, spoke: window.__spoke.length,
  tal: document.getElementById('roTts').textContent
}));
const say = w => page.evaluate(w => window.__sr.say(w, true), w);
const gate = () => page.waitForFunction(
  () => S.running && !S.speaking && performance.now() >= S.ignoreUntil,
  null, { timeout: 15000 });

console.log('1. appen tror att den är på en iPhone');
const os = await page.evaluate(() => ({ os: detectOS(), meter: S.meter }));
console.log('   ' + JSON.stringify(os));
check(os.os === 'ios', 'detectOS() svarar ios — iOS-grenarna körs i det här testet');
check(os.meter === false, 'nivåmätaren är av som standard, så ingen inspelning för stapeln');

/* Lång hjälptimer under den första halvan: hjälpordet ska komma när testet
   ber om det, inte mitt i en mätning. */
await page.evaluate(() => setHold(20000));
await page.locator('#startBtn').click();
await page.waitForFunction(() => S.running, null, { timeout: 20000 });
await gate();

const words = await page.evaluate(() => S.words.map(w => w.raw));
const igång = await st();
console.log('   raden:', words.join(' '));
console.log('2. igång:', JSON.stringify(igång));
check(igång.recLive, 'igenkänningen lever efter start');
check(igång.spoke > 0, 'introt talades');

console.log('\n3. barnet läser två ord');
await say(words.slice(0,2).join(' '));
await page.waitForTimeout(600);
const efterTvå = await st();
console.log('   ' + JSON.stringify(efterTvå));
check(efterTvå.pos === 2, 'markören flyttades två ord — appen hör');

/* ---- kärnan: appen pratar mitt i passet ---- */
console.log('\n4. hjälpordet: appen pratar, sessionen ska stå kvar');
const startsFöre = efterTvå.starts;
await page.evaluate(() => setHold(400));
await page.waitForFunction(n => window.__spoke.length > n, efterTvå.spoke, { timeout: 15000 })
  .catch(() => {});
const underTal = await st();
console.log('   ' + JSON.stringify(underTal));
check(underTal.spoke > efterTvå.spoke, 'hjälpordet talades');
check(underTal.starts === startsFöre,
      'ingen ny igenkänningssession begärdes för att prata — mikrofonen revs inte');

console.log('\n5. och efteråt hör appen fortfarande');
await page.evaluate(() => setHold(20000));
await gate();
await say(words.slice(0,3).join(' '));
await page.waitForTimeout(600);
const fin = await st();
console.log('   ' + JSON.stringify(fin));
check(fin.pos === 3, 'markören gick vidare efter att appen pratat');
check(fin.recLive, 'igenkänningen lever fortfarande');
check(fin.starts === startsFöre, 'fortfarande samma session hela vägen');

console.log('\n6. TAL-raden säger vad syntesen gjorde');
console.log('   TAL: ' + fin.tal);
check(fin.tal !== '—' && !/vakthund/.test(fin.tal),
      'syntesen rapporterade ett riktigt steg, inte tystnad in i vakthunden');

verdict(fails.length === 0 && errors.length === 0,
        `${fails.length ? fails.join('; ') : 'alla kontroller gröna'}, ` +
        `sessioner ${fin.starts}, pos ${fin.pos}, sidfel ${errors.length}`);
await b.close();
