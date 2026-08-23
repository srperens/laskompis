# Läskompis

En webbapp för barn som övar på att läsa högt. Barnet läser en mening ord för ord, appen lyssnar via mikrofonen och flyttar markören framåt när orden läses rätt. Fastnar barnet på ett ord säger appen ordet högt efter en stund. Rätt lästa ord ger poäng och ett pling, och de ord som var svåra repeteras en extra gång på slutet.

**Prova direkt:** https://srperens.github.io/laskompis/

## Så fungerar det

- Välj en av de färdiga texterna i listan till vänster, eller klistra in läsläxan under **Text & inställningar** (en mening per rad).
- Tryck på play-knappen och läs högt. Det gula ordet är det som ska läsas.
- Öra-knappen läser upp det aktuella ordet. Du kan också klicka på vilket ord som helst i meningen för att höra det.
- Pil-knappen hoppar till nästa mening.
- Tangentbord: **mellanslag** = start/paus, **L** = lyssna på ordet, **högerpil** = nästa mening.
- Om markören fastnar trots att barnet läser rätt: **Starta om lyssningen** uppe till höger bygger om taligenkänningen utan att position eller poäng går förlorade.
- Texten, meningen man var på, poängen och inställningarna finns kvar nästa gång appen öppnas. Veckans läsläxa behöver alltså bara klistras in en gång.

Under **Läsning** går det att ställa in textstorlek, hur länge appen väntar innan den hjälper till, och hur strikt den bedömer uttalet. Under **Röst** väljs uppläsningsröst, talhastighet och ljudeffekter.

Panelen längst ner visar teknisk mätdata (latens, igenkända ord, svåra ord) — den är till för den vuxne, inte barnet. På små skärmar är den dold.

## Flera barn på samma enhet

Knappen med figuren uppe till höger visar vem som läser. Under **Text & inställningar › Barn** lägger man till fler barn, byter mellan dem och ser hur det har gått.

Varje barn har egna inställningar, egen text, egen läsposition, egna poäng och en egen lista över ord som har varit svåra över tid. Vid byte laddas allt det om.

Allt sparas i webbläsarens `localStorage` på just den enheten — appen har ingen server och skickar ingenting vidare. Det innebär också att webbläsaren får slänga det: Safari på iPhone rensar sparad data efter ungefär en veckas inaktivitet för sajter som inte är sparade på hemskärmen. Spara appen på enheten (se nedan), eller ta ut en kopia under **Säkerhetskopia** i samma vy, så finns progressen kvar.

## Spara appen på enheten

Läskompis är en installerbar webbapp. Sparad på hemskärmen startar den direkt, tar hela skärmen utan webbläsarens adressfält, och startar även utan nätverk.

- **Chrome, Edge:** knappen **Lägg till på enheten** under **Text & inställningar › Barn**, eller webbläsarens egen meny.
- **iPhone, iPad:** dela-ikonen › **Lägg till på hemskärmen**. Det är också det enda som skyddar den sparade progressen från Safaris rensning.

Att appen startar utan nätverk betyder inte att den lyssnar utan nätverk: Chromes taligenkänning transkriberar på Googles servrar och slutar fungera offline. Safari på iOS använder Apples igenkänning, som ofta körs på enheten. Uppläsningen fungerar offline överallt.

## Bättre röster

Appen använder de röster webbläsaren råkar erbjuda, och kvaliteten skiljer sig kraftigt. Listan under **Text & inställningar › Röst** visar vad som finns just nu, och där står instruktionen för det system du sitter på — på macOS och Windows också en knapp som öppnar rätt inställningssida direkt. iOS, Android och ChromeOS släpper inte in webbsidor i systeminställningarna, så där får man gå själv.

I Apple-världen är **Alva (Premium)** den svenska röst som är värd att hämta — gratis, men den laddas inte ner förrän man ber om det.

Här är alla:

| System | Så installerar du fler svenska röster |
| --- | --- |
| **macOS** | Systeminställningar › Hjälpmedel › Uppläsning och tal › Systemröst › **Hantera röster…** → Svenska → **Alva (Premium)**. Stor nedladdning, ta den över wifi. Menyn hette **Talat innehåll** före macOS 26. |
| **iPhone / iPad** | Inställningar › Hjälpmedel › Uppläsning och tal › **Röster** › Svenska → nedladdningsikonen vid **Alva**, välj **Premium** om den erbjuds. *Klara* är alternativet. Menyn hette **Talat innehåll** före iOS 26. |
| **Windows** | Inställningar › Tid och språk › Tal › **Hantera röster** › **Lägg till röster** → Svenska. |
| **Android** | Inställningar › Tillgänglighet › Text till tal › kugghjulet vid motorn › **Installera röstdata** › Svenska. På vissa telefoner ligger den under System › Språk och inmatning. Starta om webbläsaren efteråt. |
| **ChromeOS** | Inställningar › Tillgänglighet › Text till tal › **Röstinställningar för Text till tal** → slå på *Använd en naturlig röst när enheten är online*. |
| **Linux** | Systemets talsyntes, speech-dispatcher med espeak-ng eller mbrola. Låter robotaktigt — Chromes nätröster är ett bättre spår. |

Webbläsaren avgör lika mycket som systemet:

- **Chrome** lägger till Googles nätröster utöver systemets — *Google svenska* i listan. Kräver internet, kräver ingen installation.
- **Edge** har egna svenska neuronröster märkta *Online (Natural)*. På Windows är det den enklaste vägen till en bra svensk röst — systemets egen heter *Microsoft Bengt* och är den enda som går att installera.
- **Safari** visar bara röster som är installerade i systemet. Har du precis installerat en måste sidan laddas om innan den syns.
- **Firefox** kan läsa upp men saknar taligenkänning, så appen kan inte lyssna där.

## Teknik

Ingen byggkedja och inga beroenden. Appen är `index.html` plus det som krävs för att den ska gå att installera: `manifest.webmanifest`, `sw.js` och ikonerna. Den använder webbläsarens inbyggda API:er:

- **Web Speech API (SpeechRecognition)** för taligenkänning på svenska. Fungerar i Chrome och Edge, och i Safari på iOS/macOS (via Apples taligenkänning, kräver att diktering är påslagen). Firefox saknar stöd.
- **SpeechSynthesis** för uppläsning av ord och uppmuntran. Vilka röster som finns beror på system och webbläsare — se [Bättre röster](#bättre-röster).
- **Web Audio API** för ljudeffekter och nivåmätaren.
- **localStorage** för profiler, inställningar och progress. En enda nyckel, `laskompis:v1`, inget nätverk inblandat.
- **Service worker** som cachar appskalet. Sidan hämtas nätverk-först, så en ny version hålls aldrig tillbaka av cachen; den sparade kopian används bara när nätet saknas helt.

Ordmatchningen görs med en girig token-alignment mot transkriptionen, med Levenshtein-avstånd och konfigurerbar stränghet, så att rimliga uttalsvariationer släpps igenom.

### Om integritet

Chromes taligenkänning skickar ljudet till Googles servrar för transkribering — ljudet behandlas alltså inte enbart lokalt. I Safari används Apples taligenkänning, som ofta körs direkt på enheten.

Appen själv har ingen backend och skickar ingenting någonstans. Det som sparas — profiler, inställningar, texter, poäng och svåra ord — ligger kvar i webbläsarens `localStorage` på enheten, och går att ta bort under **Text & inställningar › Barn**.

## Köra lokalt

Mikrofonåtkomst kräver en säker kontext, så servera filen via localhost i stället för att öppna den direkt:

```sh
python3 -m http.server 8000
```

Öppna sedan http://localhost:8000 i Chrome eller Edge. `localhost` räknas som säker kontext, så service workern registreras där också — ändrar du `sw.js` behöver du hard-reloada eller avregistrera den under DevTools › Application.

## Status

Detta är en tidig prototyp. Webbläsarens taligenkänning är byggd för vuxenröster och har märkbar latens — tillräckligt bra för att pröva om samspelet fungerar, inte ett mått på hur bra spårningen kan bli.
