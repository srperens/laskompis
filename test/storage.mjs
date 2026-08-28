import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await chromium.launch();
const page = await (await b.newContext()).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', d => d.accept());
await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(800);

console.log('--- bygger ett tillstånd värt att förlora ---');
const before = await page.evaluate(() => {
  $('newName').value = 'Alva'; $('addKid').click();
  $('newName').value = 'Bo';   $('addKid').click();
  $('txt').value = 'Min egen läsläxa.\nAndra raden här.'; applyText();
  setRate(1.15); setSize(70); setHold(4500); setStrict('strict');
  S.score = 42; noteHard('fönstret'); noteHard('fönstret'); noteHard('gungan');
  remember(); saveNow();
  $('exportBtn').click();
  return { kopia: $('backup').value, barn: store.profiles.map(p=>p.name),
           aktiv: profile().name, text: profile().text, poäng: profile().score,
           svåra: profile().hard, inst: profile().settings };
});
console.log('  barn:', before.barn.join(', '), '| aktiv:', before.aktiv);
console.log('  kopians storlek:', before.kopia.length, 'tecken');

console.log('\n--- förstör allt ---');
await page.evaluate(() => {
  store.profiles.forEach(p => { p.score = 0; p.hard = {}; p.text = 'x'; });
  store.profiles.length = 1;
  $('txt').value = 'Borta.'; applyText();
  setRate(0.6); setSize(28); setStrict('mild');
  saveNow();
});
console.log('  kvar:', JSON.stringify(await page.evaluate(() => store.profiles.map(p=>p.name))));

console.log('\n--- läser in kopian ---');
const after = await page.evaluate(kopia => {
  $('backup').value = kopia;
  $('importBtn').click();
  return { barn: store.profiles.map(p=>p.name), aktiv: profile().name,
           text: profile().text, poäng: profile().score, svåra: profile().hard,
           inst: profile().settings, live: { rate: S.rate, size: S.size, strict: S.strict } };
}, before.kopia);

const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const rows = [
  ['barn', before.barn, after.barn],
  ['aktiv profil', before.aktiv, after.aktiv],
  ['text', before.text, after.text],
  ['poäng', before.poäng, after.poäng],
  ['svåra ord', before.svåra, after.svåra],
  ['inställningar', before.inst, after.inst],
];
rows.forEach(([n,x,y]) => console.log(`  ${same(x,y)?'OK  ':'FEL '} ${n}: ${JSON.stringify(y)}`));
console.log('  levande inställningar följde med:', JSON.stringify(after.live));

console.log('\n--- sanitize mot fientlig indata ---');
console.log(await page.evaluate(() => {
  const bad = [
    ['null', null], ['sträng', 'nope'], ['tom', {}],
    ['profiles inte array', {profiles:'x'}],
    ['tom lista', {profiles:[]}],
    ['skräp i listan', {profiles:[null, 5, 'x']}],
    ['dubbletter av id', {profiles:[{id:'a',name:'A'},{id:'a',name:'B'}]}],
    ['NaN och Infinity', {profiles:[{id:'a',name:'A',score:NaN,time:Infinity,line:-5}]}],
    ['aktiv finns inte', {profiles:[{id:'a',name:'A'}], active:'zzz'}],
    ['jättetext', {profiles:[{id:'a',name:'A',text:'x'.repeat(99999)}]}],
    ['1000 barn', {profiles:Array.from({length:1000},(_,i)=>({id:'p'+i,name:'N'+i}))}],
    ['HTML i namn', {profiles:[{id:'a',name:'<img src=x onerror=alert(1)>'}]}],
    ['hard med skräp', {profiles:[{id:'a',name:'A',hard:{'':5,'ok':'nej',['x'.repeat(50)]:2,bra:3}}]}],
    ['settings-skräp', {profiles:[{id:'a',name:'A',settings:{size:9999,rate:-5,strict:'evil',vol:'x'}}]}],
  ];
  return bad.map(([label, raw]) => {
    let r, err = null;
    try { r = sanitize(raw); } catch(e){ err = e.name + ': ' + e.message; }
    if (err) return `  KASTADE  ${label}: ${err}`;
    if (!r) return `  avvisad   ${label}`;
    const p = r.profiles[0];
    const ok = r.profiles.length <= 8 && r.profiles.some(x=>x.id===r.active) &&
               new Set(r.profiles.map(x=>x.id)).size === r.profiles.length &&
               p.score >= 0 && p.time >= 0 && p.line >= 0 &&
               p.text.length <= 20000 && p.name.length <= 16 &&
               ['mild','normal','strict'].includes(p.settings.strict) &&
               p.settings.rate >= 0.6 && p.settings.rate <= 1.6 &&
               p.settings.vol >= 0 && p.settings.vol <= 1 &&
               Object.keys(p.hard).every(k => k.length && k.length < 40 && p.hard[k] >= 1);
    return `  ${ok ? 'sund     ' : 'OSUND    '} ${label}: ${r.profiles.length} barn, namn "${p.name.slice(0,24)}"`;
  }).join('\n');
}));
verdict(errors.length === 0 && rows.every(([,x,y]) => same(x,y)),
        `rundtur ${rows.filter(([,x,y])=>same(x,y)).length}/${rows.length} fält, sidfel ${errors.length}`);
await b.close();
