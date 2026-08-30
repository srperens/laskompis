# Tester

Appen har inget byggsteg, och det har inte testerna heller: de startar en egen
server på katalogen ovanför, driver en riktig webbläsare mot den och skriver ut
vad de kontrollerade.

```
cd test
npm install
npx playwright install chromium webkit
npm test                 # allt
npm test -- reading      # bara det som matchar
```

`webkit` är samma motor som Safari på iPhone och är därför den som betyder något
för den här appen. `chromium` används där en riktig mikrofon eller ett fungerande
Origin Private File System behövs — headless WebKit har ingen av dem.

## Vad de täcker

| Fil | Vad det svarar på |
|---|---|
| `reading.mjs` | Läser ett barn framåt genom en text? Poäng, radbyte, felläsning bankad. |
| `review.mjs` | Startar repetitionen av svåra ord, och återställs texten efteråt? |
| `numbers.mjs` | Matchar "tjugo" mot "20", och matchar aldrig "20" mot "30"? Alla tre stränghetsnivåer. |
| `deaf.mjs` | Framkallar den låsning där lyssningen dör tyst. Kommer appen tillbaka av sig själv? |
| `storage.mjs` | Är säkerhetskopian en rundtur utan förluster? Och tål `sanitize` fientlig indata? |
| `kids.mjs` | Profilernas kanter: sista barnet, taket, tomma och långa namn, byte mellan barn. |
| `voices.mjs` | Visas bara svenska röster, och finns nödlösningen kvar på en enhet utan svensk röst? |
| `piper-cache.mjs` | Laddas de neurala rösterna ner, och stannar de 60 MB:en i cachen? |
| `fallback.mjs` | Faller appen tillbaka på systemrösten när den neurala fallerar? |
| `mic.mjs` | Får mikrofonspåret rätt inställningar, och rör sig nivåmätaren? |
| `offline.mjs` | Startar appen utan nät, med koden i separata filer? |
| `text.mjs` | Text som inte är ord: ensamma skiljetecken, rader utan något läsbart, tecken ingen kan säga. Och att paus tystar rösten. |
| `fuzz.mjs` | Hundratals slumpade klick och tangenttryck. Bryts någon invariant? `node fuzz.mjs <seed> <steg>` |

## Att skriva ett nytt

Testerna delar ingen ram med avsikt — var och en står för sig och går att läsa
ovanifrån. Det som återkommer är en attrapp av `SpeechRecognition`, eftersom en
headless webbläsare inte har någon röst att känna igen, och den attrappen måste
vara **kumulativ inom en session**: den riktiga API:et bygger på en växande
resultatlista som appen ankrar sig i, och en attrapp som skickar ett resultat i
taget testar en form appen aldrig möter.

Avsluta med `verdict(ok, detalj)` från `verdict.mjs`. Körarens sammanställning
läser den raden.
