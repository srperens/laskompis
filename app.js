'use strict';

/* ================= texts ================= */
const PRESETS = {

  'Första orden': [
    'Jag ser en katt.',
    'Vi går hem nu.',
    'Han har en boll.',
    'Hon är glad i dag.',
    'Det är kallt ute.',
    'Mamma kommer snart.',
    'Kan du se mig?',
    'Nu ska vi äta.',
    'Boken är röd.',
    'Var är min mössa?',
    'Vi sitter på golvet.',
    'Det står en bil där.'
  ],

  'Korta meningar': [
    'Hunden springer efter bollen i gräset.',
    'Vi bakar bullar med mormor i dag.',
    'Solen skiner och snön smälter bort.',
    'Pappa letar efter sina nycklar igen.',
    'Katten sover på stolen vid fönstret.',
    'Jag hittade en fin sten på stranden.',
    'Bussen kommer om tio minuter.',
    'Vi bygger en koja bakom huset.',
    'Isen på sjön är tjock och blank.',
    'Min cykel har fått ett nytt däck.',
    'Det brinner en brasa i kaminen.',
    'Han glömde sin väska i hallen.'
  ],

  'Meningar': [
    'Katten satt på mattan och tittade ut genom fönstret.',
    'Det regnade hela dagen så vi stannade inne och byggde en koja.',
    'På vintern är sjön täckt av is och vi kan åka skridskor.',
    'Han hittade en gammal nyckel under trappan och undrade vad den gick till.',
    'När vi kom fram till stugan hade det redan börjat mörkna.',
    'Fåglarna satt tysta i trädet och väntade på att regnet skulle sluta.',
    'Vi packade ryggsäcken med smörgåsar och gick ut i skogen.',
    'Det luktade nybakat bröd hela vägen ut i hallen.',
    'Snön låg så djup på vägen att bilen inte kom fram.',
    'Han räknade stjärnorna tills han somnade.',
    'Vinden tog tag i seglet och båten lutade åt sidan.',
    'Under bron bodde det en familj med fyra ankungar.'
  ],

  'Rymden': [
    'Månen lyser för att solen skiner på den.',
    'Jorden snurrar ett varv runt sin egen axel varje dygn.',
    'Det tar åtta minuter för ljuset att nå oss från solen.',
    'Stjärnorna vi ser på natten är andra solar långt borta.',
    'Mars ser röd ut för att marken där innehåller rost.',
    'En komet har en lång svans av is och damm.',
    'Saturnus ringar består av miljontals små isbitar.',
    'Norrsken uppstår när partiklar från solen träffar luften högt uppe.',
    'Det finns fler stjärnor i himlen än sandkorn på en strand.',
    'Ljuset från vissa stjärnor har rest i tusentals år innan det når oss.'
  ],

  'Djur och natur': [
    'Igelkotten rullar ihop sig när den blir rädd.',
    'Ekorren gömmer nötter inför vintern och glömmer var de ligger.',
    'Grodorna lägger sina ägg i vattnet på våren.',
    'En älg kan vara lika hög som en dörr.',
    'Myror bär saker som väger mer än de själva gör.',
    'Ugglan flyger nästan helt ljudlöst genom skogen.',
    'Bävern fäller träd med bara tänderna.',
    'Fladdermössen hittar vägen i mörkret med hjälp av ljud.',
    'Om hösten flyger tranorna söderut i stora flockar.',
    'Barrträd behåller sina barr hela vintern.'
  ],

  'Kluriga ljud': [
    'Skjortan hängde på kroken i hallen.',
    'Kjolen var gul med vita prickar.',
    'Stjärnan lyste starkast längst upp i norr.',
    'Ljuset från lampan var alldeles för skarpt.',
    'Hjulet på kärran gnisslade uppför backen.',
    'Djuret gömde sig bakom en stor sten.',
    'Sjön låg blank och stilla i morgonljuset.',
    'Tjugo tjocka tallar växte längs stigen.',
    'Kängorna stod kvar utanför dörren.',
    'Hjärtat slog fort när han sprang.'
  ],

  'Berättelse: Nyckeln': [
    'Elsa hittade en liten nyckel i lådan under trappan.',
    'Nyckeln var av mässing och kändes kall i handen.',
    'Hon gick runt i huset och provade alla lås hon kunde hitta.',
    'Ingen dörr ville öppna sig.',
    'Till slut visade farmor henne en gammal klocka uppe på vinden.',
    'Nyckeln passade precis i hålet på baksidan.',
    'Elsa vred om, och klockan började ticka igen efter många år.'
  ],

  'Berättelse: Första snön': [
    'På morgonen var hela gården vit.',
    'Snön hade kommit under natten utan att någon hört något.',
    'Simon drog på sig stövlarna och sprang ut innan frukost.',
    'Han gjorde de första fotspåren över gräsmattan.',
    'Sedan lade han sig på rygg och viftade med armarna.',
    'När han reste sig fanns det en ängel kvar i snön.',
    'Inifrån köket knackade mamma på rutan och vinkade åt honom.'
  ],

  'Längre text': [
    'Tidigt på morgonen gick Elsa ner till bryggan för att titta på fåglarna.',
    'Vattnet var alldeles stilla och det gick att se ända ner till botten.',
    'En gädda simmade förbi och försvann in bland vassen innan hon hann ropa.',
    'När hon kom hem berättade hon om allt hon hade sett, och ingen trodde henne riktigt.',
    'Nästa morgon gick hela familjen med ner till bryggan för att se efter.',
    'De satt tysta i nästan en timme utan att det hände någonting alls.',
    'Precis när de skulle gå hem bröt något stort igenom ytan och försvann igen.'
  ]
};

/* ================= state ================= */
/* Where state lives, so the split is a rule rather than a habit:
     S            — the reading session and everything a profile saves
     const piper  — the optional neural voice's subsystem, its own object
     loose let    — a handle on something outside the app: an audio node, a
                    recognizer, a timer id, the browser's voice list
   Anything that is session state belongs in S even when it is convenient not
   to; wasLoud and voiceTries are the two that still sit outside, and both are
   scratch space for a single loop rather than anything the app reasons about. */
const S = {
  lines: PRESETS['Meningar'].slice(),
  source: null,     // the text as loaded — hard-word review replaces `lines`, this restores them
  line: 0,
  words: [],        // {raw, norm, state}
  pos: 0,
  score: 0,
  misses: 0,
  running: false,
  holdoff: 8000,
  strict: 'normal',
  hard: new Map(),
  reviewing: false,
  /* A deadline, not a latch. While it runs, everything the recognizer delivers
     is consumed on arrival instead of aligned — a mute, not a teardown. It
     expires on its own, so a dropped event can never leave the app deaf. */
  ignoreUntil: 0,
  recLive: false,
  recSeenAt: 0,     // last sign of life from the recognizer
  recStarts: 0,     // sessions begun, nudges, and full rebuilds — shown as IGENK
  recNudges: 0,
  recRebuilds: 0,
  saidDeaf: false,  // the home-screen-app warning is said once, not every press
  /* Off on iPhone, where capturing costs the loudspeaker; on elsewhere, where it
     costs nothing and shows the child that the app is hearing them. */
  meter: true,
  posSince: 0,
  hypConsumed: 0,
  hypLen: 0,        // tokens seen so far in this session — what a mute consumes up to
  echo: [],         // what the app has said and not yet heard come back
  lastRescue: 0,
  sndOk: false,
  sndFail: false,
  vol: 0.85,
  lastMiscueKey: '',
  lastMiscueAt: 0,
  speakTimer: null,
  speakSeq: 0,
  size: 52,
  rate: 0.8,
  voice: null,
  voiceName: null,  // the voice the adult picked, by name — the object itself
                    // may be missing on another device, the preference isn't
  voiceURI: null,   // and by URI, which is what tells two voices sharing a name
                    // apart: Alva (Premium) from Alva (Kompakt)
  lats: [],
  onsetAt: null,    // timestamp of voice onset
  holdTimer: null,
  finishTimer: null,
  starting: false,
  speaking: false,

  /* Reading time is accumulated from timestamps rather than counted up by the
     interval, so a throttled or backgrounded tab can't lose or gain seconds.
     timeMs is what has been banked while paused; runSince marks the start of
     the stretch currently running. */
  timeMs: 0,
  runSince: null,
  clockTimer: null,
  target: 0,          // 0 = no limit; otherwise ms the child is asked to read
  targetDone: false   // the limit was reached — the next start begins a new stretch
};

/* ================= audio ================= */
/* Generated with WebAudio, no files. Short and understated: the sound should
   confirm, not judge. The failure sound is therefore a soft descending tone
   and off by default — the recognizer mishears sometimes, and a negative
   signal is then unfair to a child who actually read correctly. */
let sfxCtx = null, sfxOut = null;

function sfx(){
  if(!S.vol) return null;
  if(!sfxCtx){
    try{ sfxCtx = new (window.AudioContext||window.webkitAudioContext)(); }
    catch(e){ return null; }
    // Compressor last in the chain: the tones sum and would otherwise clip
    // when the volume is turned up.
    const comp = sfxCtx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.12;
    sfxOut = sfxCtx.createGain();
    sfxOut.gain.value = 1;
    sfxOut.connect(comp);
    comp.connect(sfxCtx.destination);
  }
  if(sfxCtx.state==='suspended') sfxCtx.resume().catch(()=>{});
  return sfxCtx;
}

/* Short attack, short plateau, soft decay. The plateau makes the sound feel
   as loud as speech — a pure blip sounds weaker than it measures. */
function tone(freq, startAt, dur, peak, type='sine'){
  const ctx = sfx(); if(!ctx) return;
  const t = ctx.currentTime + startAt;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  const v = Math.max(0.0001, peak * S.vol);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + 0.010);
  g.gain.setValueAtTime(v, t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(sfxOut);
  osc.start(t); osc.stop(t + dur + 0.03);
}

/* The same happy chime every time — recognizable and reliable: hearing it
   should feel like a small celebration of reading a word correctly. */
function playOk(){
  if(!S.sndOk) return;
  tone(1046.5, 0, 0.22, 0.55);
  tone(1568, 0.05, 0.18, 0.30);
}

function playFail(){
  if(!S.sndFail) return;
  tone(330, 0, 0.22, 0.38, 'triangle');
  tone(262, 0.09, 0.26, 0.32, 'triangle');
}

function playDone(){
  if(!S.sndOk) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f,i)=> tone(f, i*0.11, 0.40, 0.45));
}

const $ = id => document.getElementById(id);

/* ================= icons ================= */
/* The interface must be usable by someone who cannot read yet:
   play, listen, next. Text remains as aria-labels and tooltips. */
const svg = (inner,fill) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${fill?'currentColor':'none'}">${inner}</svg>`;

const ICON = {
  play:  svg('<path d="M8 5.2v13.6L18.8 12z"/>', true),
  pause: svg('<path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z"/>', true),
  ear:   svg('<path d="M4 9.5v5h3.6L12.4 19V5L7.6 9.5z" fill="currentColor"/>'+
             '<path d="M15.6 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'+
             '<path d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'),
  next:  svg('<path d="M4.5 12h13M12.6 6.6 18 12l-5.4 5.4" stroke="currentColor" stroke-width="2.3" '+
             'stroke-linecap="round" stroke-linejoin="round"/>'),
  star:  svg('<path d="M12 3.3l2.7 5.5 6 .9-4.35 4.25 1.03 6L12 17.1l-5.38 2.85 1.03-6L3.3 9.7l6-.9z"/>', true)
};

function setIcons(){
  $('startBtn').innerHTML = S.running ? ICON.pause : ICON.play;
  $('sayBtn').innerHTML   = ICON.ear;
  $('nextBtn').innerHTML  = ICON.next;
  $('startBtn').setAttribute('aria-label', S.running ? 'Pausa' : 'Börja läsa');
  $('startBtn').setAttribute('title', S.running ? 'Pausa — mellanslag' : 'Börja läsa — mellanslag');
  if(!$('scoreBox').querySelector('svg')){
    $('scoreBox').insertAdjacentHTML('afterbegin', ICON.star);
  }
}

/* ================= normalization ================= */
/* Everything that is not a letter or a digit goes. The old list of punctuation
   marks was a list to forget something from — asterisks and slashes were not on
   it, so a row of them survived as a "word" no child could ever say. Letters
   means letters in any alphabet, so å, ä, ö and anything accented are kept, and
   an emoji dropped into a text normalises to nothing and is passed over like the
   punctuation it stands in for. */
function norm(w){
  return w.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}
function tokens(str){
  return str.split(/\s+/).map(norm).filter(Boolean);
}

/* similarity: normalized Levenshtein */
function lev(a,b){
  if(a===b) return 0;
  const m=a.length,n=b.length;
  if(!m) return n; if(!n) return m;
  let prev=new Array(n+1), cur=new Array(n+1);
  for(let j=0;j<=n;j++) prev[j]=j;
  for(let i=1;i<=m;i++){
    cur[0]=i;
    for(let j=1;j<=n;j++){
      cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
    }
    [prev,cur]=[cur,prev];
  }
  return prev[n];
}
function sim(a,b){
  if(!a||!b) return 0;
  const d=lev(a,b), L=Math.max(a.length,b.length);
  return 1 - d/L;
}

/* The recognizer writes spoken numbers as digits: a child reading "tjugo" comes
   back as "20", and a text that spells its numbers out never matched a word of
   it. Both spellings are therefore compared by value — see matches().

   Nought to nine hundred and ninety-nine, plus a round thousand, which is past
   anything a reading exercise holds. Swedish writes the compounds as one word,
   so tjugoett and trettiofem are entries of their own; the hundreds carry a
   remainder and are parsed instead of listed. */
const NUM_ONES  = ['noll','ett','två','tre','fyra','fem','sex','sju','åtta','nio'];
const NUM_TEENS = ['tio','elva','tolv','tretton','fjorton','femton','sexton',
                   'sjutton','arton','nitton'];
const NUM_TENS  = { tjugo:20, trettio:30, fyrtio:40, förtio:40, femtio:50,
                    sextio:60, sjuttio:70, åttio:80, nittio:90 };

const NUM_WORDS = (()=>{
  const m = {};
  NUM_ONES.forEach((w,i)=>{ m[w] = i; });
  NUM_TEENS.forEach((w,i)=>{ m[w] = 10 + i; });
  m['en'] = 1;            // the other spelling of one, article or not
  m['aderton'] = 18;      // the older spelling of eighteen
  Object.keys(NUM_TENS).forEach(t =>{
    m[t] = NUM_TENS[t];
    for(let u = 1; u <= 9; u++) m[t + NUM_ONES[u]] = NUM_TENS[t] + u;
    m[t + 'en'] = NUM_TENS[t] + 1;
  });
  m['hundra'] = 100; m['etthundra'] = 100;
  m['tusen'] = 1000;  m['ettusen'] = 1000; m['etttusen'] = 1000;
  for(let h = 2; h <= 9; h++) m[NUM_ONES[h] + 'hundra'] = h * 100;
  return m;
})();

const isDigits = t => /^[0-9]+$/.test(t);

/* Swedish letter names are ordinary words. C is said "se", D is "de", R is "är",
   T is "te" — and a recognizer that hears a child read one of those short words
   writes the letter instead: "de" comes back as "d", "se" as "c". The word then
   never matched, and worse, it was close enough to be logged as a misreading, so
   the child was marked down for reading correctly. Two of the commonest words in
   Swedish, de and är, sit in this set.

   Only a bare letter against exactly that letter's name is made equivalent, so
   nothing else in the comparison loosens. */
const LETTER_NAME = {
  a:'a', b:'be', c:'se', d:'de', e:'e', f:'ef', g:'ge', h:'hå', i:'i',
  j:'ji', k:'kå', l:'el', m:'em', n:'en', o:'o', p:'pe', q:'ku', r:'är',
  s:'es', t:'te', u:'u', v:'ve', w:'dubbelve', x:'eks', y:'y', z:'säta',
  'å':'å', 'ä':'ä', 'ö':'ö'
};
const sameLetter = (a, b) =>
  (a.length === 1 && LETTER_NAME[a] === b) ||
  (b.length === 1 && LETTER_NAME[b] === a);

/* Words that cannot be told apart from the one actually read. Three causes, one
   consequence:

     "hann" and "han" are the same sound. So are "vann" and "van", "fann" and
     "fan". The difference is one of spelling, and nothing in the audio carries
     it — no recogniser can hear which was meant, and neither can a person.

     Swedish says a good many words differently from how it writes them. A child
     reading "det" says "de", "jag" comes out "ja", "och" and "att" both reduce
     to "å". The recogniser writes what it heard, which is the truth.

     And where two readings are close, the language model picks the commoner
     word: "säg" is handed back as "sig" every time.

   In all three the child read correctly, so the app must not say otherwise. For
   an app that listens to reading aloud this is not a loosening of standards — it
   is the standard. Reading aloud means producing the right sound, and these
   produce the same sound. Which of two identically-pronounced spellings was
   meant is a question for writing practice, not for a microphone.

   Groups are not merged transitively, and that matters: "det" is said "de" and
   "de" is said "dom", but "det" is not "dom", so those stay two groups sharing a
   word rather than becoming one. A pair matches when some single group holds
   both. */
const HOMOPHONE_GROUPS = [
  /* Same sound, different spelling. */
  ['han','hann'], ['fann','fan'], ['vann','van'], ['vet','vett'],
  ['sett','set'], ['glad','glatt'],

  /* Said differently from how it is written. */
  ['jag','ja'], ['vad','va'], ['med','me'], ['är','e'],
  ['det','de'], ['de','dem','dom'],
  ['och','å','ock','att'],
  ['mig','mej'], ['dig','dej'], ['sig','sej'],
  ['säga','säja'], ['sade','sa'], ['sagt','sakt'],
  ['mycket','mycke'], ['ska','skall'], ['sedan','sen'],
  ['någon','nån'], ['något','nåt'], ['några','nåra'], ['någonting','nånting'],
  ['sådan','sån'], ['sådant','sånt'], ['sådana','såna'],
  ['ned','ner'], ['god','go'], ['gjorde','jorde'], ['gjort','jort'],
  ['staden','stan'], ['dagen','dan'], ['morgon','morron'],

  /* The language model reaching for the commoner word. */
  ['säg','sig']
];

/* Word to the groups holding it — a word may sit in more than one. */
const HOMOPHONE_OF = (()=>{
  const m = new Map();
  HOMOPHONE_GROUPS.forEach((group, i) => group.forEach(w =>{
    if(!m.has(w)) m.set(w, []);
    m.get(w).push(i);
  }));
  return m;
})();

function sameSound(a, b){
  const ga = HOMOPHONE_OF.get(a);
  if(!ga) return false;
  const gb = HOMOPHONE_OF.get(b);
  if(!gb) return false;
  return ga.some(i => gb.indexOf(i) !== -1);
}

function numOf(t){
  if(isDigits(t)) return parseInt(t, 10);
  if(NUM_WORDS[t] !== undefined) return NUM_WORDS[t];
  /* Hundreds carrying a remainder: hundrafemtio, tvåhundratjugoett. */
  const at = t.indexOf('hundra');
  if(at >= 0){
    const head = t.slice(0, at), tail = t.slice(at + 6);
    const h = head === '' ? 1 : NUM_WORDS[head];
    if(h !== undefined && h >= 1 && h <= 9){
      if(tail === '') return h * 100;
      const rest = NUM_WORDS[tail];
      if(rest !== undefined && rest < 100) return h * 100 + rest;
    }
  }
  return null;
}

/* Strictness levels.
   budget = allowed number of character errors, depending on word length
   first  = requires the first letter to match
   skip   = how many words may be skipped forward
   dwell  = how long the cursor must have rested on a word before it may be
            skipped. Without this you could start reading mid-sentence. */
const STRICTNESS = {
  mild:   { budget:l=> l<=3?1 : l<=6?2 : 3, first:false, skip:2, dwell:700 },
  normal: { budget:l=> l<=3?0 : l<=6?1 : 2, first:true,  skip:1, dwell:1800 },
  strict: { budget:l=> l<=4?0 : 1,          first:true,  skip:0, dwell:0 }
};

/* Replaces the old tolerance threshold. Returns true/false, not a float —
   for short words there is no meaningful gray zone. */
function matches(hyp, ref){
  if(!hyp || !ref) return false;
  if(hyp === ref) return true;
  /* A numeral written in digits is matched by value and nothing else. The
     spelling tolerance below exists for pronunciation variants, and a numeral has
     no such gray zone: one character apart is a different number entirely, so on
     the mild setting "30" was being accepted for "20" and every single digit for
     every other. Words are left to the tolerance — which is also what keeps "en"
     and "ett" apart when the text and the child both spell them out. */
  if(isDigits(hyp) || isDigits(ref)){
    const hn = numOf(hyp), rn = numOf(ref);
    return hn !== null && rn !== null && hn === rn;
  }
  if(sameLetter(hyp, ref) || sameSound(hyp, ref)) return true;
  const rule = STRICTNESS[S.strict];
  if(rule.first && ref.length >= 4 && hyp[0] !== ref[0]) return false;
  // large length difference = different word, not a pronunciation variant
  if(Math.abs(hyp.length - ref.length) > rule.budget(ref.length)) return false;
  return lev(hyp, ref) <= rule.budget(ref.length);
}

/* ================= the app's own voice ================= */
/* The recognizer hears the loudspeaker. Nothing can be done about that from a
   web page: recognition captures through settings this app cannot reach, so
   there is no echo cancellation to ask for, and the result carries no hint of
   when the audio behind it was recorded.

   Gating on a stopwatch therefore cannot work, and that is what kept failing.
   WebKit does not deliver as it hears — it sits on the audio and hands over a
   final result seconds later, long after any discard window has closed. The
   app's own help word then arrived looking exactly like the child reading it,
   and moved the cursor.

   So the app remembers what it said and drops those tokens as they come back,
   by content instead of by clock. Per occurrence, not as a rule: the help word
   is the very word the child is meant to read next, and dropping one echo of
   "fönstret" must still leave the child's own "fönstret" to be heard and
   scored. */
const ECHO_TTL = 8000;   // a word the recognizer never made out must not suppress the child for ever

function noteEcho(text){
  const t = tokens(text);
  if(t.length) S.echo.push({ toks:t, at: performance.now() });
}

/* Drop the app's own words from the front of what is new. Only a leading run:
   the moment something arrives that the app did not say, the child is talking
   and the rest must be aligned normally. */
function dropEcho(toks){
  const now = performance.now();
  while(S.echo.length && now - S.echo[0].at > ECHO_TTL) S.echo.shift();
  if(S.hypConsumed > toks.length) S.hypConsumed = toks.length;
  while(S.echo.length && S.hypConsumed < toks.length){
    const head = S.echo[0];
    if(!matches(toks[S.hypConsumed], head.toks[0])) break;
    S.hypConsumed++;
    head.toks.shift();
    if(!head.toks.length) S.echo.shift();
  }
}

/* ================= sentence ================= */
/* The recognizer accumulates results across the whole session, and it hears the
   app's own voice. Without a cut, old speech — or the help word the app just
   said — gets matched against the sentence, and common short words like "och"
   or "på" then move the cursor without anyone having said anything.

   The cut used to be a session restart: stop(), wait for onend, start again.
   That was heavy and fragile — the app was deaf through the whole handover, and
   a single dropped event left it deaf for good. So the session is now left
   running and the transcript is muted instead: everything heard so far is
   consumed (the alignment anchor moves past it, so it can never be matched),
   and a short discard window swallows what is still in flight — audio the
   recognizer has heard but not yet delivered. */
function resetTranscript(){
  S.onsetAt = null;
  wasLoud = false;
  S.hypConsumed = S.hypLen;
  S.ignoreUntil = performance.now() + 1200;
  $('roHyp').textContent = '—';
  $('roHeard').textContent = '—';
}

function loadLine(){
  const raw = (S.lines[S.line]||'').trim();
  S.words = raw.split(/\s+/).filter(Boolean).map(w=>({
    raw:w, norm:norm(w), state:'coming'
  }));
  S.pos = 0;
  while(S.pos < S.words.length && isVoid(S.words[S.pos])){
    S.words[S.pos].state = 'done';
    S.pos++;
  }
  S.posSince = performance.now();
  S.lastMiscueKey = '';
  resetTranscript();
  renderSentence();
  renderTrack();
  updateReadouts();
  remember();
}

function renderSentence(){
  const el = $('sentence');
  el.innerHTML = '';
  S.words.forEach((w,i)=>{
    const s = document.createElement('span');
    s.className = 'w ' + (i===S.pos && S.running ? 'current' : w.state);
    s.textContent = w.raw;
    s.dataset.i = i;
    s.addEventListener('click',()=>{ speak(w.raw); });
    el.appendChild(s);
    el.appendChild(document.createTextNode(' '));
  });
  // on small screens the sentence can be taller than the stage —
  // keep the word being read in view as the cursor advances
  const cur = el.querySelector('.w.current');
  if(cur) cur.scrollIntoView({
    block:'center',
    behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth'
  });
}

function renderTrack(){
  const t = $('track');
  t.innerHTML='';
  S.words.forEach((w,i)=>{
    const d=document.createElement('div');
    d.className='seg ' + (i===S.pos && S.running ? 'current' : (w.state==='coming'?'':w.state));
    t.appendChild(d);
  });
}

function updateReadouts(){
  $('roPos').textContent = `${S.pos}/${S.words.length}`;
  $('roMiss').textContent = S.misses;
  $('score').textContent = S.score;
  if(S.lats.length){
    const sorted=[...S.lats].sort((a,b)=>a-b);
    $('roMed').textContent = Math.round(sorted[Math.floor(sorted.length/2)])+' ms';
  }
}

/* ================= reading clock ================= */
/* Counts time spent actually reading, not wall-clock since the page opened:
   the pause between two stretches is not reading. An optional target ends the
   stretch by itself, so a short session can be agreed on beforehand instead of
   negotiated when the child wants to stop. */
/* The 10 s and 30 s lengths are there to make the whole flow easy to try out
   without sitting through a real stretch. */
const TARGETS = [
  ['Ingen gräns', 0], ['10 sek', 10000], ['30 sek', 30000],
  ['3 min', 180000], ['5 min', 300000], ['10 min', 600000],
  ['15 min', 900000], ['20 min', 1200000]
];

function elapsedMs(){
  return S.timeMs + (S.runSince === null ? 0 : performance.now() - S.runSince);
}

function fmtClock(ms){
  const t = Math.max(0, Math.round(ms/1000));
  return Math.floor(t/60) + ':' + String(t%60).padStart(2,'0');
}

function renderClock(){
  const el = $('clockBox');
  $('clockNow').textContent = fmtClock(elapsedMs());
  $('clockGoal').textContent = S.target ? '/ ' + fmtClock(S.target) : '';
  el.classList.toggle('live', S.running);
  el.classList.toggle('done', S.targetDone);
}

/* Banks the running stretch into timeMs and onto the profile's lifetime total.
   Called before anything that reads or resets the clock, so the two never
   double-count the same seconds. */
function bankTime(){
  if(S.runSince === null) return;
  /* performance.now(), not Date.now(): a monotonic clock cannot jump. The wall
     clock can — an NTP correction, a timezone change, someone setting the time by
     hand — and a negative delta used to run the session clock backwards while a
     large positive one declared the reading time over on the spot.

     Capped anyway. Four hours is not a reading session, it is a tab someone left
     open, and one of those must not be able to wreck a child's lifetime total. */
  const run = Math.min(Math.max(0, performance.now() - S.runSince), 4*3600*1000);
  S.timeMs += run;
  S.runSince = null;
  const p = profile();
  if(p && run > 0){ p.time = (p.time||0) + run; saveSoon(); }
}

function startClock(){
  clearInterval(S.clockTimer);
  S.clockTimer = setInterval(()=>{
    renderClock();
    if(!S.running || !S.target) return;
    if(elapsedMs() >= S.target) finishStretch();
  }, 500);
  renderClock();
}

function stopClock(){
  clearInterval(S.clockTimer);
  S.clockTimer = null;
  renderClock();
}

/* The target ran out: pause and say so. Position, score and text are kept, so
   pressing play again simply starts the next stretch. */
function finishStretch(){
  S.targetDone = true;
  stop();
  // the clock right above already shows the time, so don't repeat it here
  setHint('Tiden är slut! Dags för paus.', true);
  speak('Tiden är slut. Dags för paus.', 'phrase');
}

function resetClock(){
  bankTime();
  S.timeMs = 0;
  S.targetDone = false;
  if(S.running) S.runSince = performance.now();
  renderClock();
}

function setTarget(v){
  S.target = v;
  S.targetDone = false;
  document.querySelectorAll('#targets .chip').forEach(b=>{
    b.classList.toggle('on', +b.dataset.ms === v);
  });
  renderClock();
}

function buildTargets(){
  const box = $('targets');
  box.innerHTML = '';
  TARGETS.forEach(([label, ms])=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (ms === S.target ? ' on' : '');
    b.dataset.ms = ms;
    b.textContent = label;
    b.onclick = ()=>{ setTarget(ms); remember(); };
    box.appendChild(b);
  });
}

function setHint(txt, warm){
  const h=$('hint');
  h.textContent = txt;
  h.className = 'hint' + (warm?' warm':'');
}

/* ================= alignment (greedy token passing) ================= */
/* The alignment is anchored at the confirmed position. Previously the whole
   sentence was replayed on every result, which made it vulnerable to the
   recognizer rewriting text it had already delivered: a reinterpreted word
   further back could lock the cursor for the rest of the sentence. Now settled
   words stay fixed, and only the not-yet-consumed hypothesis tokens are tried
   against the words from the cursor onward. */
/* A token that normalises to nothing — a lone dash, an ellipsis, a stray quote —
   is punctuation that happened to have spaces around it, not a word anyone can
   read aloud. It can never be matched, so the cursor used to sit on it: on the
   strict setting, where nothing may be skipped, for ever. Passing them is not a
   concession; there is nothing there to say. */
const isVoid = w => !w.norm;

/* A line with nothing readable in it — a lone dash, a row of asterisks, a stray
   quotation mark — leaves the cursor past the last word with nothing able to
   move it: the help timer stands down at the end of a line, and only a match can
   finish one. The session would sit there for ever, looking alive. So such lines
   are dropped where text enters and the state never arises. */
const readableLines = arr =>
  arr.map(x => x.trim())
     .filter(x => x && x.split(/\s+/).some(w => norm(w)));

function align(hypTokens, fromWord, fromTok){
  let i=fromWord, j=fromTok;
  const states = S.words.map(w=>w.state);
  const miscues = [];
  const rule = STRICTNESS[S.strict];
  const passVoid = ()=>{
    while(i < S.words.length && isVoid(S.words[i])){ states[i]='done'; i++; }
  };
  passVoid();

  // How many words may be passed over in total during this pass. Zero until
  // the cursor has rested long enough. The budget is consumed, otherwise
  // jumps could chain through the whole sentence.
  let budget = (performance.now() - S.posSince) >= rule.dwell ? rule.skip : 0;
  let consumed = j;

  while(j<hypTokens.length && i<S.words.length){
    const h = hypTokens[j];

    if(matches(h, S.words[i].norm)){
      states[i]='done'; i++; j++; consumed=j;
      passVoid();
      continue;
    }

    let jumped = false;
    /* Void words between here and the target are free — they were never
       something the child failed to read. */
    const cost = k =>{ let c = 0; for(let m=0;m<k;m++) if(!isVoid(S.words[i+m])) c++; return c; };
    for(let k=1; i+k < S.words.length && cost(k) <= budget; k++){
      if(matches(h, S.words[i+k].norm)){
        for(let m=0;m<k;m++){ states[i] = isVoid(S.words[i]) ? 'done' : 'skipped'; i++; }
        states[i]='done'; i++; j++; consumed=j;
        budget -= cost(k);
        passVoid();
        jumped = true; break;
      }
    }
    if(jumped) continue;

    // the hypothesis token didn't belong here — note it if it is close enough
    // to be a reading attempt at the current word, not just noise
    const ref = S.words[i].norm;
    if(h.length>1 && sim(h, ref) > 0.34){
      miscues.push({heard:h, expected:S.words[i].raw, at:i});
    }
    j++;
  }
  return {states, pos:i, consumed, miscues};
}

function applyAlign(hypTokens, isFinal=false){
  // The recognizer can at any time deliver a shorter token list than before —
  // on session restart, or when an interim result is replaced by a shorter
  // final result. If the anchor then points past the list the cursor stalls
  // for good, so it must be caught here. Clamp to the list end rather than
  // resetting to zero: from zero every already-consumed token is replayed
  // against the words at the cursor, and a common short word like "på" then
  // advances the cursor without anyone having said anything.
  if(S.hypConsumed > hypTokens.length) S.hypConsumed = hypTokens.length;
  $('roTok').textContent = S.hypConsumed + '/' + hypTokens.length;

  const {states,pos,consumed,miscues} = align(hypTokens, S.pos, S.hypConsumed);

  // Report misread attempts even when the cursor doesn't move — but only on
  // FINAL results. While a word is still being spoken the recognizer's
  // interim guesses are all over the place, and judging those would punish
  // words that end up correct once fully read.
  if(miscues.length && isFinal){
    const m = miscues[miscues.length-1];
    if(m.at === S.pos){
      $('roHeard').textContent = m.heard + ' \u2260 ' + m.expected;
      noteHard(m.expected);
      // interim results repeat the same guess many times in a row —
      // only make a sound when the attempt is actually new
      const key = m.at + ':' + m.heard;
      const now = performance.now();
      // the same key must be allowed again after a while, or a genuine second
      // attempt at the same word passes unremarked
      const fresh = key !== S.lastMiscueKey || now - S.lastMiscueAt > 2500;
      if(fresh && now - S.lastMiscueAt > 600){
        S.lastMiscueKey = key;
        S.lastMiscueAt = now;
        playFail();
      }
    }
  }

  if(pos <= S.pos) return false;

  // latency measurement: from voice onset to first cursor advance
  if(S.onsetAt !== null){
    const lat = performance.now() - S.onsetAt;
    if(lat > 40 && lat < 4000){
      S.lats.push(lat);
      $('roLat').textContent = Math.round(lat)+' ms';
    }
    S.onsetAt = null;
  }

  const gained = pos - S.pos;
  states.forEach((st,k)=>{ S.words[k].state = st; });
  let anyDone=false, anySkipped=false;
  for(let k=S.pos;k<pos;k++){
    if(S.words[k].state==='done'){ S.score++; anyDone=true; }
    if(S.words[k].state==='skipped'){ S.misses++; anySkipped=true; }
  }
  if(anyDone){ playOk(); S.lastMiscueKey=''; }
  S.pos = pos;
  S.posSince = performance.now();
  S.hypConsumed = consumed;
  renderSentence(); renderTrack(); updateReadouts();
  armHoldoff();

  if(S.pos >= S.words.length){
    finishLine();
  } else if(gained>0){
    setHint('', false);
  }
  return true;
}

function noteHard(word){
  const k = norm(word);
  /* Nothing readable is nothing to practise. Older profiles can hold such
     entries from before void words were passed over, and a review line built
     from one would hang the same way. */
  if(!k) return;
  S.hard.set(k, (S.hard.get(k)||0) + 1);
  $('roHard').textContent = S.hard.size;

  /* S.hard is cleared after every review; the profile's bank is not, so the
     adult can see which words keep coming back week after week. Trimmed to
     the most frequent ones so it can't grow without bound. */
  const p = profile();
  if(!p) return;
  p.hard[k] = (p.hard[k]||0) + 1;
  const keys = Object.keys(p.hard);
  if(keys.length > BANK_MAX){
    keys.sort((a,b)=>p.hard[b]-p.hard[a]).slice(BANK_MAX).forEach(x=>{ delete p.hard[x]; });
  }
  saveSoon();
}

function hardList(n){
  return [...S.hard.entries()]
    .filter(e => norm(e[0]))
    .sort((a,b)=>b[1]-a[1])
    .slice(0,n)
    .map(e=>e[0]);
}

/* The delay before moving on races anything the adult does in the meantime —
   next sentence, a new text, pause. The handle lets those cancel it, so the
   session can't advance twice or mutate a stopped session. */
function finishLine(){
  clearTimeout(S.holdTimer);
  clearTimeout(S.finishTimer);
  const done = profile();
  if(done && !S.reviewing){ done.read = (done.read||0) + 1; saveSoon(); }
  setHint('Bra läst!', true);
  /* Spoken only for a finished sentence. During the hard-word review a whole
     "line" is one single word, and praising each one out loud turns the review
     into a call-and-response with the app — the pling, for those who have it
     on, is acknowledgement enough. */
  if(!S.reviewing) speak('Bra läst!', 'phrase');
  const atLine = S.line, ofLines = S.lines;
  S.finishTimer = setTimeout(()=>{
    S.finishTimer = null;
    // anything that changed the text or the position wins over this callback
    if(!S.running || S.lines !== ofLines || S.line !== atLine) return;
    if(S.line < S.lines.length-1){
      S.line++; loadLine(); armHoldoff();
      setHint('Fortsätt när du vill.');
    }
    else if(S.hard.size && !S.reviewing){
      // repeat the words that were hard, one at a time
      S.reviewing = true;
      S.source = S.lines;          // remember the text so it can be restored afterwards
      S.lines = hardList(6);
      S.line = 0; loadLine(); armHoldoff();
      setHint('Nu tar vi de svåraste orden en gång till.');
      speak('Nu tar vi de svåra orden en gång till.', 'phrase');
    }
    else {
      // the review is over: put the real text back and clear the tally, so a
      // later run through the text can earn its own review
      if(S.reviewing){
        S.reviewing = false;
        if(S.source) S.lines = S.source;
        S.hard.clear();
        $('roHard').textContent = 0;
      }
      nextSection();
    }
  }, 1600);
}

/* Running out of text no longer ends the session — the clock does that, or the
   adult. Finishing a text rolls straight into the next one so the child can
   keep reading without anyone stopping to pick something new. */
function nextSection(){
  const names = Object.keys(PRESETS);
  const cur = S.lines.join('\n');
  const at = names.findIndex(n => PRESETS[n].join('\n') === cur);
  playDone();

  if(at === -1){
    // pasted homework has no next text — read it again from the top
    S.line = 0;
    loadLine(); armHoldoff();
    setHint('Texten är klar! Vi tar den en gång till.', true);
    speak('Bra jobbat! Texten är klar. Nu tar vi den en gång till.', 'phrase');
    return;
  }

  const next = names[(at + 1) % names.length];
  S.lines = PRESETS[next].slice();
  S.line = 0;
  $('txt').value = S.lines.join('\n');
  loadLine(); armHoldoff();
  markActivePreset();
  setHint('Den delen är klar! Nu kommer ' + next + '.', true);
  speak('Bra jobbat! Den delen är klar. Nu kommer ' + next + '.', 'phrase');
}

/* ================= help timer ================= */
function armHoldoff(){
  clearTimeout(S.holdTimer);
  if(!S.running || S.pos>=S.words.length) return;
  S.holdTimer = setTimeout(()=>{
    if(!S.running) return;
    // Expiring mid-utterance must not drop the chain: the child hasn't had a
    // fair silence to read in yet, so wait out the speech and try again.
    if(S.speaking){ armHoldoff(); return; }
    const el = document.querySelector(`.w[data-i="${S.pos}"]`);
    if(el){ el.classList.remove('current'); el.classList.add('helping'); }
    const w = S.words[S.pos];
    setHint('Det här ordet är ' + w.raw);
    noteHard(w.raw);
    speak(w.raw, 'word');
    armHoldoff();
  }, S.holdoff);
}

/* ================= speech ================= */
/* The reading language, in one place. The app is Swedish only, and that is why
   the voice list hides every other language: a picker offering seventy English
   voices for a Swedish reading lesson is noise, not choice. Adding a language
   later is this object plus a set of texts — not a hunt through the file. The
   Swedish wording elsewhere is left as it is, since a second language means
   translating the interface anyway, which is the larger half of that job. */
const LANG = {
  tag:    'sv-SE',    // what the recognizer and the utterances are told
  prefix: 'sv',       // what a voice's own lang must begin with to qualify
  name:   'Svenska'
};

/* Two speeds. A single word to be sounded out needs the slow pace;
   encouragement and instructions in between sound sleepy at that tempo
   and therefore run faster. 'word' is the default since it is the
   sensitive use case. */
function speak(text, kind='word'){
  const rate = kind==='phrase' ? Math.min(1.8, S.rate * 1.28) : S.rate;
  if(piper.state === 'ready') speakPiper(text, rate);
  else                       speakSystem(text, rate);
}

/* Both engines share this bookkeeping.

   Dropping onresult events while speaking is not enough: the recognizer keeps
   transcribing our own TTS into its cumulative result list, and those tokens
   would be aligned the moment the gate lifts — letting the help feature score
   the word by saying it itself. So everything heard while speaking is consumed
   as it arrives, and the release below mutes a moment longer for the tail the
   recognizer has heard but not yet delivered. The session itself is never
   restarted for this — see resetTranscript.

   Each utterance owns the shared speaking state only for its own turn. A
   cancelled utterance's end event arrives after the next one has already
   started, and without the sequence check it would clear that one's watchdog
   and un-gate the microphone mid-speech. The timeout is the breaker for an
   engine that never reports back at all — Chrome drops onend now and then,
   especially after cancel(), and without it the microphone would stay muted for
   the rest of the session. */
function beginTurn(text){
  S.speaking = true;
  noteEcho(text);
  const myTurn = ++S.speakSeq;
  const release = ()=>{
    if(S.speakSeq !== myTurn) return;
    clearTimeout(S.speakTimer);
    S.speaking = false;
    resetTranscript();
    armHoldoff();
  };
  clearTimeout(S.speakTimer);
  S.speakTimer = setTimeout(()=>{
    /* The engine never reported back — the panel must say so, or a word that
       silently never sounded is indistinguishable from one that played. */
    noteTts('vakthund');
    release();
  }, Math.min(15000, 1200 + text.length*120));
  return release;
}

function speakSystem(text, rate){
  if(!window.speechSynthesis) return;
  // only interrupt when something is actually queued — a gratuitous cancel()
  // right before speak() can wedge the synthesizer on iOS
  if(speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  // a neural utterance may still be playing — the two must not overlap
  try{ piperPlayer.pause(); }catch(err){}
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANG.tag;
  u.rate = rate;
  /* S.voice always holds a system voice, even while a neural one is chosen —
     that is what makes it the fallback. */
  if(S.voice) u.voice = S.voice;
  const release = beginTurn(text);
  noteTts('köad');
  u.onstart = ()=> noteTts('talar');
  u.onend = ()=>{ noteTts('klar'); release(); };
  u.onerror = e=>{ noteTts('fel: ' + (e && e.error || '?')); release(); };
  speechSynthesis.speak(u);
  // iOS sometimes leaves the synthesizer paused; resume() is a no-op elsewhere
  speechSynthesis.resume();
}

/* ================= optional neural voice ================= */
/* iOS hands a web page only the voices that shipped with the system, so on an
   iPhone the Swedish choice is the compact Alva and nothing else — Apple states
   plainly that downloadable voices are not exposed to Web Speech. A neural model
   running locally in WebAssembly is the only way past that.

   It costs a large download, so it is strictly opt-in: chosen from the same
   voice list, never fetched unasked, and the system voices are untouched and
   remain the default. If anything at all goes wrong the app drops back to the
   system voice — a reading app must never fall silent on a child waiting for a
   word. */
const PIPER = [
  { id:'sv_SE-alma-medium', name:'Alma', mb:60, hf:'sv/sv_SE/alma/medium/sv_SE-alma-medium.onnx' },
  { id:'sv_SE-lisa-medium', name:'Lisa', mb:60, hf:'sv/sv_SE/lisa/medium/sv_SE-lisa-medium.onnx' },
  { id:'sv_SE-nst-medium',  name:'NST',  mb:60 }
];

/* Only NST is in the mirror the library ships with; Alma and Lisa live in the
   canonical piper-voices repository. The library builds every model URL as
   `${HF_BASE}/${PATH_MAP[id]}` with HF_BASE pinned to that mirror, so the path
   climbs back out to the host root and down into the other repository instead.
   Blunt, but it leaves everything the library does around that URL intact — that
   it only caches what matches huggingface.co, and that its cache key is the
   file's basename, which stays unique per voice either way. */
const PIPER_ESCAPE = '../../../../rhasspy/piper-voices/resolve/main/';
function registerPiperPaths(lib){
  if(!lib || !lib.PATH_MAP) return;
  PIPER.forEach(v =>{ if(v.hf) lib.PATH_MAP[v.id] = PIPER_ESCAPE + v.hf; });
}
const PIPER_KEY = 'piper:';
const isPiperKey = k => typeof k === 'string' && k.indexOf(PIPER_KEY) === 0;
const piperIdOf  = k => k.slice(PIPER_KEY.length);

/* The package must come down untouched. Through esm.sh the phonemizer — an
   Emscripten build that decides by `typeof process` whether it is in Node —
   sees an injected process shim, takes the Node path and dies reading its data
   file with fs.readFile. And onnxruntime-web's JavaScript and WebAssembly must
   be the same version, which is what the import map in <head> pins: the library
   asks for the bare name 'onnxruntime-web/wasm', and its own wasmPaths point at
   1.18.0. */
const PIPER_LIB = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/dist/piper-tts-web.js';
const PIPER_WASM = {
  onnxWasm:  'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/',
  piperWasm: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
  piperData: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data'
};

/* One object, because three of these encoded a single state between them:
   state === 'ready' is supposed to mean session and voice are both set, and
   nothing enforced that while they were separate variables. */
const piper = {
  state: 'off',      // off | busy | ready | failed
  lib: null,         // the module, imported the first time it is needed
  session: null,
  voice: null,       // which voice the session was built for
  release: null,     // the current turn's release, called on 'ended'
  url: null,         // object URL of the audio being played, revoked on replace
  unlocked: false    // has the media element been played once from a gesture
};

/* Playback goes through a media element, not Web Audio. On iPhone the hardware
   mute switch silences Web Audio — it lands in the ambient audio session —
   while a media element gets the playback session and is heard regardless.
   speechSynthesis is audible for the same reason. */
const piperPlayer = new Audio();
piperPlayer.setAttribute('playsinline', '');
piperPlayer.preload = 'auto';


piperPlayer.addEventListener('ended', ()=>{ noteTts('klar'); if(piper.release) piper.release(); });
piperPlayer.addEventListener('error', ()=>{ noteTts('fel: media'); if(piper.release) piper.release(); });

/* A tenth of a second of 8-bit silence, built rather than embedded. */
function silentWav(ms = 100, rate = 8000){
  const n = Math.round(rate * ms / 1000);
  const b = new Uint8Array(44 + n);
  const dv = new DataView(b.buffer);
  const tag = (o,t)=>{ for(let i=0;i<t.length;i++) b[o+i] = t.charCodeAt(i); };
  tag(0,'RIFF');  dv.setUint32(4, 36 + n, true); tag(8,'WAVE');
  tag(12,'fmt '); dv.setUint32(16, 16, true);    dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true); dv.setUint32(24, rate, true); dv.setUint32(28, rate, true);
  dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  tag(36,'data'); dv.setUint32(40, n, true);
  b.fill(128, 44);                       // 8-bit unsigned silence sits at 128
  return new Blob([b], {type:'audio/wav'});
}

/* iOS only allows play() from inside a user interaction, and the synthesised
   blob is ready several awaits later — long after the tap. So the element is
   unlocked once, during a real gesture, by playing silence through it; after
   that the same element may be played programmatically for the rest of the
   page's life. Call this synchronously from a handler, before any await. */
function piperUnlock(){
  if(piper.unlocked || !window.URL) return;
  piperPlayer.src = URL.createObjectURL(silentWav());
  piperPlayer.play().then(
    ()=>{ piper.unlocked = true; },
    /* The silence being cut off by the next sound is the intended outcome, and
       the unlock still counted. Anything else means the gesture was gone. */
    e =>{ if(e && e.name === 'AbortError') piper.unlocked = true; }
  );
}

/* What the synthesizer last did, shown in the adult's panel. On a phone there
   is no console, and "the word was queued but never started" versus "it played
   to the end without a sound coming out" is the difference between two
   entirely different iOS failures. This row is an instrument, not a fix: it is
   what decides which of those two the app is actually suffering from. */
function noteTts(msg){
  const el = $('roTts');
  if(el) el.textContent = msg;
}

function piperNote(msg){
  const el = $('piperNote');
  if(!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
}

function piperGiveUp(e){
  piper.state = 'failed';
  piper.session = null; piper.voice = null;
  piperNote('Den neurala rösten kunde inte startas, så appen använder systemrösten.' +
            (e && e.message ? ' (' + e.message + ')' : ''));
}

function piperOff(){
  piper.state = 'off';
  piper.session = null; piper.voice = null;
  try{ piperPlayer.pause(); }catch(err){}
  piperNote('');
}

/* allowDownload separates the two ways a neural voice becomes current: the adult
   picking it here and now, and a profile arriving on a device that has never
   seen it. The preference travels with the profile, the 60 MB does not, and
   starting an unasked-for download on someone's data plan is not on. */
/* The library's own bookkeeping is not a trustworthy answer to "is this model
   already here?". Its download() writes to the Origin Private File System without
   awaiting the write — and then reads the file straight back, which on a fast
   machine hands onnxruntime a half-written model and fails with "No graph was
   found in the protobuf". So the download step is skipped entirely: letting
   TtsSession.create() fetch it uses the blob it just received, in memory, and the
   service worker stores the response on the way past. This asks that cache
   directly. The name is shared with sw.js and must stay in step. */
const PIPER_CACHE = 'laskompis-models-v1';

async function piperCached(id){
  try{
    if(!window.caches || !piper.lib || !piper.lib.PATH_MAP) return false;
    const path = piper.lib.PATH_MAP[id];
    if(!path) return false;
    const c = await caches.open(PIPER_CACHE);
    // the path may climb out of the base, so normalise the way fetch() would
    return !!(await c.match(new URL(piper.lib.HF_BASE + '/' + path).href));
  }catch(e){ return false; }
}

async function piperEnsure(id, allowDownload){
  if(piper.state === 'ready' && piper.voice === id) return;
  if(piper.state === 'busy') return;
  piper.state = 'busy';
  piper.session = null; piper.voice = null;
  try{
    piperNote('Förbereder rösten …');
    if(!piper.lib){
      piper.lib = await import(PIPER_LIB);
      registerPiperPaths(piper.lib);
    }
    const cached = await piperCached(id);
    if(!cached && !allowDownload){
      piper.state = 'off';
      piperNote('Den neurala rösten är vald men inte nedladdad på den här enheten. ' +
                'Välj den i listan igen för att hämta den.');
      return;
    }
    const meta = PIPER.find(v => v.id === id);
    piperNote(cached ? 'Startar rösten …' : 'Laddar ner rösten …');
    /* TtsSession's constructor is a singleton: handed a second voice it hands
       back the first session, overwrites its voiceId and keeps the model it
       already loaded. Without clearing the instance, every voice picked after
       the first would silently still be the first one — the download never even
       happens. The discarded session's WebAssembly memory is not reclaimed, as
       the library exposes no way to release it, but switching voice is something
       an adult does in the settings now and then, not something the app does. */
    if(piper.lib.TtsSession) piper.lib.TtsSession._instance = null;
    piper.session = await piper.lib.TtsSession.create({
      voiceId: id,
      wasmPaths: PIPER_WASM,
      progress: p =>{
        if(cached || !p.total) return;
        piperNote('Laddar ner rösten … ' + Math.round(p.loaded / p.total * 100) +
                  ' % av ' + (meta ? meta.mb : '?') + ' MB');
      }
    });
    piper.voice = id;
    piper.state = 'ready';
    piperNote((cached ? 'Neural röst aktiv, redan nedladdad. ' : 'Neural röst aktiv. ') +
              'Den uttalar en del ord fel.');
  }catch(e){
    piperGiveUp(e);
  }
}

/* Called when a profile is applied and at start-up: bring the neural voice back
   if this device already has it, and never download for it. A failed attempt is
   not retried on its own — picking the voice again is the retry. */
function piperResume(){
  if(!isPiperKey(S.voiceURI)){
    if(piper.state !== 'off') piperOff();
    return;
  }
  if(piper.state !== 'off') return;
  piperEnsure(piperIdOf(S.voiceURI), false);
}

function speakPiper(text, rate){
  /* Captured rather than read later: switching voice clears the global while a
     synthesis may still be in flight. */
  const session = piper.session;
  const release = beginTurn(text);
  const myTurn = S.speakSeq;                  // beginTurn just claimed this one
  piper.release = release;
  try{ piperPlayer.pause(); }catch(err){}
  noteTts('syntetiserar');
  (async ()=>{
    const blob = await session.predict(text);
    /* The turn counter, not piper.release: a newer turn may belong to the system
       voice, which never touches piper.release, and this synthesis would then
       have started talking over it. */
    if(S.speakSeq !== myTurn) return;
    if(piper.url) URL.revokeObjectURL(piper.url);
    piper.url = URL.createObjectURL(blob);
    /* The model has one fixed tempo, so the rate slider is applied on playback.
       Media elements correct pitch by default, which is exactly what a slower
       reading voice needs.

       Order matters: assigning src runs the media load algorithm, and that resets
       playbackRate to defaultPlaybackRate. Setting the default first makes the
       load land on the right speed, and setting playbackRate again afterwards
       covers a browser that does it the other way round. */
    piperPlayer.preservesPitch = true;
    piperPlayer.defaultPlaybackRate = rate;
    piperPlayer.src = piper.url;
    piperPlayer.playbackRate = rate;
    await piperPlayer.play();
    noteTts('spelar');
  })().catch(e =>{
    /* Assigning a new source rejects the previous play() with AbortError. The
       app interrupts itself constantly — a word cutting off the encouragement
       before it — so that is ordinary, not a broken engine, and must not condemn
       the voice. The newer turn is already speaking; nothing more to do. */
    if(e && e.name === 'AbortError'){ release(); return; }
    /* Anything else: never leave the child in silence, hand this word to the
       system voice. */
    piperGiveUp(e);
    release();
    speakSystem(text, rate);
  });
}

/* Half-duplex: recognition is ignored while the app is speaking. S.speaking is
   the single source of that truth — it used to be mirrored in a second variable
   that was set and cleared in the same three places, which is a drift waiting to
   happen in the one flag that decides whether the app can hear the child. */

/* ================= level meter + voice onset ================= */
let audioCtx=null, analyser=null, dataArr=null, rafId=null, wasLoud=false;
let micStream=null, micSrc=null;

/* The AudioContext is built once and lives for the whole page. Only the stream
   and the source node come and go — see releaseAudio() for why the context
   itself must never be closed. */
/* The level meter is the only thing the getUserMedia stream is for. Speech
   recognition captures on its own, through settings this app cannot reach, so
   turning the meter off costs no listening at all.

   On iPhone that trade is worth making by default. Any active capture puts
   Safari's audio session into record mode, and a web page cannot ask for
   defaultToSpeaker — so the moment the microphone is granted, everything the app
   says moves to the earpiece and stays there, mid-sentence if that is where the
   grant lands. Constraints do not change it; only not capturing does. A bar that
   twitches is worth less than words a child can hear. */
async function ensureAudio(){
  if(!S.meter){
    if(micStream) releaseMeter();
    return true;                 // nothing to set up, and nothing to fail
  }
  try{
    if(!micStream){
      /* All three off, deliberately. Asking for echo cancellation, noise
         suppression or gain control makes WebKit open the voice-processing audio
         unit, and that unit brings the telephone call with it: iOS moves the whole
         session to the earpiece the instant the microphone is granted, and leaves
         it there. Everything the app says then sounds like a phone call.

         Turning them off costs nothing here. This stream feeds the level meter and
         nothing else — speech recognition captures separately, through settings
         this app cannot reach, so what the recognizer hears is unaffected. And
         echo cancellation would be redundant anyway: the app is half-duplex,
         gating the microphone while it speaks and discarding the transcript
         afterwards. */
      micStream = await navigator.mediaDevices.getUserMedia({audio:{
        echoCancellation:false, noiseSuppression:false, autoGainControl:false
      }});
      micSrc = null;   // any earlier source node belongs to a stream that is gone
    }
    if(!audioCtx){
      audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      dataArr = new Uint8Array(analyser.fftSize);
    }
    if(!micSrc){
      micSrc = audioCtx.createMediaStreamSource(micStream);
      micSrc.connect(analyser);
    }
    if(audioCtx.state === 'suspended') await audioCtx.resume();
    if(rafId) cancelAnimationFrame(rafId);
    tick();
    return true;
  }catch(e){
    showErr('Mikrofonen är inte tillgänglig: '+e.message+
      ' — kör sidan via http://localhost i stället för att öppna filen direkt, '+
      'så slipper du också tillståndsfrågan varje gång.');
    return false;
  }
}

/* Backgrounding the app has to actually let go of the microphone. Suspending
   the audio context is not enough for that: what holds the microphone are the
   tracks, and while they are live iOS keeps the recording indicator lit and the
   device reserved, so a frozen tab in the background behaves — to the system
   and to other apps — as if it were still listening. So the tracks are stopped
   and the source node with them; a stopped track can't be restarted, and
   ensureAudio() wires a fresh one into the same analyser on the way back.

   The AudioContext itself is only suspended, never closed. Closing and
   reopening it re-negotiates the iOS audio session, and the session that comes
   back is the voice-call one: output moves from the loudspeaker to the earpiece
   and everything the app says sounds like a phone call. Closing it buys nothing
   anyway — it isn't what holds the microphone. */
function releaseAudio(){
  /* The recognizer holds its own capture, independent of the getUserMedia
     stream, and its onend would restart it — detach that before stopping. */
  if(rec){ try{ rec.onend = null; rec.stop(); }catch(e){} rec = null; }
  unwatchRecognition();
  S.recLive = false;
  S.ignoreUntil = performance.now() + 1200;
  S.hypConsumed = 0;
  S.hypLen = 0;
  S.echo.length = 0;
  if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
  if(micSrc){ try{ micSrc.disconnect(); }catch(e){} micSrc = null; }
  if(micStream){
    micStream.getTracks().forEach(t=>{ try{ t.stop(); }catch(e){} });
    micStream = null;
  }
  if(audioCtx && audioCtx.state === 'running') audioCtx.suspend().catch(()=>{});
  wasLoud = false; S.onsetAt = null;
  $('lvl').style.width = '0%';
}

/* Only the meter's own graph, leaving the recognizer and any neural playback
   alone — used when the meter is switched off mid-session. */
function releaseMeter(){
  if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
  if(micSrc){ try{ micSrc.disconnect(); }catch(e){} micSrc = null; }
  if(micStream){
    micStream.getTracks().forEach(t=>{ try{ t.stop(); }catch(e){} });
    micStream = null;
  }
  wasLoud = false; S.onsetAt = null;
  $('lvl').style.width = '0%';
}

function tick(){
  if(!analyser || !dataArr){ rafId = null; return; }
  analyser.getByteTimeDomainData(dataArr);
  let sum=0;
  for(let i=0;i<dataArr.length;i++){ const v=(dataArr[i]-128)/128; sum+=v*v; }
  const rms = Math.sqrt(sum/dataArr.length);
  const pct = Math.min(100, rms*420);
  $('lvl').style.width = pct+'%';

  const loud = rms > 0.022;
  if(loud && !wasLoud && !S.speaking && S.onsetAt===null){
    S.onsetAt = performance.now();   // voice onset
  }
  wasLoud = loud;

  // Safety net: if the child is clearly reading but the cursor has been
  // still for a long time, the accumulated transcript has probably wedged the
  // alignment. Discard it and start fresh from the current word — the position
  // is kept. A session that has actually died is the supervisor's job.
  const now = performance.now();
  if(S.running && !S.speaking && loud
     && now - S.posSince > S.holdoff * 2
     && now - S.lastRescue > 8000){
    S.lastRescue = now;
    resetTranscript();
  }

  rafId = requestAnimationFrame(tick);
}

/* ================= speech recognition ================= */
let rec=null;

function buildRecognizer(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    showErr('Den här webbläsaren saknar taligenkänning. Använd Chrome eller Edge.');
    return null;
  }
  const r = new SR();
  r.lang = LANG.tag;
  r.continuous=true;
  r.interimResults=true;
  r.maxAlternatives=1;

  /* Three ways in, because onstart is droppable and it used to be the only one
     that marked the session live. Any of them proves a session is running.
     None of them touches ignoreUntil: the discard window is a deadline that
     expires on its own, and onspeechstart can fire mid-session on the very
     speech the window exists to discard. */
  const markLive = ()=>{
    if(!S.recLive) S.recStarts++;
    S.recLive = true;
    S.recSeenAt = performance.now();
    renderRec();
  };
  /* Every new session has an empty result list, so the token anchor must be
     reset — but only here, where a session genuinely begins. applyAlign clamps
     it if this event never arrives. */
  r.onstart = ()=>{ S.hypConsumed = 0; S.hypLen = 0; markLive(); };
  r.onaudiostart = markLive;
  r.onspeechstart = markLive;

  r.onresult = ev=>{
    S.recSeenAt = performance.now();   // results are the best proof of all
    let full='';
    for(let i=0;i<ev.results.length;i++) full += ev.results[i][0].transcript+' ';
    const toks = tokens(full);
    S.hypLen = toks.length;
    /* The app's own voice, whenever it happens to be delivered. This is the
       real defence — see dropEcho — and it does not depend on when the
       recognizer chooses to hand the words over. */
    dropEcho(toks);
    /* Muted: the app is speaking, or a discard window is running. Hold off on
       aligning, but do not swallow the list: what the child says here is still
       theirs, and it is aligned as soon as the window closes. Swallowing it
       wholesale is what left the app looking deaf. */
    if(S.speaking || performance.now() < S.ignoreUntil) return;
    $('roHyp').textContent = full.trim().slice(-70) || '—';
    /* A single event can carry a finalized result followed by a fresh interim
       one. Looking only at the last result would classify the whole event as
       interim and the finalized misreading would never be judged, so scan
       everything that changed in this event for a final result. */
    let anyFinal = false;
    for(let i=ev.resultIndex; i<ev.results.length; i++){
      if(ev.results[i].isFinal){ anyFinal = true; break; }
    }
    applyAlign(toks, anyFinal);
  };
  /* Only no-speech refreshes recSeenAt: it is the recognizer saying "I am
     running, nobody talked", which a silent room produces regularly, and
     without it the supervisor would cycle a perfectly healthy session. Every
     other error is the opposite of a sign of life, and refreshing on those
     would keep the supervisor quiet through an error storm. */
  r.onerror = ev=>{
    if(ev.error==='not-allowed' || ev.error==='service-not-allowed'){
      showErr('Mikrofonen blockerades. Tillåt åtkomst och försök igen.');
      return;
    }
    if(ev.error==='no-speech'){ S.recSeenAt = performance.now(); return; }
    /* The microphone can be taken away mid-session — a call arriving, another
       app claiming it. That session is over and no onend need follow, so mark it
       dead and let the supervisor rebuild instead of sitting there looking
       live. */
    if(ev.error==='audio-capture'){ S.recLive = false; return; }
    /* The app starts without a network now that it can be installed, but
       Chrome's recognizer transcribes server-side and simply fails. Say so
       rather than letting the cursor sit still for no visible reason. */
    if(ev.error==='network') setHint('Taligenkänningen behöver internet just nu.', true);
  };
  /* Chrome ends the session on its own during silence. start() throws if
     called too soon after onend, and a swallowed exception there kills
     recognition permanently — hence a few retries. */
  r.onend = ()=>{
    S.recLive = false;
    if(!S.running) return;
    const retry = n=>{
      if(!S.running || rec !== r) return;
      try{ r.start(); }
      catch(e){
        if(n>0){ setTimeout(()=>retry(n-1), 160); return; }
        /* Out of retries this instance is dead for good, and S.running stays
           true — the app would look live while being deaf. Rebuild from
           scratch instead of giving up silently. */
        resetRecognition();
      }
    };
    retry(6);
  };
  return r;
}

/* Every route to a deaf session is silent, and until now every route out of one
   could give up. start() can return without the session ever beginning; the
   events that would say so are droppable; and the retry chains both here and in
   onend stop after a second or two, leaving S.running true with nothing
   listening. The only recovery left was the rescue in tick(), which needs the
   child to keep reading loudly into a dead microphone for twice the help delay
   before it notices — and it reads the level meter, which no longer has
   automatic gain behind it.

   So a supervisor on its own clock. It never gives up, because giving up is the
   failure it exists to prevent. Liveness is any sign of life from the recognizer,
   not just the flag: if results are arriving it stays out of the way whatever the
   flags say. */
let recWatch = null;
let recNudgedAt = 0, recRebuiltAt = 0;

function renderRec(){
  const el = $('roRec');
  if(el) el.textContent = S.recStarts + '/' + S.recNudges + '/' + S.recRebuilds;
}

function watchRecognition(){
  clearInterval(recWatch);
  S.recSeenAt = recNudgedAt = recRebuiltAt = performance.now();
  recWatch = setInterval(()=>{
    if(!S.running || S.speaking) return;   // muted on purpose while the app talks
    /* The whole supervisor rests on being told when a session begins, and a
       browser that never says so would look permanently dead to it — leaving it
       to nudge and rebuild for ever, renegotiating the audio session every time.
       That is not a hypothetical: it is what broke listening on iOS while macOS
       was fine. So the signal is only trusted once it has been seen to work at
       least once. Where it never arrives, the app is left alone, and the manual
       restart button remains the way back. */
    if(!S.recStarts) return;
    const now = performance.now();
    /* recLive is a claim, not proof: onend is droppable, and a session that
       died without one used to look live for ever — the supervisor refreshed
       the liveness clock from the flag and never stepped in, which is exactly
       the deafness it exists to end. So the clock is only refreshed by real
       events, and the flag merely buys a longer grace: a healthy session shows
       some sign of life — results, silence-cycling, a no-speech error — well
       inside twenty seconds. */
    if(now - S.recSeenAt < (S.recLive ? 20000 : 8000)) return;

    /* Two steps, and the order matters more than it looks. Rebuilding the
       recognizer starts a new capture, and on iOS a new capture renegotiates the
       whole audio session — so a supervisor that reached for the teardown every
       few seconds would flip the audio profile back and forth and leave the app
       unable to speak at all. Which is exactly what it did.

       So: nudge the existing instance first, which costs nothing, and tear down
       only if that has not helped either. And at most once a minute, because a
       recognizer that cannot be revived will not be revived by trying harder. */
    if(now - recNudgedAt > 8000 && rec){
      recNudgedAt = now;
      S.recNudges++; renderRec();
      try{ rec.start(); }catch(e){}
      return;
    }
    if(now - recRebuiltAt < 60000) return;
    recNudgedAt = recRebuiltAt = now;
    S.recSeenAt = now;
    S.recRebuilds++; renderRec();
    resetRecognition();
  }, 2500);
}

function unwatchRecognition(){
  clearInterval(recWatch);
  recWatch = null;
}

/* Speech recognition can wedge itself in states we can't detect or undo —
   the retry loop in onend can also give up for good after ~1 s of failures.
   The reset button is the manual escape hatch: throw the whole recognizer
   instance away and build a fresh one. Reading position and score are kept. */
function resetRecognition(){
  S.ignoreUntil = performance.now() + 1200;
  S.recLive = false;
  if(rec){
    try{ rec.onend = null; rec.stop(); }catch(e){}  // detach onend so the old instance can't restart itself
    rec = null;
  }
  S.onsetAt = null;
  S.hypConsumed = 0;
  S.hypLen = 0;
  wasLoud = false;
  $('roHyp').textContent = '—';
  $('roHeard').textContent = '—';
  if(!S.running) return;
  rec = buildRecognizer();
  if(!rec) return;
  startRec(10);
  armHoldoff();
}

/* The previous session may still be closing, in which case start() throws —
   retry a few times rather than swallowing the one attempt. If these run out,
   the supervisor comes back around; it used to end silently here, with the app
   deaf for the rest of the session. */
function startRec(tries){
  if(!S.running || !rec) return;
  try{ rec.start(); }
  catch(e){ if(tries > 0) setTimeout(()=>startRec(tries-1), 200); }
}

/* iOS does not reliably hand a home-screen web app the speech recogniser. In
   Safari it works; installed on the home screen it often works once and then
   stops until the phone is restarted — a WebKit limitation, reported for years.
   Nothing is raised when it happens: no error, no events, just silence. So the
   silence is the signal. Saying so is the whole fix available to us; a parent
   staring at an app that has stopped hearing their child deserves better than a
   mystery. */
let recDeafTimer = null;

function watchForMuteness(){
  clearTimeout(recDeafTimer);
  if(S.saidDeaf || detectOS() !== 'ios' || !isInstalled()) return;
  recDeafTimer = setTimeout(()=>{
    if(!S.running || S.recStarts || S.recLive) return;   // it did start after all
    S.saidDeaf = true;
    setHint('Appen hör inget här. iPhone ger inte hemskärmsappen taligenkänning ' +
            '— öppna läskompis i Safari i stället.', true);
  }, 7000);
}

/* ================= start / stop ================= */
async function start(){
  /* S.running is only set once the microphone is granted, so without this
     guard a second press during the permission prompt re-enters start()
     instead of toggling: the microphone gets requested twice (leaking the
     losing stream) and the intro is spoken twice. */
  if(S.starting) return;
  S.starting = true;
  try{
    piperUnlock();   // synchronously, while the tap is still ours
    /* Speak BEFORE any await: iOS home-screen web apps (standalone mode) only
       allow the first speechSynthesis.speak() synchronously inside the user
       gesture — after awaiting the microphone it is silently blocked. */
    setHint('Läs högt, jag lyssnar.');
    speak('Läs högt, jag lyssnar.', 'phrase');
    const ok = await ensureAudio();
    if(!ok) return;
    if(!rec) rec = buildRecognizer();
    if(!rec) return;
    S.running=true;
    S.lats=[];
    watchRecognition();
    watchForMuteness();
    const p = profile();
    if(p){ p.sessions = (p.sessions||0) + 1; saveSoon(); }
    // a finished stretch is over: this press starts the next one from zero
    if(S.targetDone){ S.timeMs = 0; S.targetDone = false; }
    S.runSince = performance.now();
    startClock();
    startRec(10);
    $('startBtn').classList.remove('primary');
    $('startBtn').classList.add('live');
    setIcons();
    renderSentence(); renderTrack();
    armHoldoff();
  } finally {
    S.starting = false;
  }
}

/* Silence both engines and retire the current turn. A cancelled utterance's end
   event may never arrive, and the half-duplex gate it was going to lift would
   then keep the microphone shut for the rest of the session. */
function hush(){
  if(window.speechSynthesis) speechSynthesis.cancel();
  try{ piperPlayer.pause(); }catch(e){}
  S.speakSeq++;
  clearTimeout(S.speakTimer);
  S.speaking = false;
}

function stop(){
  S.running=false;
  hush();          // pausing must stop the voice too, mid-word if need be
  unwatchRecognition();
  clearTimeout(recDeafTimer);
  bankTime();      // before remember(), so the profile total includes this stretch
  stopClock();
  remember();
  clearTimeout(S.holdTimer);
  clearTimeout(S.finishTimer);
  if(rec){ try{ rec.stop(); }catch(e){} }
  if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
  if(audioCtx && audioCtx.state === 'running') audioCtx.suspend().catch(()=>{});
  wasLoud=false; S.onsetAt=null;
  $('lvl').style.width='0%';
  $('startBtn').classList.add('primary');
  $('startBtn').classList.remove('live');
  setIcons();
  renderSentence(); renderTrack();
}

function showErr(msg){
  const e=$('err'); e.textContent=msg; e.classList.add('show');
  showTab('text');
  $('sheet').classList.add('open');
}

/* ================= settings ================= */
function selectPreset(k){
  $('txt').value = PRESETS[k].join('\n');
  applyText();
}

function buildPresets(){
  const box=$('presets');
  Object.keys(PRESETS).forEach(k=>{
    const b=document.createElement('button');
    b.className='chip';
    b.innerHTML = k + ' <em>' + PRESETS[k].length + '</em>';
    b.onclick=()=>{ selectPreset(k); };
    box.appendChild(b);
  });
}

/* The same texts as quick buttons to the left of the reading area, so the
   text can be switched without opening the settings. */
function buildSide(){
  const side=$('side');
  const l=document.createElement('div');
  l.className='slabel';
  l.textContent='Texter';
  side.appendChild(l);
  Object.keys(PRESETS).forEach(k=>{
    const b=document.createElement('button');
    b.className='sbtn';
    b.textContent=k;
    b.dataset.preset=k;
    b.onclick=()=>{ selectPreset(k); };
    side.appendChild(b);
  });
}

function markActivePreset(){
  const cur = S.lines.join('\n');
  document.querySelectorAll('.sbtn').forEach(b=>{
    b.classList.toggle('active', PRESETS[b.dataset.preset].join('\n')===cur);
  });
}

/* Called on every way of closing the settings sheet, so it must be a no-op
   when the text is untouched: otherwise adjusting the volume — or dismissing
   an error — would throw the reading position back to the first sentence and
   silently abort a hard-word review. */
function applyText(){
  const lines = readableLines($('txt').value.split('\n'));
  if(!lines.length) return;
  const same = S.reviewing
    ? (S.source && lines.join('\n') === S.source.join('\n'))
    : lines.join('\n') === S.lines.join('\n');
  if(same) return;
  S.lines=lines; S.line=0;
  S.source=null; S.reviewing=false;   // a new text earns a fresh review
  S.hard.clear();
  $('roHard').textContent = 0;
  loadLine();
  markActivePreset();
}

/* The browser only exposes the voices the system provides — plus, in Chrome
   and Edge, the browser's own network voices. Which ones are available and
   where they are installed differs per platform; VOICE_HELP holds the
   per-system instructions shown next to this list. */
let allVoices = [];
/* The poller's own budget. Reset only where the list is deliberately re-read —
   see refreshVoices() — never by the callers, who used to each remember to. */
let voiceTries = 0;

/* Apple ships the same voice in several qualities under one and the same name:
   the list can hold three entries all called "Alva". The name therefore cannot
   address a voice — keying the options by it made every "Alva" resolve to the
   first match, which is the compact one, so a downloaded premium voice was
   unreachable even when the browser did expose it. voiceURI is unique per voice
   and, on Apple platforms, also spells out which quality it is. */
const voiceKey = v => v.voiceURI || v.name;

const QUALITY = [
  [/premium/,  'Premium'],
  [/enhanced/, 'Enhanced'],
  [/siri/,     'Siri'],
  [/compact/,  'Kompakt']
];
function voiceQuality(v){
  const u = (v.voiceURI || '').toLowerCase();
  const hit = QUALITY.find(q => q[0].test(u));
  return hit ? hit[1] : '';
}
/* Best first, so the good voice is the one picked by default on a device that
   has both. Unranked voices (everything outside Apple's naming) sort in the
   middle rather than last — a Google or Microsoft voice beats a compact one. */
const qRank = v => ({Premium:0, Enhanced:1, Siri:2, Kompakt:4})[voiceQuality(v)] ?? 3;

/* Last in the list, so nothing changes for anyone who does not go looking. The
   size belongs in the label: it is the one thing worth knowing before tapping. */
function addPiperGroup(sel){
  const g = document.createElement('optgroup');
  g.label = 'Neural röst — laddas ner en gång';
  PIPER.forEach(v =>{
    const o = document.createElement('option');
    o.value = PIPER_KEY + v.id;
    o.textContent = v.name + '  ·  ' + LANG.tag + '  ·  ' + v.mb + ' MB';
    g.appendChild(o);
  });
  sel.appendChild(g);
}

/* An explicit re-read: the adult opened the settings, switched profile, or came
   back from the system settings having downloaded a voice. Any of those deserves
   a fresh polling budget; loadVoices() on its own does not. */
function refreshVoices(){
  voiceTries = 0;
  loadVoices();
}

function loadVoices(){
  const sel = $('voice');
  allVoices = speechSynthesis.getVoices();
  if(!allVoices.length){
    /* Chrome fills the list asynchronously and calls back through
       onvoiceschanged — but Safari, especially in a home-screen web app, can
       leave the list empty without ever firing it. Poll a few times before
       giving up; the list can also stay empty for good. */
    $('voiceInfo').textContent = 'Ingen röst hittad ännu — så här installerar du en:';
    /* The neural voice needs no system voice behind it, and a device with none at
       all is precisely where it is worth the most — so it goes into the list even
       here, rather than being unreachable. */
    sel.innerHTML = '';
    addPiperGroup(sel);
    if(isPiperKey(S.voiceURI)) sel.value = S.voiceURI;
    if(voiceTries < 12){ voiceTries++; setTimeout(loadVoices, 250); }
    return;
  }
  voiceTries = 0;

  const lang = v => (v.lang||'').replace('_','-');
  const inLang = v => lang(v).toLowerCase().indexOf(LANG.prefix) === 0;
  const mine  = allVoices.filter(inLang)
                         .sort((a,b)=> qRank(a)-qRank(b) || a.name.localeCompare(b.name, LANG.prefix));
  const other = allVoices.filter(v=> !inLang(v));

  const wantURI  = S.voiceURI  || (S.voice && voiceKey(S.voice));
  const wantName = S.voiceName || (S.voice && S.voice.name);
  sel.innerHTML = '';

  const addGroup = (label, list) => {
    if(!list.length) return;
    const g = document.createElement('optgroup');
    g.label = label;
    list.forEach(v=>{
      const o = document.createElement('option');
      o.value = voiceKey(v);
      const q = voiceQuality(v);
      o.textContent = v.name + '  ·  ' + lang(v) +
                      (q ? '  ·  ' + q : '') +
                      (v.localService ? '' : '  ·  nät');
      g.appendChild(o);
    });
    sel.appendChild(g);
  };

  addGroup(LANG.name + ' (' + mine.length + ')', mine);
  /* Other languages only when there is nothing in the reading language at all —
     the emergency the label names, since without any voice the app has nothing
     to speak with. */
  if(!mine.length) addGroup('Övriga språk — nödlösning', other);
  addPiperGroup(sel);

  /* Chosen from what the list actually offers, not from everything installed:
     picking a voice the picker does not show would leave the control blank.

     Fall back silently when the remembered voice isn't installed here, but keep
     S.voiceName and S.voiceURI untouched: plugging the same profile into a
     device that does have the voice should bring it back. The URI is tried
     first since it is what actually identifies a voice; the name is the
     cross-device fallback, since URIs differ between platforms. */
  const shown = mine.length ? mine : other;
  const pick = shown.find(v=> voiceKey(v)===wantURI)
            || shown.find(v=> v.name===wantName)
            || shown[0];
  /* S.voice stays a system voice even while a neural one is chosen — that is
     what makes it the fallback the neural path drops back to. */
  S.voice = pick;
  sel.value = isPiperKey(S.voiceURI) ? S.voiceURI : voiceKey(pick);

  const best = mine.length ? voiceQuality(mine[0]) : '';
  $('voiceInfo').textContent = mine.length > 1
    ? mine.length + ' svenska röster hittade' +
      (best ? ' — bäst är ' + mine[0].name + ' (' + best + ').' : '.')
    : mine.length === 1
      ? 'Bara en svensk röst hittad — så här får du fler:'
      : 'Ingen svensk röst hittad — så här installerar du en:';

  renderVoiceDump();
}

function onVoicePicked(){
  const sel = $('voice');
  piperUnlock();                       // still inside the gesture
  if(isPiperKey(sel.value)){
    const id = piperIdOf(sel.value);
    const meta = PIPER.find(v => v.id === id);
    S.voiceName = meta ? meta.name : id;
    S.voiceURI  = sel.value;
    remember();
    /* Picked deliberately, here, now — the one place a download may start. */
    piperEnsure(id, true).then(()=>{ if(piper.state === 'ready') testVoice(); });
    return;
  }
  piperOff();
  S.voice = allVoices.find(v=> voiceKey(v)===sel.value) || null;
  S.voiceName = S.voice ? S.voice.name : null;
  S.voiceURI  = S.voice ? voiceKey(S.voice) : null;
  remember();
  testVoice();
}

/* When the picker and the system settings disagree about which voices exist,
   this is what settles it: exactly what getVoices() handed over, unfiltered and
   unsorted. On iOS the answer is usually that the downloaded voice was never in
   it — see the note under the list. */
function renderVoiceDump(){
  const esc = t => String(t).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]);
  $('voiceDump').innerHTML = allVoices.length
    ? allVoices.map(v =>
        '<div>' + esc(v.name) + ' · ' + esc(v.lang || '?') +
        ' · ' + (v.localService ? 'lokal' : 'nät') +
        ' · ' + esc(v.voiceURI || '—') + '</div>').join('')
    : '<div>Listan är tom.</div>';
}

function testVoice(){
  piperUnlock();
  speak('Hej! Katten satt på mattan och tittade ut genom fönstret.', 'phrase');
}


/* ================= voices: how to get better ones ================= */
/* The browser only exposes what the system (or the browser itself) provides,
   and every platform hides that behind a different menu. Paths checked against
   Apple's, Microsoft's and Google's own documentation in augusti 2026. Apple
   renamed the menu from "Talat innehåll" to "Uppläsning och tal" in macOS 26
   and iOS 26, so both names are given.

   iOS is the exception with no path at all: WebKit hands a page only the
   pre-installed voices, never a downloaded one, which Apple confirms as intended
   (developer forums, thread 723503). Hence the neural voice above. */
const VOICE_HELP = {
  mac: {
    name: 'macOS',
    path: 'Systeminställningar › Hjälpmedel › Uppläsning och tal › Systemröst › Hantera röster…',
    body: 'Välj Svenska och ladda ner <b>Alva (Premium)</b> — gratis, och klart bäst av de svenska. Menyn hette <b>Talat innehåll</b> före macOS 26.',
    open: 'x-apple.systempreferences:com.apple.Accessibility-Settings.extension',
    openLabel: 'Öppna Hjälpmedel'
  },
  ios: {
    name: 'iPhone och iPad',
    path: 'Ingen väg dit',
    body: 'Att ladda ner <b>Alva (Premium)</b> hjälper inte: iOS ger webbsidor bara de röster som följde med systemet, och det gäller alla webbläsare på iPhone. Här är den neurala rösten ovan alternativet.'
  },
  win: {
    name: 'Windows',
    path: 'Inställningar › Tid och språk › Tal › Hantera röster › Lägg till röster',
    body: 'Windows enda svenska systemröst heter <b>Microsoft Bengt</b>. <b>Microsoft Edge</b> är genvägen till något bättre: dess svenska neuronröster dyker upp i listan märkta <b>Online (Natural)</b>, utan installation.',
    open: 'ms-settings:speech',
    openLabel: 'Öppna röstinställningarna'
  },
  android: {
    name: 'Android',
    path: 'Inställningar › Tillgänglighet › Text till tal › kugghjulet vid motorn › Installera röstdata › Svenska',
    body: 'Motorn heter <b>Taligenkänning och talsyntes från Google</b>, och ligger på vissa telefoner under Inställningar › System › Språk och inmatning. Starta om webbläsaren efteråt.',
    manual: 'Android släpper inte in webbsidor i systeminställningarna — den biten får du gå själv.'
  },
  cros: {
    name: 'ChromeOS',
    path: 'Inställningar › Tillgänglighet › Text till tal › Röstinställningar för Text till tal',
    body: 'Välj en svensk röst och slå på <b>Använd en naturlig röst när enheten är online</b>.',
    manual: 'Webbsidor får inte länka till chrome://-sidor — den biten får du gå själv.'
  },
  other: {
    name: 'Linux och övriga',
    path: 'Systemets talsyntes — speech-dispatcher med espeak-ng eller mbrola',
    body: 'De inbyggda rösterna låter ofta robotaktiga. Chrome har i stället Googles nätröster — <b>Google svenska</b> i listan — som låter bättre och inte kräver installation.'
  }
};

/* iPadOS reports itself as a Mac; the touch points are what give it away. */
function detectOS(){
  const ua = navigator.userAgent || '';
  const plat = navigator.platform || '';
  if(/iPhone|iPad|iPod/.test(ua) || (plat === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if(/Android/.test(ua)) return 'android';
  if(/CrOS/.test(ua)) return 'cros';
  if(/Mac/.test(ua) || plat.indexOf('Mac') === 0) return 'mac';
  if(/Win/.test(ua) || plat.indexOf('Win') === 0) return 'win';
  return 'other';
}

/* Order matters: Edge and Opera both carry "Chrome" in the string, and every
   Chromium browser carries "Safari". */
function detectBrowser(){
  const ua = navigator.userAgent || '';
  if(/Edg\//.test(ua)) return 'edge';
  if(/OPR\//.test(ua)) return 'chrome';
  if(/Firefox\//.test(ua)) return 'firefox';
  if(/Chrome\//.test(ua)) return 'chrome';
  if(/Safari\//.test(ua)) return 'safari';
  return 'other';
}

const BROWSER_NOTE = {
  chrome:  'Chrome lägger till Googles nätröster utöver systemets — märkta <b>nät</b>, kräver internet, ingen installation.',
  edge:    'Edge har egna svenska neuronröster, märkta <b>nät</b> och <b>Online (Natural)</b>. Ingen installation.',
  safari:  'Safari visar bara systemets röster. På Mac även nedladdade, efter en omladdning; på iPhone och iPad enbart de förinstallerade.',
  firefox: 'Firefox saknar taligenkänning, så appen kan inte lyssna här. Uppläsningen fungerar.',
  other:   'Vilka röster som syns beror på webbläsaren: Chrome och Edge lägger till nätröster, Safari bara systemets.'
};

function renderVoiceHelp(){
  const os = detectOS();
  /* Only two platforms let a web page open the right settings page: macOS
     through x-apple.systempreferences: and Windows through the documented
     ms-settings: scheme. iOS blocks it (App-Prefs is private API), Android
     requires the target activity to be BROWSABLE and Settings is not, and
     chrome:// pages can't be linked at all. Where it can't work the written
     path is all there is, and saying so beats a button that does nothing. */
  const card = h =>
    '<h4>Fler röster — ' + h.name + '</h4>' +
    '<p class="path">' + h.path + '</p>' +
    '<p>' + h.body + '</p>' +
    (h.open
      ? '<p class="openrow"><a class="tbtn" href="' + h.open + '">' + h.openLabel + '</a>' +
        '<span>Webbläsaren frågar först.</span></p>'
      : (h.manual ? '<p class="manual">' + h.manual + '</p>' : ''));
  $('voiceBrowser').innerHTML = BROWSER_NOTE[detectBrowser()] || BROWSER_NOTE.other;
  $('voiceHelp').innerHTML = card(VOICE_HELP[os] || VOICE_HELP.other);
  $('voiceAll').innerHTML = Object.keys(VOICE_HELP)
    .filter(k => k !== os)
    .map(k => '<div class="note">' + card(VOICE_HELP[k]) + '</div>')
    .join('');
}

/* On iPhone the meter is off by default, and the note says why rather than
   leaving a missing bar to look like a fault. Elsewhere it explains that the
   microphone is handed back on backgrounding, which is why the permission is
   asked for again on the way in. */
const MIC_NOTE = {
  ios: 'Nivåmätaren är av här, och det är med flit: så fort en webbsida spelar in lägger iOS om ljudet till lilla högtalaren, och en webbsida får inte begära den stora. Taligenkänningen spelar in för sig och påverkas inte — barnet hörs precis lika bra, du ser bara ingen stapel. Slår du på den flyttar ljudet.',
  other: 'Mätaren visar att appen hör något. Den släpps så fort du växlar bort från appen, och begärs igen när du trycker på play.'
};

function renderMicNote(){
  $('micNote').innerHTML = MIC_NOTE[detectOS()] || MIC_NOTE.other;
  $('micField').hidden = false;
}

/* There is no build step to stamp a version into, and a constant bumped by
   hand is a constant that gets forgotten. The page's own Last-Modified is the
   deploy time exactly, needs no maintenance, and rides along in the cached copy
   — so it stays truthful offline, where knowing whether the update actually
   landed matters most. */
function renderBuild(){
  const raw = document.lastModified;
  const d = new Date(raw);
  const stamp = isFinite(d) ? d.toLocaleString('sv-SE', {dateStyle:'short', timeStyle:'short'}) : raw;
  $('build').textContent = 'Version ' + stamp;

  /* The stamp reads the page's own Last-Modified, so a stale app.js behind a
     fresh index.html would look perfectly current — and that is exactly the
     shape of a caching problem worth knowing about. Ask the server what it
     thinks app.js's date is, bypassing every cache, and say so when the two
     disagree. Best-effort: offline this simply fails and the stamp stands. */
  fetch('./app.js', { method:'HEAD', cache:'no-store' }).then(res =>{
    const lm = res && res.headers.get('last-modified');
    if(!lm) return;
    const code = new Date(lm), page = new Date(raw);
    if(!isFinite(code) || !isFinite(page)) return;
    if(Math.abs(code - page) < 90000) return;         // same deploy, near enough
    $('build').textContent = 'Version ' + stamp + ' · koden är från ' +
      code.toLocaleString('sv-SE', {dateStyle:'short', timeStyle:'short'}) +
      ' — ladda om';
  }).catch(()=>{});
}

/* iPhone pays for the meter with the loudspeaker; nothing else does. */
function defaultMeter(){ return detectOS() !== 'ios'; }

/* ================= profiles + local storage ================= */
/* Everything the app remembers lives in one localStorage key on this device.
   No account, no backend, nothing leaves the browser — which also means the
   browser is free to throw it away, hence the backup field in the Barn tab.

   One profile per child: settings, text, reading position, score, and the
   bank of words that have been hard over time. S.hard stays the per-run tally
   that drives the review at the end of a text; the bank is the long game. */
const STORE_KEY = 'laskompis:v1';
const AVATARS = ['🦊','🐻','🐼','🐸','🦉','🐙','🦄','🐝','🐢','🐬','🚀','⭐'];
const MAX_KIDS = 12;
const BANK_MAX = 200;   // keeps the saved blob small and the word list readable

let store = null;
let saveTimer = null;
let pendingAvatar = AVATARS[0];

const clampNum = (v, lo, hi, dflt) =>
  (typeof v === 'number' && isFinite(v)) ? Math.min(hi, Math.max(lo, v)) : dflt;

function newProfile(name, avatar){
  return {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    name: (name || 'Barn').slice(0,16),
    avatar: AVATARS.includes(avatar) ? avatar : AVATARS[0],
    text: PRESETS['Meningar'].join('\n'),
    line: 0, score: 0, read: 0, sessions: 0, time: 0,
    hard: {},
    settings: {
      size:52, holdoff:8000, strict:'normal', target:0,
      rate:0.8, voice:null, voiceURI:null, sndOk:false, sndFail:false, vol:0.85,
      meter: defaultMeter()
    }
  };
}

/* Nothing read back is trusted: the blob is editable by hand and comes back
   in through the backup field. Every value is clamped or replaced by the
   default rather than believed. */
function sanitize(raw){
  if(!raw || typeof raw !== 'object' || !Array.isArray(raw.profiles)) return null;
  const profiles = raw.profiles.map(p=>{
    if(!p || typeof p !== 'object') return null;
    const o = newProfile(typeof p.name === 'string' ? p.name : 'Barn', p.avatar);
    if(typeof p.id === 'string' && p.id) o.id = p.id.slice(0,40);
    if(typeof p.text === 'string' && p.text.trim()) o.text = p.text.slice(0,20000);
    o.line     = clampNum(p.line, 0, 9999, 0);
    o.score    = clampNum(p.score, 0, 1e9, 0);
    o.read     = clampNum(p.read, 0, 1e9, 0);
    o.sessions = clampNum(p.sessions, 0, 1e9, 0);
    o.time     = clampNum(p.time, 0, 1e11, 0);   // lifetime reading time, ms
    if(p.hard && typeof p.hard === 'object' && !Array.isArray(p.hard)){
      // keep the most frequent words, the same way noteHard trims the bank —
      // taking whichever keys happened to come first would drop the words that
      // matter most from an oversized backup
      Object.keys(p.hard)
        .filter(k => k.length && k.length < 40 && clampNum(p.hard[k], 1, 1e6, 0))
        .sort((a,b) => clampNum(p.hard[b],1,1e6,0) - clampNum(p.hard[a],1,1e6,0))
        .slice(0, BANK_MAX)
        .forEach(k=>{ o.hard[k] = clampNum(p.hard[k], 1, 1e6, 0); });
    }
    const st = (p.settings && typeof p.settings === 'object') ? p.settings : {};
    o.settings = {
      size:    clampNum(st.size, 28, 86, 52),
      holdoff: clampNum(st.holdoff, 1000, 20000, 8000),
      strict:  STRICTNESS[st.strict] ? st.strict : 'normal',
      // only an offered length, so a hand-edited value can't set an odd goal
      target:  TARGETS.some(t=>t[1]===st.target) ? st.target : 0,
      rate:    clampNum(st.rate, 0.6, 1.6, 0.8),
      voice:   typeof st.voice === 'string' ? st.voice.slice(0,90) : null,
      /* The name alone can't tell Alva (Premium) from Alva (Compact) — Apple
         ships both under one name. The URI is what actually addresses a voice. */
      voiceURI: typeof st.voiceURI === 'string' ? st.voiceURI.slice(0,160) : null,
      sndOk:   !!st.sndOk,
      sndFail: !!st.sndFail,
      vol:     clampNum(st.vol, 0, 1, 0.85),
      meter:   typeof st.meter === 'boolean' ? st.meter : defaultMeter()
    };
    return o;
  }).filter(Boolean).slice(0, MAX_KIDS);
  if(!profiles.length) return null;
  /* Ids address a profile, so duplicates would make every copy but the first
     unreachable — switching to one would silently land on the other. A
     hand-edited backup is the likely source, so re-id rather than drop. */
  const seen = new Set();
  profiles.forEach(p=>{
    while(seen.has(p.id)) p.id = 'p' + Math.random().toString(36).slice(2,10);
    seen.add(p.id);
  });
  const active = profiles.some(p=>p.id===raw.active) ? raw.active : profiles[0].id;
  return { v:1, active, profiles };
}

/* Storage can be missing or full — private windows, disabled cookies, a
   locked-down school device. The app then simply runs without memory
   instead of breaking. */
function saveNow(){
  clearTimeout(saveTimer); saveTimer = null;
  if(!store) return;
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(store)); }catch(e){}
}
/* Sliders fire on every pixel — coalesce the writes. */
function saveSoon(){
  if(saveTimer) return;
  saveTimer = setTimeout(saveNow, 500);
}

function profile(){
  if(!store) return null;
  return store.profiles.find(p=>p.id===store.active) || store.profiles[0] || null;
}

/* Copies the live state onto the active profile. Called from anywhere that
   changes something worth keeping; the write itself is debounced. */
function remember(){
  const p = profile(); if(!p) return;
  p.settings = {
    size:S.size, holdoff:S.holdoff, strict:S.strict, target:S.target, rate:S.rate,
    voice:S.voiceName, voiceURI:S.voiceURI, sndOk:S.sndOk, sndFail:S.sndFail,
    vol:S.vol, meter:S.meter
  };
  /* During the hard-word review S.lines holds the review words, not the text —
     saving then would replace the child's reading text with six loose words. */
  if(!S.reviewing){ p.text = S.lines.join('\n'); p.line = S.line; }
  p.score = S.score;
  saveSoon();
}

function applyProfile(p){
  const st = p.settings;
  setSize(st.size); setHold(st.holdoff); setRate(st.rate); setVol(st.vol);
  setStrict(st.strict); setSndOk(st.sndOk); setSndFail(st.sndFail);
  setMeter(st.meter);
  setTarget(st.target || 0);
  /* The clock measures one child's stretch, so it starts over on a swap —
     the lifetime total lives on the profile and is shown in the Barn tab. */
  S.timeMs = 0; S.runSince = null; S.targetDone = false;
  stopClock();
  S.voiceName = st.voice;
  S.voiceURI  = st.voiceURI || null;
  S.voice = null;
  if(window.speechSynthesis) refreshVoices();
  piperResume();

  S.reviewing = false; S.source = null;
  S.hard.clear(); $('roHard').textContent = 0;
  S.score = p.score; S.misses = 0; S.lats = [];
  $('roLat').textContent = '–'; $('roMed').textContent = '–';

  const lines = readableLines(p.text.split('\n'));
  S.lines = lines.length ? lines : PRESETS['Meningar'].slice();
  S.line  = Math.min(p.line, S.lines.length-1);
  $('txt').value = S.lines.join('\n');
  loadLine();
  markActivePreset();
  renderProfileBar();
  renderKids();
}

function switchProfile(id){
  if(!store || id === store.active) return;
  if(S.running) stop();
  remember();                 // flush the outgoing child before the swap
  store.active = id;
  saveNow();
  const p = profile();
  applyProfile(p);
  setHint('Hej ' + p.name + '! Tryck på Börja läsa när du är redo.');
}

/* ================= profile UI ================= */
function renderProfileBar(){
  const p = profile(); if(!p) return;
  $('profAv').textContent = p.avatar;
  $('profNm').textContent = p.name;
}

function renderKids(){
  const box = $('kids');
  box.innerHTML = '';
  if(!store) return;
  store.profiles.forEach(p=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kid' + (p.id===store.active ? ' active' : '');
    const av = document.createElement('span');
    av.className = 'av';
    av.textContent = p.avatar;
    const nm = document.createElement('span');
    nm.textContent = p.name;         // textContent: the name is typed by hand
    b.appendChild(av); b.appendChild(nm);
    b.onclick = ()=> switchProfile(p.id);
    box.appendChild(b);
  });
  renderKidStats();
}

function renderKidStats(){
  const p = profile(); if(!p) return;
  $('kidName').textContent = p.avatar + ' ' + p.name;

  const words = Object.keys(p.hard);
  const box = $('kidStats');
  box.innerHTML = '';
  const mins = Math.round((p.time||0)/60000);
  [['Poäng',p.score],['Meningar',p.read],['Lässtunder',p.sessions],
   ['Lästid', mins < 60 ? mins+' min' : Math.floor(mins/60)+' h '+(mins%60)+' min'],
   ['Svåra ord',words.length]]
    .forEach(([k,v])=>{
      const d = document.createElement('div');
      d.className = 'stat';
      d.appendChild(document.createTextNode(k));
      const b = document.createElement('b');
      b.textContent = v;
      d.appendChild(b);
      box.appendChild(d);
    });

  const wb = $('kidWords');
  wb.innerHTML = '';
  words.sort((a,b)=>p.hard[b]-p.hard[a]).slice(0,18).forEach(w=>{
    const sp = document.createElement('span');
    sp.textContent = w;
    const n = document.createElement('b');
    n.textContent = p.hard[w];
    sp.appendChild(n);
    wb.appendChild(sp);
  });
}

function buildAvatars(){
  const box = $('avpick');
  box.innerHTML = '';
  AVATARS.forEach(a=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = a;
    b.setAttribute('aria-label', 'Välj figur');
    b.setAttribute('aria-pressed', String(a===pendingAvatar));
    b.onclick = ()=>{ pendingAvatar = a; buildAvatars(); };
    box.appendChild(b);
  });
}

let kidMsgTimer = null;
function kidMsg(text, bad){
  const el = $('kidMsg');
  el.textContent = text;
  el.className = 'msg' + (bad ? ' bad' : '');
  clearTimeout(kidMsgTimer);
  kidMsgTimer = setTimeout(()=>{ el.textContent = ''; }, 7000);
}

/* ================= install as an app ================= */
/* This earns its own place in the Barn tab: an installed app is what keeps
   the saved profiles safe from Safari's habit of clearing storage for sites
   nobody has opened in a week. */
let installPrompt = null;

function isInstalled(){
  return matchMedia('(display-mode: standalone)').matches ||
         matchMedia('(display-mode: fullscreen)').matches ||
         navigator.standalone === true;
}

function renderInstall(){
  const el = $('installNote');
  if(!el) return;

  if(isInstalled()){
    el.innerHTML = '<p>Appen är sparad på enheten. Den startar direkt, tar hela skärmen — och den sparade progressen ligger kvar även efter en läspaus.</p>' +
      (detectOS()==='ios'
        ? '<p><b>Men lyssningen fungerar inte här.</b> iPhone ger inte hemskärmsappen taligenkänning — den brukar fungera första gången och sedan tystna. Öppna läskompis i Safari när barnet ska läsa. Det är Apples begränsning, inget vi kan koda bort.</p>'
        : '');
    return;
  }

  /* Chrome hands us the install prompt; nobody else does. */
  if(installPrompt){
    el.innerHTML =
      '<p>Sparad på enheten startar appen direkt och tar hela skärmen, och progressen skyddas från att webbläsaren rensar lagringen.</p>' +
      '<p class="openrow"><button class="tbtn" id="installBtn">Lägg till på enheten</button></p>';
    $('installBtn').onclick = async ()=>{
      const prompt = installPrompt;
      installPrompt = null;              // the event is single-use
      try{ await prompt.prompt(); await prompt.userChoice; }catch(e){}
      renderInstall();
    };
    return;
  }

  el.innerHTML = detectOS()==='ios'
    ? '<p>Tryck på <b>Dela</b>-ikonen och välj <b>Lägg till på hemskärmen</b>. Det skyddar den sparade progressen, som Safari annars rensar efter ungefär en veckas inaktivitet.</p>' +
      '<p><b>Läs ändå i Safari.</b> iPhone ger inte hemskärmsappen taligenkänning, så appen hör ingenting där. Ha den sparad för progressens skull, och öppna Safari när barnet ska läsa — eller ta en säkerhetskopia nedan i stället.</p>'
    : '<p>Spara appen via webbläsarens meny — <b>Installera app</b> eller <b>Lägg till på hemskärmen</b>. Då startar den direkt och progressen ligger kvar.</p>';
}

window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault();          // keep the browser's own bar out of the child's way
  installPrompt = e;
  renderInstall();
});
window.addEventListener('appinstalled', ()=>{ installPrompt = null; renderInstall(); });

/* The service worker is what makes the app installable and lets it start
   without a network. Best-effort: a failure here must never take the reading
   app down with it. */
if('serviceWorker' in navigator && window.isSecureContext){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}

function initStore(){
  let raw = null;
  try{ raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); }catch(e){}
  store = sanitize(raw);
  if(!store){
    /* First run — a single nameless profile, so the app opens exactly as it
       always has instead of demanding a setup step before anyone can read. */
    const p = newProfile('Barn', AVATARS[0]);
    store = { v:1, active:p.id, profiles:[p] };
    saveNow();
  }
}

/* ================= wiring ================= */
/* A pointer click leaves focus on the button in some browsers, which would
   then swallow the Space shortcut. Keyboard-triggered clicks report detail 0
   and keep their focus, so Tab navigation is unaffected. */
const dropFocus = e => { if(e && e.detail > 0 && e.currentTarget) e.currentTarget.blur(); };

$('startBtn').onclick = e=>{ dropFocus(e); S.running ? stop() : start(); };
$('nextBtn').onclick  = e=>{
  dropFocus(e);
  clearTimeout(S.finishTimer);
  if(S.line < S.lines.length-1){ S.line++; } else { S.line=0; }
  loadLine(); armHoldoff(); setHint('Ny mening. Läs när du vill.');
};
$('sayBtn').onclick = e=>{
  dropFocus(e);
  const w=S.words[S.pos]; if(w) speak(w.raw);
};
const TAB_SUB = {
  text:    'Klistra in läsläxan, en mening per rad.',
  reading: 'Hur texten visas och hur mycket appen släpper igenom.',
  voice:   'Hur appen låter när den läser upp ord och uppmuntran.',
  kids:    'Flera barn på samma enhet, var och en med egna inställningar.'
};

function showTab(name){
  document.querySelectorAll('.tab').forEach(t=>
    t.setAttribute('aria-selected', String(t.dataset.tab===name)));
  document.querySelectorAll('.tabpage').forEach(p=>
    p.classList.toggle('active', p.dataset.page===name));
  $('sheetSub').textContent = TAB_SUB[name] || '';
  $('sheet').querySelector('.cardbody').scrollTop = 0;
  if(name==='voice') refreshVoices();
  if(name==='kids'){ renderKids(); buildAvatars(); renderInstall(); }
}

document.querySelectorAll('.tab').forEach(t=>{
  t.onclick = ()=> showTab(t.dataset.tab);
});

/* One setter per adjustable value, used both by the controls and by the
   restore path. Anything that only lived in an event handler would silently
   fail to come back when a profile is loaded. */
function setSize(v){
  S.size = v;
  document.documentElement.style.setProperty('--read-size', v+'px');
  $('rSize').value = v;
  $('vSize').textContent = v+' px';
}
function setHold(v){
  S.holdoff = v;
  $('rHold').value = v;
  $('vHold').textContent = (v/1000).toFixed(1).replace('.',',')+' s';
}
function setRate(v){
  S.rate = v;
  $('rRate').value = v;
  $('vRate').textContent = v.toFixed(2).replace('.',',');
}
function setVol(v){
  S.vol = v;
  const pct = Math.round(v*100);
  $('rVol').value = pct;
  $('vVol').textContent = pct+' %';
}
function setStrict(v){ S.strict = v; $('strict').value = v; }
function setSndOk(v){ S.sndOk = v; $('cbOk').checked = v; }
function setMeter(v){
  S.meter = v;
  $('cbMeter').checked = v;
  if(!v) releaseMeter();
  else if(S.running) ensureAudio();
}
function setSndFail(v){ S.sndFail = v; $('cbFail').checked = v; }

$('cbMeter').onchange = e=>{ setMeter(e.target.checked); remember(); };
$('cbOk').onchange   = e=>{ setSndOk(e.target.checked); if(S.sndOk) playOk(); remember(); };
$('cbFail').onchange = e=>{ setSndFail(e.target.checked); if(S.sndFail) playFail(); remember(); };
$('rVol').oninput = e=>{ setVol(+e.target.value/100); remember(); };
/* Sound the new level directly rather than through playOk(), which is silent
   while the chime is switched off — the slider must always be audible. */
$('rVol').onchange = ()=>{ tone(1046.5, 0, 0.20, 0.5); };

/* The hint belongs to the manual press only — resetRecognition also runs by
   itself as a recovery path, and announcing that every time would confuse. */
$('resetBtn').onclick = e=>{
  dropFocus(e);
  resetRecognition();
  if(S.running) setHint('Nu lyssnar jag igen.');
};
$('voice').onchange = onVoicePicked;
$('testVoiceBtn').onclick = testVoice;
$('setupBtn').onclick = ()=>{ refreshVoices(); $('sheet').classList.add('open'); };
$('closeBtn').onclick = ()=>{ applyText(); $('sheet').classList.remove('open'); };
$('sheet').onclick = e=>{ if(e.target===$('sheet')){ applyText(); $('sheet').classList.remove('open'); } };

/* ---------- profiles ---------- */
$('profBtn').onclick = ()=>{ showTab('kids'); $('sheet').classList.add('open'); };

$('addKid').onclick = ()=>{
  const name = $('newName').value.trim();
  if(!name){ kidMsg('Skriv ett namn först.', true); $('newName').focus(); return; }
  if(store.profiles.length >= MAX_KIDS){ kidMsg('Fler än ' + MAX_KIDS + ' barn får inte plats.', true); return; }
  if(S.running) stop();
  remember();                      // the child being left keeps its progress
  const p = newProfile(name, pendingAvatar);
  store.profiles.push(p);
  store.active = p.id;
  saveNow();
  applyProfile(p);
  $('newName').value = '';
  // step to the next figure so two children don't end up with the same one
  pendingAvatar = AVATARS[(AVATARS.indexOf(pendingAvatar)+1) % AVATARS.length];
  buildAvatars();
  kidMsg(name + ' är tillagd och vald.');
};

$('newName').onkeydown = e=>{ if(e.key==='Enter'){ e.preventDefault(); $('addKid').click(); } };

$('renameKid').onclick = ()=>{
  const p = profile(); if(!p) return;
  const name = (prompt('Vad heter barnet?', p.name) || '').trim();
  if(!name) return;
  p.name = name.slice(0,16);
  saveNow();
  renderProfileBar(); renderKids();
};

$('delKid').onclick = ()=>{
  const p = profile(); if(!p) return;
  if(store.profiles.length < 2){ kidMsg('Det måste finnas minst ett barn.', true); return; }
  if(!confirm('Ta bort ' + p.name + ' och all sparad progress för barnet?')) return;
  if(S.running) stop();
  store.profiles = store.profiles.filter(x=>x.id!==p.id);
  store.active = store.profiles[0].id;
  saveNow();
  applyProfile(profile());
  kidMsg(p.name + ' är borttagen.');
};

$('clearWords').onclick = ()=>{
  const p = profile(); if(!p) return;
  p.hard = {};
  S.hard.clear();
  $('roHard').textContent = 0;
  saveNow(); renderKidStats();
  kidMsg('Listan över svåra ord är tömd.');
};

$('clearScore').onclick = ()=>{
  const p = profile(); if(!p) return;
  p.score = 0; p.read = 0; p.sessions = 0; p.time = 0;
  S.score = 0;
  resetClock();
  updateReadouts(); saveNow(); renderKidStats();
  kidMsg('Poäng och statistik är nollställda.');
};

/* The only way data leaves the device, and the only way it survives the
   browser deciding to clear its storage: plain text the adult keeps. */
$('exportBtn').onclick = ()=>{
  remember(); saveNow();
  const box = $('backup');
  box.value = JSON.stringify(store);
  box.focus(); box.select();
  kidMsg('Kopiera texten och lägg undan den någonstans.');
};

$('importBtn').onclick = ()=>{
  let raw = null;
  try{ raw = JSON.parse($('backup').value); }catch(e){}
  const next = sanitize(raw);
  if(!next){ kidMsg('Det där gick inte att läsa som en säkerhetskopia.', true); return; }
  if(!confirm('Ersätta alla barn och all progress på den här enheten med kopian?')) return;
  if(S.running) stop();
  store = next;
  saveNow();
  applyProfile(profile());
  kidMsg('Kopian är inläst.');
};

/* A debounced write can still be pending when the tab goes away — on mobile
   the page is often killed outright rather than unloaded. */
/* bankTime first: a tab that is killed rather than unloaded would otherwise
   lose the minutes of the stretch that was still running. */
const flush = ()=>{
  if(S.running){ bankTime(); S.runSince = performance.now(); }
  remember(); saveNow();
};
/* Going away must also hand the microphone back — see releaseAudio(). The
   session is paused rather than kept nominally running: on mobile the page is
   frozen the moment it is backgrounded, so a "running" session would be deaf
   anyway, and coming back needs a user gesture regardless (iOS only lets
   getUserMedia and the first speak() through from inside one). */
const goAway = ()=>{
  if(S.running) stop();          // banks the time and writes the profile
  releaseAudio();
  /* A cancelled utterance's onend may never arrive from a frozen page, and the
     half-duplex gate it was going to lift would then keep the microphone muted
     for the rest of the session. Retire the turn by hand. */
  hush();
  flush();
};
window.addEventListener('pagehide', goAway);
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden){ goAway(); return; }
  /* Back in the foreground: the usual reason for leaving is a trip to the
     system settings to download a voice, and Safari only reveals it to the page
     once the list is re-read. */
  if(window.speechSynthesis) refreshVoices();
});

$('clockBox').onclick = e=>{ dropFocus(e); resetClock(); };

$('rSize').oninput = e=>{ setSize(+e.target.value); remember(); };
$('rHold').oninput = e=>{ setHold(+e.target.value); armHoldoff(); remember(); };
$('rRate').oninput = e=>{ setRate(+e.target.value); remember(); };
$('strict').onchange = e=>{ setStrict(e.target.value); remember(); };

/* Only form controls may swallow the shortcuts. Requiring document.body as the
   target instead would kill them for good once any button had been clicked,
   since focus stays on that button — and Space would re-activate it rather
   than toggling start/pause the way the on-screen hint promises. */
const isTyping = el =>
  !!el && (el.isContentEditable ||
           ['TEXTAREA','INPUT','SELECT','OPTION'].includes(el.tagName));

document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && $('sheet').classList.contains('open')){
    applyText(); $('sheet').classList.remove('open'); return;
  }
  if($('sheet').classList.contains('open')) return;
  if(isTyping(e.target)) return;
  if(e.metaKey || e.ctrlKey || e.altKey) return;
  if(e.code==='Space'){
    // a button reached by Tab keeps its own Space activation — don't hijack it
    if(document.activeElement && document.activeElement.tagName==='BUTTON') return;
    e.preventDefault();          // stops the page from scrolling
    $('startBtn').click();
  }
  else if(e.key==='l' || e.key==='L'){ e.preventDefault(); $('sayBtn').click(); }
  else if(e.key==='ArrowRight'){ e.preventDefault(); $('nextBtn').click(); }
});

/* ================= init ================= */
buildPresets();
buildSide();
buildAvatars();
buildTargets();
setIcons();
renderVoiceHelp();
renderMicNote();
renderBuild();
renderInstall();
initStore();
/* applyProfile() already reads the voice list and brings back a neural voice the
   profile asks for, so neither is repeated here — only the subscription that
   catches Chrome filling the list after the fact. */
applyProfile(profile());   // sets the text, the position, the settings and the voice
if(window.speechSynthesis) speechSynthesis.onvoiceschanged = loadVoices;
