# Norges Bank Watch

Statisk dashbord som samler norske makro-nøkkeltall relevante for
pengepolitikken: styringsrente, rentebane, kort markedsrente, KPI/KPI-JAE,
lønnsvekst, boligpriser og valutakurs. Bygges som sub-app under
`evers.no/nb-watch/` og deler GitHub Pages-deploy med resten av evers.no.

## Stack

- **Vite + React 18 + TypeScript** (strict mode, ingen SSR)
- **Tailwind CSS** for styling, systemfonter (ingen Google Fonts)
- **Recharts** for alle grafer
- **date-fns** for datohåndtering (`fmt`-helpers er imidlertid skrevet for
  hånd — norsk lang-form og hardspace-tusenskilletegn)
- **Python 3.11** for data-pipeline (`scripts/`)

## Mappestruktur

```
nb-watch-src/                  # Vite-kilde
├── src/
│   ├── App.tsx                # composition root
│   ├── main.tsx
│   ├── index.css              # Tailwind + Recharts-overstyringer
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Section.tsx
│   │   ├── StatTile.tsx
│   │   ├── Footer.tsx
│   │   └── charts/            # én komponent per seksjon
│   ├── content/
│   │   └── descriptions.ts    # all norsk forklarende tekst
│   └── lib/
│       ├── data.ts            # type-defs + fetchere fra /data/*.json
│       ├── format.ts          # norsk tallformatering
│       └── useTheme.ts        # palett som følger prefers-color-scheme
├── public/data/               # JSON-output fra Python-pipelinen
└── scripts/                   # Python: fetch_all + smoke_test
```

Build-output havner i søsken-mappen `../nb-watch/` (utenfor src), som er det
GitHub Pages faktisk serverer. Vite-config setter
`base: '/nb-watch/'` og `build.outDir: '../nb-watch'`.

## Kjøre lokalt

```bash
cd nb-watch-src
npm install
npm run dev          # dev-server på http://localhost:5173/nb-watch/
npm run build        # produserer ../nb-watch/
npm run preview      # serverer build-output på http://localhost:4173/nb-watch/
npm run typecheck    # tsc --noEmit
```

## Oppdatere data

```bash
cd nb-watch-src
pip install -r scripts/requirements.txt
python scripts/smoke_test.py     # pinger alle kilder, rapporterer status
python scripts/fetch_all.py      # henter ferske JSON-filer til public/data/
```

Etter `fetch_all.py`: kjør `npm run build` for at den nye dataen skal speiles
inn i `../nb-watch/data/`. Eller bare kopier dem direkte:
`cp public/data/*.json ../nb-watch/data/`.

## Datakilder

| Felt              | Kilde                                                          |
|-------------------|----------------------------------------------------------------|
| Styringsrente     | Norges Bank, `IR/B.KPRA.SD.R` (daglig CSV via SDMX)            |
| NOWA 3M           | Norges Bank, `SHORT_RATES/B.NOWA_AVERAGE.3M.R` (NIBOR-proxy)   |
| EUR/USD/SEK/GBP   | Norges Bank, `EXR/B.{CCY}.NOK.SP` (UNIT\_MULT-justert)         |
| Rentebane         | Manuell CSV, vedlikeholdes fra siste Pengepolitisk rapport     |
| KPI 12-mnd        | SSB tabell 03013                                               |
| KPI-JAE 12-mnd    | SSB tabell 05327 (`Konsumgrp = JAE_TOTAL`)                     |
| Boligpris         | SSB tabell 07221 (prisindeks brukte boliger, kvartalsvis)      |
| Lønnsvekst        | SSB tabell 11418 (årlig, alle yrker/sektorer)                  |

### NIBOR vs NOWA

Norges Bank publiserer ikke NIBOR direkte. NIBOR fastsettes av
Norske Finansielle Referanser AS (en privat referanseadministrator) og har
ingen åpen, stabil API. Vi bruker i stedet 3-måneders glidende snitt av
NOWA (Norwegian Overnight Weighted Average), som er den moderne RFR-baserte
benchmark-renten Norges Bank publiserer og som ECB/BIS regner som
standard kort markedsrente i NOK. UI-en kaller dette eksplisitt
ut som proxy.

## GitHub Actions

To workflow-filer er på plass, men begge er satt opp med kun
`workflow_dispatch` (manuell trigger):

- `.github/workflows/build-nb-watch.yml` — bygger Vite-prosjektet og
  committer `nb-watch/` til main. Aktiveres ved å fjerne kommentaren på
  push-triggeren.
- `.github/workflows/refresh-nb-watch-data.yml` — kjører `fetch_all.py`,
  oppdaterer JSON-filer i både `public/data/` og `nb-watch/data/`,
  committer med `[skip ci]`. Aktiveres ved å fjerne kommentaren på
  schedule-triggeren (cron `0 6 * * *`).

Kjør dem manuelt fra Actions-fanen først, og verifiser at de gjør det de
skal, før triggerne aktiveres.

## Rentebane — manuell vedlikehold

Norges Bank publiserer ny rentebane fire ganger i året (Pengepolitisk
rapport, mars/juni/sept/des). Når en ny rapport kommer:

1. Hent rentebanen (tabellen "anslag på styringsrenten") fra siste PPR
   på <https://www.norges-bank.no/aktuelt/publikasjoner/pengepolitisk-rapport/>
2. Rediger `scripts/data/rentebane_manual.csv` — én rad per kvartal,
   format `YYYY-MM-DD,rente,kilde_ppr` (f.eks. `2026-09-01,3.75,PPR 2/26`)
3. Kjør `python scripts/update_rentebane.py` (eller bare `fetch_all.py`)
4. Commit

## Hva som IKKE er med i MVP

- OIS-implisert markedsbane (krever betalte data)
- Importveid kursindeks I-44 (mangler i åpen NB-feed for daglige obs)
- Pengepolitiske annonseringer / Pengepolitisk rapport-oppsummering
  (planlagt fase 2 — LLM-agent som leser PPR og oppsummerer tone-endringer)
- Lønn etter sektor / frontfag (kun aggregert månedslønn er med)
- Sesongjustert boligprisindeks (kunne enkelt legges til ved å bytte
  `Boligindeks` → `SesJustBoligindeks` i fetch_ssb.py)

## Disclaimer

Ikke investeringsråd. Data leveres uten garantier. Eventuelle feil i
kilde-API-er reproduseres på dashbordet.
