/* Appen som hör sig själv, och blir döv av det.

   Alla andra attrapper i sviten levererar resultat i samma ögonblick testet
   ber om det. Riktiga WebKit gör inte det: den sitter på ljudet och lämnar
   ifrån sig ett slutresultat långt senare. Och den hör högtalaren — appens
   eget hjälpord går in i mikrofonen igen.

   Det är precis den kombinationen som ingen test har kunnat se, och den som
   gör att markören flyttas av appens egen röst medan barnet inte hörs.
   Attrappen här gör båda: allt appen säger matas tillbaka som hört ljud, och
   allt levereras med fördröjning. */
import { webkit, devices } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';

/* Längre än appens kastfönster. Det är hela poängen: en stoppklocka som
   löper ut innan svansen kommer skyddar ingenting. */
const LEVERANS_MS = 1800;

const b = await webkit.launch();
const page = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.addInitScript(([dröjMs]) => {
  window.__sr = { instances: [], starts: 0, ekon: [] };
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
  const last = () => window.__sr.instances[window.__sr.instances.length - 1];

  /* Hört nu, levererat sedan. Listan är kumulativ inom sessionen, som riktiga
     igenkännare — och en session som dött levererar ingenting. */
  window.__sr.hör = (text) => {
    const i = last();
    if (!i) return;
    setTimeout(() => {
      if (!i.live || !i.onresult) return;
      const r = [{ transcript: text }]; r.isFinal = true;
      i.rows.push(r);
      i.onresult({ results: i.rows.slice(), resultIndex: i.rows.length - 1 });
    }, dröjMs);
  };

  /* Högtalaren går in i mikrofonen. Ingen ekosläckning finns att begära för
     igenkännaren, så det här är vad telefonen faktiskt gör. */
  window.__spoke = [];
  const realSpeak = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = u => {
    window.__spoke.push(u.text);
    setTimeout(() => u.onstart && u.onstart(), 10);
    setTimeout(() => {
      window.__sr.ekon.push(u.text);
      window.__sr.hör(u.text);          // appen hör sig själv
      u.onend && u.onend();
    }, 300);
    try { realSpeak(u); } catch(e){}
  };
}, [LEVERANS_MS]);

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(1200);

const fails = [];
const check = (ok, what) => { console.log(`  ${ok ? 'OK  ' : 'FEL '} ${what}`); if(!ok) fails.push(what); };
const st = () => page.evaluate(() => ({
  pos: S.pos, speaking: S.speaking, recLive: S.recLive,
  tok: document.getElementById('roTok').textContent,
  hyp: document.getElementById('roHyp').textContent.slice(-40),
  tal: document.getElementById('roTts').textContent
}));

await page.evaluate(() => setHold(30000));      // hjälpen kommer när testet vill
await page.locator('#startBtn').click();
await page.waitForFunction(() => S.running, null, { timeout: 20000 });
/* Introt ekar också — vänta ut hela dess leverans innan mätningen börjar. */
await page.waitForTimeout(LEVERANS_MS + 1200);

const words = await page.evaluate(() => S.words.map(w => w.raw));
const start = await st();
console.log('1. igång, introt har ekat färdigt:', JSON.stringify(start));
console.log('   raden:', words.join(' '));
check(start.pos === 0, 'markören står kvar på noll — introt flyttade den inte');

console.log('\n2. hjälpordet: appen säger "' + words[0] + '" och hör sig själv säga det');
const ekonFöre = await page.evaluate(() => window.__sr.ekon.length);
/* setHold ändrar bara värdet — timern som redan löper bär den gamla längden,
   så den måste armeras om för att hjälpen ska komma inom testets fönster. */
await page.evaluate(() => { setHold(400); armHoldoff(); });
await page.waitForFunction(n => window.__sr.ekon.length > n, ekonFöre, { timeout: 15000 })
  .catch(()=>{ console.log('   (hjälpordet kom aldrig)'); });
await page.evaluate(() => setHold(30000));
await page.waitForTimeout(LEVERANS_MS + 900);   // låt ekot levereras
const efterEko = await st();
console.log('   ' + JSON.stringify(efterEko));
console.log('   appen har sagt:', JSON.stringify(await page.evaluate(() => window.__spoke)));
check(efterEko.pos === 0, 'markören flyttades INTE av appens egen röst');

console.log('\n3. och barnet läser — det ska höras');
await page.evaluate(w => window.__sr.hör(w), words.slice(0,2).join(' '));
await page.waitForTimeout(LEVERANS_MS + 900);
const fin = await st();
console.log('   ' + JSON.stringify(fin));
check(fin.pos === 2, 'markören flyttades två ord — appen är inte döv');

verdict(fails.length === 0 && errors.length === 0,
        `${fails.length ? fails.join('; ') : 'alla kontroller gröna'}, ` +
        `pos ${fin.pos}, TOK ${fin.tok}, sidfel ${errors.length}`);
await b.close();
