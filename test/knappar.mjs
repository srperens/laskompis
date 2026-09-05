/* Knappraden måste alltid synas.

   Utan den går appen inte att starta, pausa eller be om hjälp — den är det
   enda på sidan som inte får hamna utanför skärmen, oavsett hur fönstret ser
   ut. Det gick sönder direkt när läsytan blev en egen kolumn: .stage har 40 px
   padding upp och ner som inte kan krympa hur mycket min-height:0 än säger, så
   på ett lågt fönster sköts knapparna ner bakom mätpanelen.

   Ingen test i sviten tittade på geometri, så det syntes inte förrän det låg
   ute. Det här mäter var knapparna faktiskt hamnar, i WebKit, över ett spann
   av fönsterstorlekar — höga och låga, breda och smala.

   Under 200 px höjd ger appen upp; det är mindre än någon enhet som finns. */
import { webkit } from 'playwright';
import { verdict } from './verdict.mjs';
import { TYST } from './tyst.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:8899';

const HÖJDER  = [1000, 900, 700, 560, 460, 380, 320, 280, 240, 200];
const BREDDER = [1280, 900, 760, 430, 360, 320];
const KNAPPAR = ['#startBtn', '#sayBtn', '#nextBtn'];

const b = await webkit.launch();
const ctx = await b.newContext();
await ctx.addInitScript(TYST);
const errors = [];
const fails = [];

/* Helt innanför fönstret, och helt ovanför mätpanelen. Att nudda kanten
   räcker inte — en knapp som ligger under panelen går inte att trycka på. */
async function mät(w, h){
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${w}x${h}: ${e.message}`));
  await page.setViewportSize({ width:w, height:h });
  await page.goto(BASE + '/index.html', { waitUntil:'load' });
  await page.waitForTimeout(500);
  const r = await page.evaluate(sel => {
    const panel = document.querySelector('.panel').getBoundingClientRect();
    return sel.map(s => {
      const el = document.querySelector(s);
      const b = el.getBoundingClientRect();
      return { s, top:Math.round(b.top), bottom:Math.round(b.bottom),
               left:Math.round(b.left), right:Math.round(b.right),
               synlig: b.width > 0 && b.height > 0 };
    }).concat([{ s:'.panel', top:Math.round(panel.top) }]);
  }, KNAPPAR);
  await page.close();
  const panelTop = r.pop().top;
  const dåliga = r.filter(k => !k.synlig || k.top < 0 || k.bottom > panelTop ||
                               k.left < 0 || k.right > w);
  return { r, panelTop, dåliga };
}

console.log('höjd (bredd 1280) — knapparna ska ligga helt ovanför panelen:');
for (const h of HÖJDER){
  const { r, panelTop, dåliga } = await mät(1280, h);
  const rad = `h=${String(h).padStart(4)}  start ${String(r[0].top).padStart(4)}..${String(r[0].bottom).padStart(4)}  panel@${String(panelTop).padStart(4)}`;
  if (dåliga.length){ console.log(`  FEL  ${rad}  -> ${dåliga.map(d=>d.s).join(', ')}`); fails.push(`h${h}`); }
  else console.log(`  OK   ${rad}`);
}

console.log('\nbredd (höjd 640) — och inget får hamna utanför sidled:');
for (const w of BREDDER){
  const { r, panelTop, dåliga } = await mät(w, 640);
  const rad = `b=${String(w).padStart(4)}  start ${String(r[0].left).padStart(4)}..${String(r[0].right).padStart(4)}  panel@${panelTop}`;
  if (dåliga.length){ console.log(`  FEL  ${rad}  -> ${dåliga.map(d=>d.s).join(', ')}`); fails.push(`b${w}`); }
  else console.log(`  OK   ${rad}`);
}

/* Ett lågt landskapsläge på telefon är det verkliga fallet bakom det här. */
console.log('\ntelefon i liggande läge:');
for (const [w,h] of [[844,390],[740,360],[667,375],[568,320]]){
  const { panelTop, dåliga } = await mät(w, h);
  if (dåliga.length){ console.log(`  FEL  ${w}x${h} -> ${dåliga.map(d=>d.s).join(', ')}`); fails.push(`${w}x${h}`); }
  else console.log(`  OK   ${w}x${h}  panel@${panelTop}`);
}

verdict(fails.length === 0 && errors.length === 0,
        `${fails.length ? 'knappar utanför vid ' + fails.join(', ') : 'knapparna synliga i alla ' + (HÖJDER.length+BREDDER.length+4) + ' storlekarna'}, sidfel ${errors.length}`);
await b.close();
