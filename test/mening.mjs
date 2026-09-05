/* Meningsbytet. Det är där appen slutade lyssna, och där förra meningens ord
   låg kvar i panelen som om barnet just sagt dem.

   Ankaret appen håller är ett index in i igenkännarens egen kumulativa lista.
   Att flytta fram indexet vid ett radbyte är inte samma sak som att tömma
   listan — bara igenkännaren kan tömma den. På iOS är sessionen enkelskotts
   och startas om hela tiden ändå, så där avslutas den vid radbytet och nästa
   mening möts av ett tomt transkript.

   Fällan som gjorde att det inte hände: berömmet talas när meningen tar slut,
   och nästa mening laddas medan repliken fortfarande spelas. Snittet hoppades
   då över helt i stället för att göras när repliken var klar. */
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
  window.__sr = { instances: [], starts: 0 };
  class FakeSR {
    constructor(){ window.__sr.instances.push(this); this.live=false; this.rows=[];
                   this.continuous=false; this.interimResults=false; }
    start(){ window.__sr.starts++; this.live=true; this.rows=[];
             setTimeout(()=>this.onstart&&this.onstart(),5); }
    stop(){ this.live=false; setTimeout(()=>this.onend&&this.onend(),5); }
    abort(){ this.stop(); }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
  window.__sr.säg = text => {
    const i = window.__sr.instances[window.__sr.instances.length-1];
    if(!i || !i.live || !i.onresult) return false;
    const r = [{ transcript:text }]; r.isFinal = true;
    i.rows.push(r);
    i.onresult({ results:i.rows.slice(), resultIndex:i.rows.length-1 });
    if(!i.continuous){ i.live=false; setTimeout(()=>i.onend&&i.onend(),5); }
    return true;
  };
  /* Berömmet håller på ett tag — nästa mening laddas mitt under det, och det
     var där snittet tappades. Och högtalaren går in i mikrofonen: det appen
     säger fångas av sessionen som hunnit starta om, vilket är hur förra
     meningens transkript kunde bära appens egen röst in i den nya meningen. */
  window.__spoke = [];
  speechSynthesis.speak = u => {
    window.__spoke.push(u.text);
    setTimeout(()=>u.onstart&&u.onstart(), 10);
    setTimeout(()=>{ window.__sr.säg(u.text); }, 700);   // ekot mitt i repliken
    setTimeout(()=>u.onend&&u.onend(), 1500);
  };
});

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(1200);

const fails = [];
const check = (ok,what)=>{ console.log(`  ${ok?'OK  ':'FEL '} ${what}`); if(!ok) fails.push(what); };
const st = () => page.evaluate(() => ({
  rad: S.line, pos: S.pos, ord: S.words.map(w=>w.raw),
  hyp: document.getElementById('roHyp').textContent,
  tok: document.getElementById('roTok').textContent,
  live: S.recLive, speaking: S.speaking, cutWanted: S.cutWanted
}));
const säg = t => page.evaluate(t => window.__sr.säg(t), t);
const redo = () => page.waitForFunction(
  () => S.running && !S.speaking && S.recLive && performance.now() >= S.ignoreUntil,
  null, { timeout: 20000 }).then(()=>page.waitForTimeout(250));

/* Två meningar, den andra utan gemensamma ord med den första — så att ett ord
   som flyttar markören i mening två omöjligt kan komma från mening ett. */
await page.evaluate(() => {
  setHold(30000);
  $('txt').value = 'Katten sover.\nHunden springer fort.';
  applyText();
});
await page.locator('#startBtn').click();
await page.waitForFunction(() => S.running, null, { timeout:20000 });
await redo();

const ett = await st();
console.log('1. mening ett:', ett.ord.join(' '));
check(ett.rad === 0 && ett.pos === 0, 'står på första ordet i första meningen');

console.log('\n2. barnet läser klart mening ett');
await säg(ett.ord.join(' '));
await page.waitForFunction(() => S.line === 1, null, { timeout:20000 })
  .catch(()=>console.log('   (bytte aldrig mening)'));
const bytt = await st();
console.log('   ' + JSON.stringify({ rad:bytt.rad, ord:bytt.ord.join(' '), hyp:bytt.hyp, tok:bytt.tok }));
check(bytt.rad === 1, 'appen gick vidare till mening två');
check(bytt.pos === 0, 'markören står på första ordet i den nya meningen');

console.log('\n3. panelen får inte visa mening ett kvar');
await redo();
const efter = await st();
console.log('   ' + JSON.stringify({ hyp:efter.hyp, tok:efter.tok, live:efter.live, cutWanted:efter.cutWanted }));
check(!/katten|sover/i.test(efter.hyp), 'HYP visar inte förra meningens ord');
check(!/bra|läst/i.test(efter.hyp), 'HYP visar inte appens eget beröm');
check(!efter.cutWanted, 'snittet blev gjort, inte bortglömt under berömmet');
check(efter.live, 'lyssningen är igång i den nya meningen');

console.log('\n4. och barnet blir hört i den nya meningen');
const lev = await säg(efter.ord.slice(0,2).join(' '));
await page.waitForTimeout(700);
const fin = await st();
console.log('   sa "' + efter.ord.slice(0,2).join(' ') + '" (levererat ' + lev + '):', JSON.stringify({ pos:fin.pos, hyp:fin.hyp }));
check(fin.pos === 2, 'markören flyttades två ord i mening två');

verdict(fails.length === 0 && errors.length === 0,
        `${fails.length ? fails.join('; ') : 'alla kontroller gröna'}, rad ${fin.rad}, pos ${fin.pos}, sidfel ${errors.length}`);
await b.close();
