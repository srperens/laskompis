/* Att lämna appen och komma tillbaka.

   Först fungerar lyssningen bra; efter en tur till en annan app gör den
   ingenting alls. Så beter sig WebKits igenkännare efter att sidan varit i
   bakgrunden: start() varken kastar fel eller startar. Inget event kommer,
   ingen kod märker något, och appen ser fullt levande ut.

   Tillsynen finns för just det, men den bygger om som sista utväg och högst
   en gång i minuten — en spärr som är riktig mitt i ett pass och helt fel
   direkt efter en återkomst, där det finns goda skäl att tro att igenkännaren
   är trasig. En minuts tystnad med ett barn som läser är samma sak som att
   det inte fungerar.

   Attrappen låter den första sessionen efter återkomsten vara död på det
   tysta sättet, och kräver att appen tar sig tillbaka inom rimlig tid. */
import { webkit, devices } from 'playwright';
import { verdict } from './verdict.mjs';
import { TYST } from './tyst.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';

const TILLBAKA_INOM = 20000;

const b = await webkit.launch();
const page = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
await page.addInitScript(TYST);
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.addInitScript(() => {
  window.__sr = { instances: [], starts: 0 };
  class FakeSR {
    constructor(){ window.__sr.instances.push(this); this.live=false; this.rows=[];
                   this.död=false; this.continuous=false; this.interimResults=true; }
    start(){
      /* Det tysta dödssättet: inget kastas, ingenting händer. Och det gäller
         instansen för alltid — iOS har dödat just den. Att nudga den igen
         hjälper aldrig; bara en ny igenkännare gör det. Att låta attrappen
         friskna till vore att testa en värld där felet inte finns. */
      if(this.död) return;
      window.__sr.starts++; this.live=true; this.rows=[];
      setTimeout(()=>this.onstart&&this.onstart(),5);
    }
    stop(){ this.live=false; setTimeout(()=>this.onend&&this.onend(),5); }
    abort(){ this.stop(); }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
  window.__sr.säg = (t, f) => {
    const i = window.__sr.instances[window.__sr.instances.length-1];
    if(!i || !i.live || !i.onresult) return false;
    const r = [{ transcript:t }]; r.isFinal = !!f;
    const res = i.rows.concat([r]); if(f) i.rows.push(r);
    i.onresult({ results:res, resultIndex:res.length-1 });
    if(f && !i.continuous){ i.live=false; setTimeout(()=>i.onend&&i.onend(),5); }
    return true;
  };
  window.__spoke = [];
  speechSynthesis.speak = u => { window.__spoke.push(u.text);
    setTimeout(()=>u.onstart&&u.onstart(),10); setTimeout(()=>u.onend&&u.onend(),200); };
});

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(900);

const fails = [];
const check = (ok,what)=>{ console.log(`  ${ok?'OK  ':'FEL '} ${what}`); if(!ok) fails.push(what); };
const st = () => page.evaluate(() => ({
  pos:S.pos, kör:S.running, live:S.recLive, starts:window.__sr.starts,
  nudges:S.recNudges, rebuilds:S.recRebuilds
}));
const redo = () => page.waitForFunction(
  () => S.running && !S.speaking && S.recLive && performance.now() >= S.ignoreUntil,
  null, { timeout: 25000 }).then(()=>page.waitForTimeout(250));

await page.evaluate(() => setHold(30000));
await page.locator('#startBtn').click();
await page.waitForFunction(()=>S.running, null, {timeout:20000});
await redo();

const words = await page.evaluate(() => S.words.map(w=>w.raw));
console.log('1. första passet fungerar');
await page.evaluate(w => window.__sr.säg(w, true), words.slice(0,2).join(' '));
await page.waitForTimeout(500);
const första = await st();
console.log('   ' + JSON.stringify(första));
check(första.pos === 2, 'markören flyttades två ord innan appen lämnas');

console.log('\n2. användaren går till en annan app och kommer tillbaka');
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable:true, get:()=>true });
  Object.defineProperty(document, 'visibilityState', { configurable:true, get:()=>'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
});
await page.waitForTimeout(600);
const borta = await st();
console.log('   borta: ' + JSON.stringify(borta));
check(!borta.kör, 'passet pausades när appen lämnades');

/* Igenkännaren är trasig efter bakgrunden: nästa start() gör ingenting alls. */
await page.evaluate(() => {
  window.__sr.instances.forEach(i => { i.död = true; i.live = false; });
  Object.defineProperty(document, 'hidden', { configurable:true, get:()=>false });
  Object.defineProperty(document, 'visibilityState', { configurable:true, get:()=>'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
});
await page.waitForTimeout(400);

console.log('\n3. barnet trycker på play igen');
const startsFöre = await page.evaluate(()=>window.__sr.starts);
const t0 = Date.now();
await page.locator('#startBtn').click();
await page.waitForFunction(()=>S.running, null, {timeout:20000});

/* Den gamla instansen är död för gott, så det enda som duger är en ny. Att
   släppa den vid pausen och bygga om vid start är vad som gör det — och det
   får inte gå tillsynens väg, för den bygger om som sista utväg och högst en
   gång i minuten. En minut utan lyssning med ett barn som läser är samma sak
   som att det inte fungerar. */
let tillbaka = true;
await page.waitForFunction(n => window.__sr.starts > n, startsFöre, { timeout: TILLBAKA_INOM })
  .then(()=>console.log(`   ny session efter ${((Date.now()-t0)/1000).toFixed(1)} s`))
  .catch(()=>{ tillbaka = false; console.log('   INGEN NY SESSION'); });
/* Introt talas vid varje start, och halv-duplexen håller grinden stängd
   medan det pågår. Mät efter det — annars mäter testet introt. */
await redo().catch(()=>{});
const efter = await st();
console.log('   ' + JSON.stringify(efter));
check(tillbaka, `lyssningen kom tillbaka inom ${TILLBAKA_INOM/1000} s`);
check(efter.live, 'en levande session efter återkomsten');
check(efter.rebuilds === 0 && efter.nudges === 0,
      'och den kom via en ny igenkännare vid start, inte via tillsynens sista utväg');
console.log('   igenkännare byggda totalt: ' + await page.evaluate(()=>window.__sr.instances.length));

console.log('\n4. halv-duplexgrinden får inte ha fastnat i bakgrunden');
check(!(await page.evaluate(()=>S.speaking)),
      'S.speaking är släppt — en fastnad grind är total dövhet');

console.log('\n5. och barnet blir hört igen');
await redo().catch(()=>{});
await page.evaluate(w => window.__sr.säg(w, true), words.slice(0,3).join(' '));
await page.waitForTimeout(600);
const fin = await st();
console.log('   ' + JSON.stringify(fin));
check(fin.pos === 3, 'markören flyttades efter återkomsten');

verdict(fails.length === 0 && errors.length === 0,
        `${fails.length ? fails.join('; ') : 'alla kontroller gröna'}, ` +
        `nudgar ${fin.nudges}, ombyggen ${fin.rebuilds}, pos ${fin.pos}, sidfel ${errors.length}`);
await b.close();
