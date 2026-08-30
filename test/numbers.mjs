import { chromium } from 'playwright';
import { verdict } from './verdict.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';
const b = await chromium.launch();
const page = await (await b.newContext()).newPage();
page.on('pageerror', e => console.log('[pageerror] ' + e.message));
await page.goto(BASE + '/index.html', { waitUntil:'load' });
await page.waitForTimeout(800);

const cases = [
  // [text i boken, vad igenkännaren hör, ska matcha?]
  ['tjugo','20',true], ['20','tjugo',true],
  ['ett','1',true], ['1','en',true],
  ['tre','3',true], ['nitton','19',true],
  ['tjugoett','21',true], ['tjugoen','21',true],
  ['trettiofem','35',true], ['fyrtio','40',true], ['förtio','40',true],
  ['hundra','100',true], ['etthundra','100',true],
  ['hundrafemtio','150',true], ['tvåhundra','200',true],
  ['tvåhundratjugoett','221',true], ['tusen','1000',true],
  ['noll','0',true], ['arton','18',true], ['aderton','18',true],
  // ska INTE matcha
  ['tjugo','30',false], ['20','30',false], ['ett','2',false],
  ['hundra','1000',false], ['trettiofem','53',false],
  ['katten','20',false], ['20','katten',false],
  // ordjämförelser ska vara oförändrade
  ['en','ett',false], ['ett','en',false],
  // siffror får aldrig matcha luddigt, inte ens på mild
  ['20','30',false], ['5','6',false], ['1','7',false], ['100','200',false],
  ['12','13',false], ['tjugo','trettio',false], ['tjugo','tjugoett',false],
  ['katten','katten',true], ['katten','hästen',false],

  // bokstavsnamn: igenkännaren skriver bokstaven när barnet läser ordet
  ['de','d',true], ['d','de',true],
  ['se','c',true], ['c','se',true],
  ['är','r',true], ['te','t',true], ['ge','g',true], ['be','b',true],
  ['ve','v',true], ['en','n',true], ['el','l',true], ['es','s',true],
  ['ef','f',true], ['em','m',true], ['ku','q',true], ['eks','x',true],
  // men inte fel bokstav, och inte bokstav mot annat ord
  ['de','c',false], ['se','d',false], ['är','s',false],
  ['de','b',false], ['katten','k',false], ['k','katten',false],
  ['de','de',true], ['d','d',true],

  // homofoner: samma ljud, olika stavning
  ['hann','han',true], ['han','hann',true],
  ['fann','fan',true], ['vann','van',true], ['vet','vett',true],
  // men aldrig ord som bara liknar
  ['vann','vann',true], ['van','hann',false],

  // och/att/å reduceras alla till samma ljud
  ['och','å',true], ['att','å',true], ['och','att',true], ['ock','och',true],
  ['och','o',false],

  // jag/ja, vad/va, med/me
  ['jag','ja',true], ['vad','va',true], ['med','me',true],
  ['jag','vad',false],

  // grupper som delar ett ord men INTE ska slås ihop
  ['det','de',true], ['de','dom',true], ['dem','dom',true],
  ['det','dom',false],
  // de och dem sägs båda "dom" — de hör ihop, det gör inte det
  ['de','dem',true], ['dem','de',true],

  // talade former av skrivna ord
  ['det','de',true], ['de','dom',true], ['dem','dom',true],
  ['mig','mej',true], ['dig','dej',true], ['sig','sej',true],
  ['något','nåt',true], ['någon','nån',true], ['sådan','sån',true],
  ['säga','säja',true], ['sade','sa',true], ['mycket','mycke',true],
  ['är','e',true],
  // och inte det som bara liknar
  ['det','dom',false], ['mig','dej',false], ['något','nån',false],

  // igenkännarens egna utbyten
  ['säg','sig',true], ['sig','säg',true],
  ['säg','säg',true],
];

/* Fall där mild avsiktligt är tillåtande: dess budget är ett tecken även för
   korta ord, och "släpper igenom nästan allt" är hela poängen med läget. Dessa
   krävs bara av normal och sträng. */
const STRIKTA = [
  ['sin','sen',false], ['ser','får',false],
  /* Mild har en teckens budget även för korta ord, så där matchar han mot hon.
     Det är vad "släpper igenom nästan allt" betyder, och det prövas därför bara
     på de strängare nivåerna. */
  ['ja','va',false], ['dem','det',false],
  ['hann','hon',false], ['han','hon',false], ['hon','han',false],
  ['han','hon',false], ['hon','han',false], ['d','c',false],
];

let FAILURES = 0, TOTAL = 0;
for (const strict of ['mild','normal','strict']) {
  const list = strict === 'mild' ? cases : cases.concat(STRIKTA);
  const out = await page.evaluate(({cases, strict}) => {
    S.strict = strict;
    return cases.map(([ref, hyp, want]) => {
      const got = matches(norm(hyp), norm(ref));
      return { ref, hyp, want, got, ok: got === want };
    });
  }, { cases: list, strict });
  const bad = out.filter(r => !r.ok);
  TOTAL += out.length; FAILURES += bad.length;
  console.log(`stränghet ${strict}: ${out.length - bad.length}/${out.length} rätt`);
  bad.forEach(r => console.log(`   FEL  text "${r.ref}" hörde "${r.hyp}" -> ${r.got}, ville ${r.want}`));
}
await b.close();
verdict(FAILURES === 0, `${TOTAL - FAILURES}/${TOTAL} fall rätt`);

