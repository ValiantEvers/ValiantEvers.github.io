# UTKAST – kostnotat til /aksjeskatt

**Status: utkast, innplassert i `aksjeskatt/index.html`, IKKE pushet.** Skrevet 2026-08-16,
committet 2026-08-17, **tabellen regnet på nytt 2026-08-19**. Valiant språkvasker stemmen og
godkjenner pushen. Seksjonen ligger nå i siden (skjult bak en `<details>` rett etter
illustrativ-merknaden), men ingenting er publisert før pushen er godkjent.

Tallene er **ikke** lenger hentet fra runde 1: de er målt på nytt i det kanoniske miljøet mot
gjeldende satser og gjeldende grid-tilstand. De kom ut identiske med 16.08-tabellen på publisert
presisjon. Proveniens står i `hub/reports/kostnotat-rekjoring-2026-08-18.md`.

---

## Foreslått plassering

Rett etter den eksisterende «illustrativ»-merknaden, som allerede skiller eksakt
skatt fra antatt avkastning. Notatet hører hjemme der fordi det utvider nøyaktig
det skillet med en tredje kategori: **antatte kostnader**. Rekkefølgen blir da

1. skatten er eksakt regnet,
2. avkastningsbanene er antatte,
3. handelskostnadene er også antatte – og de er lavt satt.

Plasseres det lenger opp, leses det som et forbehold om hele siden. Plasseres det
i bunnen, leser ingen det.

**Innplassert slik 2026-08-19:** som et tredje varselfelt i samme visuelle familie som de to
andre, men som et `<details>`-element. Sammendragslinjen står alltid åpen og bærer selve
poenget med tall («faller fra 11,02 til 5,79 prosent i året»); resten er ett klikk unna.
Grunnen er at fem avsnitt og en tabell i full høyde ville skjøvet hele scenariovelgeren under
skjermkanten. Vil du ha alt åpent by default, er det ett attributt.

---

## Utkast til tekst

### Om handelskostnadene i modellen

Tallene på denne siden regner skatt eksakt, men **handelskostnader er en antakelse**,
og antakelsen er lav. Modellen belaster 5 basispunkter i kurtasje og halve spreaden
av 10 basispunkter, og den regner kostnaden på halve rundturen. En reell handel har
to sider: du selger noe og kjøper noe annet.

En norsk småsparer med aksjesparekonto hos Nordnet betaler i praksis mer enn dette:
en minstekurtasje i kroner som slår inn på små poster, rundt 0,15 prosent på det som
er over minstebeløpet, og et valutapåslag på hver vei når papiret ikke er i kroner.

Forskjellen er ikke akademisk. Regnet om på de samme strategiene over tjue år,
med én million i startkapital:

| Kostnadsnivå | Momentum | Indeks | Utbytte |
|---|--:|--:|--:|
| Modellens nivå i dag | 11,02 % | 8,27 % | 6,27 % |
| Rundturen belastet begge sider | 9,88 % | 8,27 % | 6,28 % |
| Nordnet-nivå (0,15 % kurtasje, 0,30 % spread, minstekurtasje) | 5,79 % | 8,26 % | 6,27 % |

*Avkastning i året etter skatt på aksjesparekonto, 20 år, 1 000 000 kr i startkapital,
2,5 prosent direkteavkastning, enslig. Scenariene regnes i kroner, så valutapåslaget nevnt
over inngår ikke i tallene.*

Les de to siste kolonnene først. **Indeksstrategien flytter seg ikke** – 8,27 mot 8,26 prosent.
Utbyttestrategien heller ikke: hele bevegelsen der er tre tusendels prosentpoeng, altså mindre enn avrundingen i tabellen. Det er momentumstrategien som faller, fra 11,02 til
5,79 prosent, og den faller fordi den handler mye. Kostnad er en skatt på omløp, og den
betales enten resultatet blir godt eller dårlig.

Det snur konklusjonen på hodet: på modellens nivå slår momentum indeksstrategien med nesten
tre prosentpoeng. På det en småsparer faktisk betaler, taper den med nesten to og et halvt.

**Hvorfor tallene på siden ikke er endret:** kostnadsnivået er en antakelse, og hvilken
antakelse som er den rette avhenger av hvem du er. Har du store poster, handler sjelden
og eier norske papirer, ligger du nærmere det øverste nivået. Handler du månedlig i små
poster i utenlandske aksjer, ligger du nærmere det nederste. Siden viser det øverste, og
det er derfor det står her hva det betyr.

Poenget å ta med seg er uansett det samme, og det gjelder uavhengig av hvilket nivå som
er riktig for deg: **for en småsparer er det kostnadene, ikke skatten, som spiser en
strategi som handler mye.** Skatteforskjellen mellom kontotypene er reell og verdt å
kjenne. Men den er liten mot det omløpet koster.

---

## Notater til Valiant (skal ikke publiseres)

- **Den ubehagelige konsekvensen, sagt rett ut:** de 36 `flip_examples` som bærer sidens
  fortelling – «slår før skatt, taper etter skatt» – blir **0** på Nordnet-nivå. Ikke
  fordi skattepoenget er galt, men fordi strategien allerede har tapt før skatten regnes.
  Legges dette avsnittet inn uten å røre tallene, står en leser som regner etter igjen med
  et spørsmål siden ikke besvarer. Det taler for å ta det som ett grep senere: enten flytte
  griden over på korrekt kostnad og skrive om fortellingen, eller la begge stå som to
  eksplisitte nivåer siden lar leseren velge mellom.
- **Teknisk er en overgang trygg:** 0 `best_wrapper`-flips og 0 rank-endringer på alle tre
  strategier. Det er en redaksjonell beslutning, ikke en teknisk. Bekreftet på nytt 19.08 mot
  alle 108 scenarier, ikke bare de tre i tabellen.
- ~~Tabellen over er uendret fra runde 1. Skal den inn på siden, bør den regnes på nytt~~
  **Gjort 2026-08-19.** Alle tre nivåer regnet på nytt på repoets venv (CPython 3.13.14) mot
  `satser/2026.json` slik den står i dag. Nivå 1 kom ut **bit-identisk** med den publiserte
  griden (0,11024301229218492), og alle ni tallene i tabellen er uendret på to desimaler.
  **Med ett unntak, og det er en ekte feil i 16.08-rapporten:** utbyttekolonnen sto som
  6,28 / 6,27 / 6,27. Riktig avrunding er **6,27 / 6,28 / 6,27** – de to øverste er byttet om.
  Målt: 6,274731 / 6,275445 / 6,272468 prosent. Feilen er ren transkripsjon i rapporten;
  griden på siden har alltid hatt 6,274731. Rettet her og i seksjonen som ligger i siden.
- **Tre endringer i teksten, alle fordi et tall eller en etikett var upresis** – ikke
  språkvask, den er din:
  1. Radetiketten sa «minstekurtasje, 0,15 %, valutapåslag». **Valutapåslaget er inert på
     denne griden:** scenariene deklarerer ingen utenlandske papirer, så hver fill flagges som
     NOK og FX-leddet blir null. Målt: 0 av 108 scenarier endrer seg når `fx_bps` settes til 0.
     Etiketten lovet noe tallet ikke inneholdt. Ny etikett nevner kurtasje og spread, og
     bildeteksten sier eksplisitt at valutapåslaget ikke er med.
  2. «Les den siste kolonnen først» pekte på Utbytte, mens setningen etter handler om indeks.
     Rettet til «de to siste kolonnene».
  3. «Regnet om på den samme momentumstrategien» sto over en tabell med tre strategier.
     Rettet til «de samme strategiene».
  Og én til: «Indeksfond» → «Indeks». Modellen inneholder ikke et fond, den inneholder en
  likevektet kurv på fire papirer som holdes – som er det siden selv kaller
  «Indeks (kjøp og hold)». Overprøv gjerne i språkvasken hvis du synes «indeksfond» er
  klarere for leseren, men da bør ordet stå i en form som ikke påstår en fondsstruktur.
- **Minstekurtasjen biter faktisk, men ikke der man skulle tro.** 20 av 108 scenarier endrer
  seg når 49-kronersgulvet skrus av – 14 indeks og 6 utbytte, **null momentum**. Momentums
  tickets er store (halve boken av gangen), så 15 bps er alltid over gulvet; det er indeks-
  og utbyttestrategienes små drift- og reinvesteringshandler som treffer det. Det er motsatt
  av DEP-2-spådommen, og på samme måte som korreksjonen 17.08 i rapport 2: gulvet er ikke der
  fortellingen antok.
- Språknivå: teksten er skrevet i sidens eksisterende norske stemme. `/aksjeskatt` har ingen
  språkvelger og ingen `/en/`-variant, så notatet finnes kun på norsk. Frysen fra 2026-08-14
  er dermed ikke berørt – ingen fr/de/ja-streng er rørt.
- Ingen lange tankestreker i teksten over, i tråd med gjeldende praksis. Verifisert i den
  faktiske HTML-en: 0 forekomster av U+2014.
