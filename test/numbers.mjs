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
];

let FAILURES = 0, TOTAL = 0;
for (const strict of ['mild','normal','strict']) {
  const out = await page.evaluate(({cases, strict}) => {
    S.strict = strict;
    return cases.map(([ref, hyp, want]) => {
      const got = matches(norm(hyp), norm(ref));
      return { ref, hyp, want, got, ok: got === want };
    });
  }, { cases, strict });
  const bad = out.filter(r => !r.ok);
  TOTAL += out.length; FAILURES += bad.length;
  console.log(`stränghet ${strict}: ${out.length - bad.length}/${out.length} rätt`);
  bad.forEach(r => console.log(`   FEL  text "${r.ref}" hörde "${r.hyp}" -> ${r.got}, ville ${r.want}`));
}
await b.close();
verdict(FAILURES === 0, `${TOTAL - FAILURES}/${TOTAL} fall rätt`);

