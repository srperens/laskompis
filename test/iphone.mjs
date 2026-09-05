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
import { TYST } from './tyst.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';

const b = await webkit.launch();
const page = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
await page.addInitScript(TYST);
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.addInitScript(() => {
  /* Samma attrapp som deaf.mjs: kumulativ inom en session, och den levererar
     bara från en session som lever. starts räknar hur många gånger appen har
     begärt mikrofonen — talet som avslöjar en rivning per yttrande. */
  window.__sr = { instances: [], starts: 0, stops: 0, aborts: 0 };
  class FakeSR {
    constructor(){ window.__sr.instances.push(this); this.live = false; this.rows = [];
                   this.continuous = false; this.interimResults = false; }
    start(){
      window.__sr.starts++;
      this.live = true; this.rows = [];
      setTimeout(() => this.onstart && this.onstart(), 5);
    }
    /* Räknas bara när sessionen faktiskt lever: att stoppa en redan död
       session kostar ingen ljudsession och är inte det felet handlar om. */
    /* Riktiga igenkännare säger till när de hör någon börja prata. Attrappen
       måste göra det också, annars kan testet inte se latensmätningen. */
    talaStart(){ if(this.live && this.onspeechstart) this.onspeechstart(); }
    stop(){ if(this.live) window.__sr.stops++; this.live = false;
            setTimeout(() => this.onend && this.onend(), 5); }
    abort(){ if(this.live) window.__sr.aborts++; this.live = false;
             setTimeout(() => this.onend && this.onend(), 5); }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
  window.__sr.säg = (text, isFinal) => {
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
  speechSynthesis.speak = u => {
    window.__spoke.push(u.text);
    /* Kort och förutsägbart — det är turens livscykel som prövas, inte tempot. */
    setTimeout(() => u.onstart && u.onstart(), 10);
    setTimeout(() => u.onend && u.onend(), 300);
  };
});

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(1200);

const fails = [];
const check = (ok, what) => { console.log(`  ${ok ? 'OK  ' : 'FEL '} ${what}`); if(!ok) fails.push(what); };
const st = () => page.evaluate(() => ({
  pos: S.pos, speaking: S.speaking, recLive: S.recLive,
  starts: window.__sr.starts, stops: window.__sr.stops, aborts: window.__sr.aborts,
  spoke: window.__spoke.length,
  tal: document.getElementById('roTts').textContent
}));
const say  = w => page.evaluate(w => window.__sr.säg(w, true), w);
const halv = w => page.evaluate(w => window.__sr.säg(w, false), w);
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

/* Delresultat är hela poängen: markören ska följa orden medan barnet läser,
   inte hoppa fram först när igenkännaren bestämt att ett yttrande tagit slut.
   Utan dem känns appen trög på iPhone, och det var precis vad som hände när
   interimResults råkade stå av. */
console.log('\n3. markören följer delresultaten, ord för ord');
const bygge = await page.evaluate(() => ({ cont: rec.continuous, interim: rec.interimResults }));
console.log('   igenkännaren byggd med: ' + JSON.stringify(bygge));
check(bygge.interim === true, 'delresultat är på');
check(bygge.cont === false, 'sessionen är enkelskotts på iOS');

const steg = [];
for(let i = 1; i <= 2; i++){
  await halv(words.slice(0, i).join(' '));
  await page.waitForTimeout(300);
  steg.push(await page.evaluate(() => S.pos));
}
console.log('   pos efter varje delresultat: ' + JSON.stringify(steg));
check(steg[0] === 1 && steg[1] === 2, 'markören gick fram på delresultat, utan att vänta på final');

await say(words.slice(0,2).join(' '));
await page.waitForTimeout(600);
const efterTvå = await st();
console.log('   ' + JSON.stringify(efterTvå));
check(efterTvå.pos === 2, 'och står rätt när slutresultatet kommer');

/* ---- kärnan: appen pratar mitt i passet ---- */
console.log('\n4. hjälpordet: appen pratar utan att riva mikrofonen');
/* Invarianten är inte att sessionen överlever — på iOS är den enkelskotts och
   tar slut hela tiden av sig själv, vilket är hur WebKit vill ha det. Det som
   inte får hända är att appen STOPPAR en levande session för att kunna prata:
   det är den omförhandlingen av ljudsessionen som gjorde appen stum. */
const rivFöre = efterTvå.stops + efterTvå.aborts;
/* setHold ändrar bara värdet — timern som redan löper bär den gamla längden,
   så den måste armeras om för att hjälpen ska komma inom testets fönster. */
await page.evaluate(() => { setHold(400); armHoldoff(); });
await page.waitForFunction(n => window.__spoke.length > n, efterTvå.spoke, { timeout: 15000 })
  .catch(() => {});
const underTal = await st();
console.log('   ' + JSON.stringify(underTal));
check(underTal.spoke > efterTvå.spoke, 'hjälpordet talades');
check(underTal.stops + underTal.aborts === rivFöre,
      'ingen levande session stoppades för att prata');

console.log('\n5. och efteråt hör appen fortfarande');
await page.evaluate(() => setHold(20000));
await gate();
await say(words.slice(0,3).join(' '));
await page.waitForTimeout(600);
const fin = await st();
console.log('   ' + JSON.stringify(fin));
check(fin.pos === 3, 'markören gick vidare efter att appen pratat');
check(fin.recLive, 'lyssningen kom tillbaka av sig själv efter talet');
check(fin.stops + fin.aborts === rivFöre, 'och ingen rivning på hela vägen');

console.log('\n6. TAL-raden säger vad syntesen gjorde');
console.log('   TAL: ' + fin.tal);
check(fin.tal !== '—' && !/vakthund/.test(fin.tal),
      'syntesen rapporterade ett riktigt steg, inte tystnad in i vakthunden');

/* Latensen är det enda måttet som svarar på "känns appen trög", och på iPhone
   är nivåmätaren av med flit — så den måste komma från igenkännarens egen
   röststart. Utan den stod raden tom just där frågan ställdes. */
console.log('\n7. latensen ska gå att mäta även med nivåmätaren av');
await page.evaluate(() => { S.onsetAt = null; });
await page.evaluate(() => window.__sr.instances[window.__sr.instances.length-1].talaStart());
await page.waitForTimeout(120);
const onset = await page.evaluate(() => S.onsetAt !== null);
check(onset, 'röststarten från igenkännaren noteras');
await halv(words.slice(0,4).join(' '));
await page.waitForTimeout(300);
const lat = await page.evaluate(() => document.getElementById('roLat').textContent);
console.log('   LATENS: ' + lat + '   (mätaren av: ' + !(await page.evaluate(()=>S.meter)) + ')');
check(/^\d+ ms$/.test(lat), 'LATENS visar ett tal, inte ett streck');

verdict(fails.length === 0 && errors.length === 0,
        `${fails.length ? fails.join('; ') : 'alla kontroller gröna'}, ` +
        `sessioner ${fin.starts}, rivningar ${fin.stops + fin.aborts}, pos ${fin.pos}, sidfel ${errors.length}`);
await b.close();
