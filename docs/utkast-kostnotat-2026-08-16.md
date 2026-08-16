# UTKAST – kostnotat til /aksjeskatt

**Status: utkast, ikke publisert.** Skrevet 2026-08-16, committet 2026-08-17.
Valiant redigerer stemmen og bestemmer om, når og i hvilken form dette går live.
Ingenting herfra er lagt inn i `aksjeskatt/index.html`.

Alle tall er hentet fra den målte tabellen i `hub/reports/OPUS-RAPPORT-2026-08-16.md`
(seksjon O1d). Det er ikke gjort nye kjøringer for dette notatet, og det står ingen
anslåtte tall her.

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

Forskjellen er ikke akademisk. Regnet om på den samme momentumstrategien over tjue år,
med én million i startkapital:

| Kostnadsnivå | Momentum | Indeksfond | Utbytte |
|---|--:|--:|--:|
| Modellens nivå i dag | 11,02 % | 8,27 % | 6,28 % |
| Rundturen belastet begge sider | 9,88 % | 8,27 % | 6,27 % |
| Nordnet-nivå (minstekurtasje, 0,15 %, valutapåslag) | 5,79 % | 8,26 % | 6,27 % |

Les den siste kolonnen først. **Indeksfondet flytter seg ikke** – 8,27 mot 8,26 prosent.
Utbyttestrategien nesten ikke heller. Det er momentumstrategien som faller, fra 11,02 til
5,79 prosent, og den faller fordi den handler mye. Kostnad er en skatt på omløp, og den
betales enten resultatet blir godt eller dårlig.

Det snur konklusjonen på hodet: i modellens nivå slår momentum indeksfondet med nesten
tre prosentpoeng. På det en småsparer faktisk betaler, taper den med to og et halvt.

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
  strategier. Det er en redaksjonell beslutning, ikke en teknisk.
- Tabellen over er uendret fra runde 1. Skal den inn på siden, bør den regnes på nytt med
  gjeldende satser først – tallene er fra 2026-08-16.
- Språknivå: teksten er skrevet i sidens eksisterende norske stemme. Skal den ut i flere
  språk, gjelder frysen fra 2026-08-14 – kun no + en vedlikeholdes.
- Ingen lange tankestreker i teksten over, i tråd med gjeldende praksis.
