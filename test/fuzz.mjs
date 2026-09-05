import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
import { TYST } from './tyst.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';

const SEED = Number(process.argv[2] || 1);
const STEPS = Number(process.argv[3] || 220);

const b = await chromium.launch({ args:[
  '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
  '--autoplay-policy=no-user-gesture-required']});
const ctx = await b.newContext({ permissions:['microphone'] });
await ctx.addInitScript(TYST);
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type()==='error') errors.push('console: ' + m.text().slice(0,180)); });
page.on('dialog', d => d.accept());          // the import confirm()

await page.addInitScript(() => {
  window.__sr = { instances: [], starts: 0 };
  class FakeSR {
    constructor(){ window.__sr.instances.push(this); }
    start(){ window.__sr.starts++; setTimeout(() => this.onstart && this.onstart(), 3); }
    stop(){ setTimeout(() => this.onend && this.onend(), 3); }
    abort(){ this.stop(); }
  }
  window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
  window.__say = (text, isFinal) => {
    const i = window.__sr.instances[window.__sr.instances.length - 1];
    const r = [{ transcript: text }]; r.isFinal = !!isFinal;
    i && i.onresult && i.onresult({ results: [r], resultIndex: 0 });
  };
});

await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(1200);

// deterministic RNG so a failure is reproducible from its seed
await page.evaluate(seed => {
  let s = seed >>> 0;
  window.__rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}, SEED);

const OPS = [
  `$('startBtn').click()`,
  `$('sayBtn').click()`,
  `$('nextBtn').click()`,
  `$('clockBox').click()`,
  `$('resetRecBtn') && $('resetRecBtn').click()`,
  `$('setupBtn').click()`,
  `$('closeBtn').click()`,
  `document.querySelector('.tab[data-tab="text"]').click()`,
  `document.querySelector('.tab[data-tab="reading"]').click()`,
  `document.querySelector('.tab[data-tab="voice"]').click()`,
  `document.querySelector('.tab[data-tab="kids"]').click()`,
  `{const b=[...document.querySelectorAll('.sbtn')]; b.length && b[Math.floor(__rnd()*b.length)].click();}`,
  `{const r=$('rSize'); r.value=28+Math.floor(__rnd()*58); r.dispatchEvent(new Event('input'));}`,
  `{const r=$('rHold'); r.value=1000+Math.floor(__rnd()*19000); r.dispatchEvent(new Event('input'));}`,
  `{const r=$('rRate'); r.value=(0.6+__rnd()).toFixed(2); r.dispatchEvent(new Event('input'));}`,
  `{const r=$('rVol'); r.value=Math.floor(__rnd()*100); r.dispatchEvent(new Event('input'));}`,
  `{const q=$('strict'); const o=['mild','normal','strict']; q.value=o[Math.floor(__rnd()*3)]; q.dispatchEvent(new Event('change'));}`,
  `{const t=[...document.querySelectorAll('#targets .chip')]; t.length && t[Math.floor(__rnd()*t.length)].click();}`,
  // recognition: the right words, the wrong words, noise, empty
  `__say(S.words.slice(S.pos, S.pos+1).map(w=>w.raw).join(' '), true)`,
  `__say(S.words.slice(S.pos, S.pos+3).map(w=>w.raw).join(' '), false)`,
  `__say('hästen bilen kanske', true)`,
  `__say('', true)`,
  `__say(S.words.map(w=>w.raw).join(' '), true)`,
  // text edits
  `{$('txt').value = 'En ny mening här.\\nOch en till.'; applyText();}`,
  `{$('txt').value = ''; applyText();}`,
  `{$('txt').value = 'Ett'; applyText();}`,
  // profiles
  `{$('newName').value='Test'+Math.floor(__rnd()*99); $('addKid').click();}`,
  `{const k=[...document.querySelectorAll('#kids .kid')]; k.length && k[Math.floor(__rnd()*k.length)].click();}`,
  `$('clearWords').click()`,
  `$('clearScore').click()`,
  `$('exportBtn').click()`,
  `$('importBtn').click()`,
  // lifecycle
  `document.dispatchEvent(new Event('visibilitychange'))`,
  `resetTranscript()`,
  `resetRecognition()`,
  `refreshVoices()`,
];

const CHECKS = `(() => {
  const bad = [];
  const words = (S.lines[S.line]||'').trim().split(/\\s+/).filter(Boolean);
  if (!(S.pos >= 0 && S.pos <= S.words.length)) bad.push('pos ' + S.pos + '/' + S.words.length);
  if (!(S.line >= 0 && S.line < S.lines.length)) bad.push('line ' + S.line + '/' + S.lines.length);
  if (S.words.length !== words.length) bad.push('ord ' + S.words.length + ' != rad ' + words.length);
  if (piper.state === 'ready' && !(piper.session && piper.voice)) bad.push('piper ready utan session/röst');
  if (!(elapsedMs() >= 0)) bad.push('elapsedMs ' + elapsedMs());
  if (!(S.timeMs >= 0)) bad.push('timeMs ' + S.timeMs);
  if (!(S.hypConsumed >= 0)) bad.push('hypConsumed ' + S.hypConsumed);
  if (!store || !store.profiles.length) bad.push('ingen profil');
  else if (!store.profiles.some(p => p.id === store.active)) bad.push('aktiv profil finns inte');
  if (S.lines.length === 0) bad.push('inga rader');
  const spans = document.querySelectorAll('#sentence .w').length;
  if (spans !== S.words.length) bad.push('span ' + spans + ' != ord ' + S.words.length);
  const p = profile();
  if (p && !(p.time >= 0)) bad.push('p.time ' + p.time);
  if (p && !(p.score >= 0)) bad.push('p.score ' + p.score);
  return bad;
})()`;

let failures = 0;
for (let i = 0; i < STEPS; i++) {
  const op = await page.evaluate(ops => ops[Math.floor(window.__rnd() * ops.length)], OPS);
  try {
    await page.evaluate(code => { eval(code); }, op);
  } catch (e) {
    console.log(`STEG ${i} kastade vid: ${op}\n   ${e.message.split('\n')[0]}`);
    failures++;
  }
  if (i % 7 === 0) await page.waitForTimeout(120);
  const bad = await page.evaluate(CHECKS).catch(e => ['CHECKS kraschade: ' + e.message.split('\n')[0]]);
  if (bad.length) {
    console.log(`STEG ${i} bröt invariant efter: ${op}`);
    bad.forEach(x => console.log('   ' + x));
    failures++;
    if (failures > 6) break;
  }
}
const fin = await page.evaluate(() => ({
  körde: S.running, pos: S.pos, rader: S.lines.length, poäng: S.score,
  barn: store.profiles.length, tid: Math.round(elapsedMs()),
  svåra: S.hard.size, srStarts: window.__sr.starts, srInst: window.__sr.instances.length,
  reviewing: S.reviewing
}));
console.log(`\nseed ${SEED}, ${STEPS} steg — ${failures} invariantbrott, ${errors.length} sidfel`);
console.log('  sluttillstånd: ' + JSON.stringify(fin));
[...new Set(errors)].slice(0, 12).forEach(e => console.log('  ' + e));
await b.close();
verdict(failures === 0 && errors.length === 0, `${failures} invariantbrott, ${errors.length} sidfel`);

