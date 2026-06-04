# Inspirasjons-research: stjernemerkede GitHub-repoer → evers.no

> Intern research, ikke lenket fra siten. Utarbeidet 2026-06-04 ved gjennomgang av
> alle 58 stjernemerkede repoer fordelt på fire parallelle research-agenter
> (Design & portefølje · Finans & data · Interaktivitet & læring · Teknisk & infra).
> Agentene leste README-er, sjekket live-demoer og inspiserte den faktiske kodebasen
> (examprep, finance-proxy, GitHub Actions, FNTI). Ingenting er endret på siten — dette
> er kun anbefalinger.

## Fase 1 — oversikt over de 58 repoene
Fordelingen var skjev (slik stjernene faktisk er): tung på finans/data og AI/dev-verktøy,
lettere på ren design/portefølje.

| Kategori | Antall | De mest relevante |
|---|---|---|
| Finans & data | ~18 | lightweight-charts (allerede i bruk), yfinance, OpenBB, firefly-iii, maybe, plotly/dash, awesome-quant |
| Teknisk & infra | ~22 | public-apis, astro, airbnb/javascript, n8n (resten er AI-agent/ML/krypto/CLI — lav relevans) |
| Interaktivitet & læring | ~12 | roadmap.sh, freeCodeCamp, system-design-primer, ml4trading |
| Design & portefølje | ~6 | design-resources-for-developers, tailwindcss, + framework-homepager (React/Vue/Godot) som teknikk-kilder |

Hovedinnsikt: examprep og FNTI er allerede svært modne (full spaced-repetition-motor,
quiz med forklaringer, mindmap, kalkulatorer, allokeringsslider). OSEBX-dashboardet bruker
allerede lightweight-charts. Anbefalingene under sikter derfor mot reelle hull, ikke
duplisering.

---

## Topp 10 ideer (prioritert etter verdi/innsats)

| # | Idé | Flate | Inspirert av | Innsats | Verdi |
|---|-----|-------|--------------|---------|-------|
| 1 | **Indeksert sammenligningschart (rebasert til 100)** — OSEBX vs. S&P 500 vs. sektorer fra samme startpunkt, via Baseline-series + `PriceScaleMode.Percentage`. Kanonisk måte å vise relativ styrke / sektorrotasjon. | OSEBX | `tradingview/lightweight-charts` (plugins) | Lav | Høy |
| 2 | **Rough Notation på CV/rekrutterer** — håndtegnet understrek/sirkel rundt nøkkelkompetanse («Wealth Management»). Lekent men proft, høy huskefaktor hos rekrutterere, vanilla/drop-in. | CV, rekrutterer/ | `design-resources-for-developers` | Lav | Høy |
| 3 | **Bytt EUR/NOK-kilde til Norges Bank (eller Frankfurter/ECB)** — autoritativ NOK-kurs for en norsk finansside; Frankfurter er nøkkelfri m/ CORS som fallback. Mer korrekt + mindre Yahoo-avhengighet. | forsiden (ticker) | `public-apis` (Currency) | Lav | Høy |
| 4 | **`text-wrap: balance` + selvhostet font (Fontshare/Bunny Fonts)** — fikser stygge overskrift-brytinger på tvers av de 6 språkene (én CSS-linje); GDPR-vennlig self-hosting fjerner Google-tracking. | forsiden / i18n | `tailwindcss` + `design-resources` | Lav | Middels-Høy |
| 5 | ✅ **Sektorrotasjons-heatmap** (sektor × uke, farge = relativ avkastning) ~~via Heatmap-series-plugin~~. Den mest leselige enkeltvisualiseringen av dashboardets kjernebudskap. **— Gjort 2026-06-04** (osebx `0a4f63d`); implementert som ren CSS-grid, ikke plugin. | OSEBX | `tradingview/lightweight-charts` | Lav-Middels | Høy |
| 6 | **Selvforklarende chart: Delta-tooltip + shaded-background-bånd** — dra-for-å-måle prosentendring, og fargebånd bak kursen som visualiserer dine egne breddemål / bull-bear-regimer. Ren edukasjonell gevinst uten ny data. | OSEBX | `tradingview/lightweight-charts` (primitives) | Lav | Middels-Høy |
| 7 | **Pensum-dekningsprosent via node-state på mindmap** — marker hvert tema «kan / repeterer / ikke startet», fargekod noden, vis «% av pensum behersket». Fyller det manglende fugleperspektivet over den eksisterende kort-for-kort-SR-motoren. | examprep | `roadmap.sh` (developer-roadmap) | Middels | Høy |
| 8 | **CSV/Anki-eksport av flashcards** — «Last ned kort»-knapp så du kan repetere i Anki-appen på mobil før eksamen, uten å bygge mobilstøtte. | examprep | `system-design-primer` | Lav | Middels-Høy |
| 9 | **ESLint-sjekk (airbnb-base) i CI** for hovedsidens vanilla-JS — ren *validering* (ikke reformattering), fanger syntaksfeil/ubrukte variabler før push. Beskytter i18n-ordboken og easter-eggs mot utilsiktet brekkasje. | fundament | `airbnb/javascript` | Lav | Middels-Høy |
| 10 | **Ekte makrodata (FRED/Eurostat) bak konstanter** — erstatt hardkodet inflasjon/rente i personligøkonomi-verktøyene og pensjonskalkulatoren med gratis CORS-data, oppdatert via et `[skip ci]`-cron-Action (samme mønster som Strava/Letterboxd). | personligøkonomi, pensjonskalkulator | `public-apis` (FRED/Econdb) + `awesome-quant` (pandas-datareader) | Middels | Høy |

**Raskeste gevinster (gjør først):** #2 (Rough Notation), #3 (EUR/NOK-kilde), #4 (text-balance + font), #1 (indeksert chart) — alle lav innsats, synlig effekt.

---

## Per underside — 2-3 forslag

### Forsiden (index.html, vanilla)
- **`text-wrap: balance` på alle overskrifter + selvhostet variabel-font** (Fontshare/Bunny) — i18n-vennlig, tracking-fritt. *(tailwindcss, design-resources)*
- **AOS / Splitting.js scroll-reveal** — vanilla, ingen build; oppgraderer de eksisterende scroll-animasjonene, Splitting gir tegn-for-tegn hero-animasjon. *(design-resources)*
- **EUR/NOK-ticker fra Norges Bank/Frankfurter** i stedet for Yahoo — riktigere NOK-kurs. *(public-apis)*

### prosjekter/
- **Ekte-screenshot feature-kort** i stedet for abstrakte ikoner — vis faktiske skjermbilder av OSEBX/pensjonskalkulator som «bevis på kapabilitet». *(godot, vue)*
- **Innebygde live mini-demoer** (iframes) av OSEBX/pensjonskalkulator i stedet for statiske bilder — sterkest portfolio-effekt for en teknisk finansprofil. *(react.dev)*
- **Tre-kolonners verdiforslag-blokk** (skannbar) — gjenbrukbar også på rekrutterer-siden. *(vuejs.org)*

### CV / rekrutterer/
- **Rough Notation-annotering** av nøkkelkompetanse (understrek/sirkel på WM/PB/Fund Sales). *(design-resources)*
- **Tre-kolonners «Wealth Management / Private Banking / Fund Sales»** med kort beskrivelse hver. *(vuejs.org)*

### OSEBX-dashboard (osebx/)
- **Indeksert sammenligningschart (rebasert 100)** + **sektorrotasjons-heatmap** ✅ (gjort 2026-06-04, ren CSS-grid) + **delta-tooltip/shaded-bånd** — alle som drop-in lightweight-charts-plugins (du har biblioteket). Husk TradingView-attribusjonskravet. *(lightweight-charts, awesome-tradingview)*
- **Python-data-jobb i GitHub Actions med yfinance `Sector`/`Screener`** som skriver ferdig OSEBX-JSON til repoet — datadrevet sektor-gruppering og «ukens vinnere/tapere» i stedet for hardkoding; avlaster Worker-en. *(yfinance, OpenBB som mer robust data-lag)*
- (Valgfritt, lett) **«Investor-persona»-vinkel** i LLM-narrativet («hva ville en verdiinvestor sett her?»). *(FinceptTerminal — eneste lette idé derfra)*

### personligøkonomi-verktøyene
- **Ekte historisk inflasjon/rente (FRED/Eurostat)** bak renters-rente- og inflasjonsverktøyene i stedet for hardkodede antagelser. *(public-apis, awesome-quant/pandas-datareader)*
- **Firefly-aktige mønstre** — «hvor pengene går» / sparemål med fremdrift — i din rolige redaksjonelle stil (kun inspirasjon, ikke integrasjon). *(firefly-iii; maybe-finance for formue-over-tid-visualisering)*
- **Flere interaktive formel-widgets** («endre én parameter, se effekten») for durasjon, NPV, obligasjonsprising. *(ml4trading-prinsippet)*

### examprep
- **Pensum-dekningsprosent (node-state på mindmap)** — fugleperspektivet som mangler. *(roadmap.sh)*
- **CSV/Anki-eksport** av flashcards for mobil-repetisjon. *(system-design-primer)*
- **«Spikkark»-modus** — hele pensum komprimert til én tett, print-vennlig side rett før 13. mai-eksamen; dataene (glossary + calculations + topics) finnes allerede, kun ny kompakt rendering. *(the-art-of-command-line)*
- (Valgfritt) **Quiz-as-gate i en «guidet løype»** (topic → flashcards → quiz på samme tag, 3/4 riktig for å låse opp). *(freeCodeCamp)*

### pensjonskalkulator
- **FRED/Econdb-drevne konstanter** (inflasjon/rente) via cron-Action — delvis datadrevet «vedlikeholdes årlig». *(public-apis)*
- (Kun hvis lastetid blir et problem) **Astro-island** i stedet for full Vite+React-SPA — sender langt mindre JS for en side som er statisk innhold + ett interaktivt panel. *(astro)*

### strategi (privat)
- Ingen sterke funn — siden er en intern tracker (noindex). ESLint-CI-en (#9) dekker den teknisk sammen med resten.

---

## «Ikke verdt det» — med begrunnelse

| Repo(er) | Hvorfor ikke |
|---|---|
| `FinRL`, `FinGPT`, `microsoft/qlib`, `TradingAgents` | Algo-trading-/ML-forskning. Tung Python-stack, lav overførbarhet til en redaksjonell/edukasjonell side. (Eneste lette idé: «investor-persona»-vinkel i narrativet.) |
| `Fincept-Corporation/FinceptTerminal` | Native C++/Qt-desktop-app — ingenting å integrere på web. |
| `charting-library-tutorial`, `charting-library-examples`, `LightweightChartsIOS` | TradingViews tyngre, lukkede Advanced Charts / iOS-port. Du bruker allerede det lette Lightweight Charts. |
| `akfamily/akshare` | Sterkt Kina-A-aksje-fokus; nær null Norden/Norge-dekning. |
| `plotly/dash` | Krever Python-server — feil teknologi for en statisk side (kun aktuelt hvis du noen gang bygger et tungt analyseverktøy). |
| `maybe-finance/maybe` | Arkivert/ikke vedlikeholdt — bruk kun som visuell inspirasjon, ikke bygg på koden. |
| `tradingview/fancy-canvas` | Ren intern avhengighet (allerede transitivt i bruk via lightweight-charts); ingen design-/feature-verdi i seg selv. |
| `astro` (for hovedsiden) | CLAUDE.md forbyr build-step/rammeverk på hovedsiden. Kun en kandidat for sub-apper som *allerede* har build. |
| `n8n` | Løser det GitHub Actions allerede gjør; en selvhostet instans er overkill. Noter som skaleringsexit hvis integrasjonene passerer ~6. |
| `claude-skills`, `karpathy-skills`, `superpowers`, `ECC`, `harness`, `hermes-webui`, `claw-code`, `odysseus`, `langflow`, `prompts.chat` | AI-agent/skills-rammeverk — relevant for din egen Claude Code-arbeidsflyt, ikke for nettsidens fundament. |
| `transformers`, `tensorflow` | ML-treningsrammeverk — ikke for en statisk side. |
| `unionlabs/union`, `juspay/hyperswitch` | ZK-bridging / betalingsplattform (krypto/fintech-infra) — null relevans for en personlig side. |
| `yt-dlp`, `ollama`, `ohmyzsh` | Personlig dev-/CLI-verktøy — forbedrer maskinen din, ikke nettsiden. |
| `AUTOMATIC1111/stable-diffusion-webui` | Bildegenerering — kunne teoretisk lage og-image/medieval-assets, men marginalt. |
| `sindresorhus/awesome`, `the-book-of-secret-knowledge`, `vinta/awesome-python`, `build-your-own-x`, `coding-interview-university` | Kuraterte ressurs-/karriere-lister — ingen interaktiv UX å overføre (kun «kurateringsdisiplin» som forbilde for egne innholdslister). |
| `QuantConnect/Lean` | Profesjonell algo-trading-motor — faglig interessant for deg som finansstudent, men ingen UX å hente til examprep/guider. |

---

## Metode-note
Fase 1: `gh api user/starred --paginate` → 58 repoer. Fase 2: fire parallelle agenter
(README + live-demo + kodeinspeksjon), hver med konkret overførbarhets-vurdering. Fase 3:
denne syntesen. Kilder per idé er oppgitt i kursiv/parentes. Alle «allerede finnes»-notater
er verifisert mot faktisk kode (examprep-moduler, finance-proxy, `.github/workflows/`, FNTI).
