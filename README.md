# evers.no

Min personlige finans- og karriereside — live på **[evers.no](https://www.evers.no)**.
MSc Finance @ BI Norwegian Business School, Oslo. Søker en klient-nær rolle der finansiell kompetanse møter relasjonsbygging — Wealth Management, Private Banking, Fund Sales.

*Personal finance & career site — live at [evers.no](https://www.evers.no). MSc Finance candidate at BI Norwegian Business School, Oslo.*

## Hva er dette / What this is
Single-file vanilla HTML for hovedsiden (ingen rammeverk, ingen build), deployet via GitHub Pages på eget domene. Inneholder CV, forskning, sertifiseringer og interaktive finansverktøy. De interaktive verktøyene er egne små React-apper bygget inn under egne stier.

## Utvalgte flater / Selected surfaces
- **`index.html`** — forsiden: CV, erfaring, masteroppgave, kontakt. 6-språk i18n (no/en/fr/de/ja + en middelalder-easter-egg).
- **`pensjonskalkulator/`** — norsk pensjonskalkulator (Vite + React): folketrygd, tjenestepensjon, IPS og ASK i ett. → [evers.no/pensjonskalkulator](https://www.evers.no/pensjonskalkulator/)
- **`personligokonomi/`** — interaktive moduler om renters rente, inflasjon, nåverdi m.m. → [evers.no/personligokonomi](https://www.evers.no/personligokonomi/)
- **`osebx/`** — Oslo Børs-dashboard (speilet fra [ValiantEvers/osebx](https://github.com/ValiantEvers/osebx)). → [evers.no/osebx](https://www.evers.no/osebx/)
- **`rekrutterer/`** — landingsside for rekrutterere i Wealth Management / Private Banking / Fund Sales.

## Tilgjengelighet & ytelse / Accessibility & performance
WCAG AA-kontrast, tastaturnavigasjon, skip-link, `lang` per språk, semantisk `<main>`-landmark. Ekte felt-ytelse (Core Web Vitals) måles via en personvern-ren web-vitals-RUM (egen Cloudflare Worker, ingen cookies/IP).

## Deploy
Push til `main` → auto-deployes av GitHub Pages (ingen build-steg for hovedsiden). Sub-appene har egne Vite-build-steg via GitHub Actions.

🌐 [evers.no](https://www.evers.no) · 💼 [LinkedIn](https://www.linkedin.com/in/valiant-evers-linked-in/) · 🧑‍💻 [@ValiantEvers](https://github.com/ValiantEvers)

---
*MIT — bruk gjerne mønstre herfra.*
