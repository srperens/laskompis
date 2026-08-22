# Läskompis

En webbapp för barn som övar på att läsa högt. Barnet läser en mening ord för ord, appen lyssnar via mikrofonen och flyttar markören framåt när orden läses rätt. Fastnar barnet på ett ord säger appen ordet högt efter en stund. Rätt lästa ord ger poäng och ett pling, och de ord som var svåra repeteras en extra gång på slutet.

**Prova direkt:** https://srperens.github.io/laskompis/

## Så fungerar det

- Klistra in läsläxan under **Text & inställningar** (en mening per rad), eller välj en av de färdiga texterna.
- Tryck på play-knappen och läs högt. Det gula ordet är det som ska läsas.
- Öra-knappen läser upp det aktuella ordet. Du kan också klicka på vilket ord som helst i meningen för att höra det.
- Pil-knappen hoppar till nästa mening.

Under **Läsning** går det att ställa in textstorlek, hur länge appen väntar innan den hjälper till, och hur strikt den bedömer uttalet. Under **Röst** väljs uppläsningsröst, talhastighet och ljudeffekter.

Panelen längst ner visar teknisk mätdata (latens, igenkända ord, svåra ord) — den är till för den vuxne, inte barnet.

## Teknik

Allt är en enda HTML-fil utan beroenden eller byggsteg. Appen använder webbläsarens inbyggda API:er:

- **Web Speech API (SpeechRecognition)** för taligenkänning på svenska. Fungerar i Chrome och Edge; Firefox och Safari saknar stöd.
- **SpeechSynthesis** för uppläsning av ord och uppmuntran. Fler svenska röster kan installeras via systemets talinställningar.
- **Web Audio API** för ljudeffekter och nivåmätaren.

Ordmatchningen görs med en girig token-alignment mot transkriptionen, med Levenshtein-avstånd och konfigurerbar stränghet, så att rimliga uttalsvariationer släpps igenom.

### Om integritet

Chromes taligenkänning skickar ljudet till Googles servrar för transkribering — ljudet behandlas alltså inte enbart lokalt. Inget sparas av appen själv; den har ingen backend och lagrar ingenting.

## Köra lokalt

Mikrofonåtkomst kräver en säker kontext, så servera filen via localhost i stället för att öppna den direkt:

```sh
python3 -m http.server 8000
```

Öppna sedan http://localhost:8000 i Chrome eller Edge.

## Status

Detta är en tidig prototyp (v0). Webbläsarens taligenkänning är byggd för vuxenröster och har märkbar latens — tillräckligt bra för att pröva om samspelet fungerar, inte ett mått på hur bra spårningen kan bli.
