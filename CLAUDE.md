# evers.no

## What this is
Single-file vanilla HTML personal website for Valiant Evers. Deployed via GitHub Pages, custom domain `evers.no`. No build step, no frameworks, no bundler.

## Structure
- `index.html` — main page with everything (CSS in `<style>`, JS at bottom)
- `profile.jpg`, `og-image.png`, `favicon.svg` — assets in root
- `CNAME` — points to evers.no (do not delete or modify)
- `cv.html` — CV page (single file at root, not a directory)
- `rekrutterer/index.html` — landing page for recruiters in Wealth Management / Private Banking / Fund Sales (public, indexed)
- `strategi.html` — private internal job-search strategy tracker (noindex, nofollow — not for public)
- `prosjekter/` — project gallery (`index.html` + `projects.json` + `screenshots/`) with subpage `masteroppgave/` (scrollytelling thesis presentation). Subpages `finansielle-maler/` and `forretningsenhet-dashboard/` are UNLISTED as of 2026-07-09: live at their URLs but noindex, no gallery cards (`synlig:false` in projects.json), no links, not in sitemap — flip `synlig` back and re-add sitemap/section to relaunch
- `aksjeskatt/` — after-tax return comparison depot vs ASK vs holdingselskap; reads pre-computed `aksjeskatt_grid.json` (deterministic tax engine runs offline, not in the browser)
- `formuessamtalen/` — interaktiv rådgivningsdemo (wealth-management-samtalen: egnethet → kontovalg → møtereferat); reads pre-computed `samtale_grid.json` (same offline skatt-optimizer engine pattern as `aksjeskatt/`, tax math never in the browser). Cream-skin, norsk-only, medieval «prins»-easter-egg
- `klima/` — climate status/myths page, every number with a source reference
- `leie-eller-eie/` — rent-vs-buy interactive calculator (Chart.js from CDN)
- `nb-watch/` — Norges Bank Watch macro dashboard. DISCONTINUED 2026-07-09: the auto-refresh pipeline (`.github/workflows/refresh-nb-watch-data.yml`) was deleted (restore from git history if ever revived); last data is frozen static. Page is unlisted (noindex, out of sitemap) but stays live at its URL
- `nb-watch-src/` — frozen source for nb-watch (Vite + React + Tailwind; crawl-blocked in robots.txt)
- `osebx/` og `wc2026/` — IKKE mapper i dette repoet: egne prosjekt-repoer (ValiantEvers/osebx, ValiantEvers/wc2026) servert under evers.no-stiene via GitHub Pages prosjektside-ruting
- `personligokonomi/` — separate sub-app (built from personligokonomi repo)
- `pensjonskalkulator/` — bygd output for pensjonskalkulator (generert av GitHub Actions, ikke rediger direkte)
- `pensjonskalkulator-src/` — kildekode for pensjonskalkulatoren (Vite + React + Tailwind + Recharts)
- `fra-null-til-investor/`, `fra-null-til-investor2/`, `fra-null-til-investor3/` — deliberate 3-part FNTI series (all three stay live — parts, not superseded iterations)
- `examprep/` — GRA6546 (Financial Institutions and Crises) exam-prep hub: quiz, flashcards, timeline, Cytoscape mind-map, mock exams. React UMD + Babel standalone from CDN, JSX modules in `js/`, no build step
- `garmin/` — running dashboard for Garmin data (inline run data, Chart.js trends + Leaflet route map)
- `jobs/` — meta-refresh redirect stub to `/strategi.html` (noindex; kept so old links don't 404)
- `travel/` — compressed travel photos used in Leaflet map
- `.github/workflows/` — Strava + Letterboxd integrations

## Conventions
- ALL CSS, JS, HTML stays in single file per page (no extracted .css/.js — this is intentional, not a bug)
- Custom-property-driven theming (CSS vars at `:root`)
- Language support: no, en, fr, de, ja + medieval (easter egg). Strings driven by `data-i` attributes + JS dictionary.
  BESLUTTET 2026-07-04: dette 5-språksettet (med ja, uten es/nl) er det BEVISSTE valget for
  index.html og cv.html — ikke forsømt rydding. Ikke legg til es/nl uten eksplisitt ønske.
- Email is JS-rendered from character codes after page load. The HTML source must contain only an empty `<a>` element with an empty `<span>` inside — no plain mailto: href and no visible email text. This pattern bypasses Cloudflare email obfuscation entirely. Apply to every page that exposes the email.

## Easter eggs (DO NOT BREAK)
Desktop keyboard triggers (ALL gated behind a touch-device check — deliberately do not fire on mobile):
- Type "prins"/"prince" (or "prins valiant"/"prince valiant") → Prins Valiant medieval mode (CSS theme switch + GIF/APNG transitions, name + language swap). "prince" spelling added 2026-07-06 so the clue works in en/fr.
- Type "run", "waffle" (or "vaffel"), "thesis", "viking", "mjod"/"mjød" → ride-across-screen + emoji-rain effects
- Type "penger" → money-emoji rain
- Type "tangen" → opens ft.com (Nicolai Tangen nod)
- Type "jobb" → opens /strategi.html — PRIVATE tracker (noindex). Deliberately UNHINTED; never advertise or add a clue for this one.
- Konami code (up up down down left right left right b a) → confetti + 360-degree spin + hue-rotate
Click trigger (works on mobile too):
- Triple-click profile photo (#heroImg) → same medieval mode

Discoverability clues (intentional, keep subtle — added 2026-07-06):
- Prins clue is baked into the fact-card copy (data-i="ff1d") in no/en/fr — points at typing his "title"
- Waffle clue is in the Belgia fact-card copy (data-i="ff3d") in no/en
- Console greeting (inline <script> right after #pageFlash) nudges toward a few triggers
- viking/mjød/penger/tangen/konami are left unhinted on purpose — rewards for the persistent

These are personality features, not bugs. If a refactor risks breaking them, ASK before proceeding.

## Live integrations
- Strava + Letterboxd via GitHub Actions (separate workflow files)
- Live finance bar: S&P 500 (Yahoo `^GSPC`), OSEBX (`OSEBX.OL` — NOT `^OSEAX`), EUR/NOK
- Leaflet travel map with markers from compressed `/travel/` images

## Deploy
- Push to main → auto-deployed by GitHub Pages
- Manual: `git push` (no build step)
- Pre-flight: review diff, verify Easter eggs, check all 6 language variants if i18n was touched

## Hands off
- Do not extract CSS/JS to separate files (gjelder hovedsiten — sub-appene
  som `personligokonomi/` og `pensjonskalkulator-src/` har egne build-steg)
- Do not introduce a build step / bundler / framework for hovedsiten
- Do not change Easter eggs without explicit ask
- Do not modify `CNAME`, `og-image.png`, `favicon.svg` without ask

## pensjonskalkulator

Norsk pensjonskalkulator. Live: https://www.evers.no/pensjonskalkulator/

### Struktur
- `pensjonskalkulator-src/` — kildekode (Vite + React + Tailwind + Recharts)
- `pensjonskalkulator/` — bygd output (committed, men generert automatisk av
  GitHub Actions; ikke rediger direkte)

Vite er konfigurert med `outDir: '../pensjonskalkulator'` og
`base: '/pensjonskalkulator/'`. Build-output går rett til deploy-mappen.

### Offentlig kilde-repo (mirror)
Kilden er også publisert som eget offentlig repo:
[`ValiantEvers/pensjonskalkulator`](https://github.com/ValiantEvers/pensjonskalkulator)
(rekrutterer-synlig portefølje). **`pensjonskalkulator-src/` her er fortsatt
kanonisk for deploy** — den live siden bygger fra denne in-tree-kopien, ikke fra
mirror-repoet. De to holdes manuelt i synk ved (~årlige) sats-/G-oppdateringer;
eneste tilsiktede forskjell er at mirror-repoets `vite.config.ts` bygger til
`dist/` (standalone) i stedet for `../pensjonskalkulator`. (De-drift til single
source — submodule / cross-repo-trigger — er en mulig senere oppgave.)

### Deploy
`.github/workflows/build-pensjonskalkulator.yml` bygger og committer
deploy-output ved push til main når noe under `pensjonskalkulator-src/` endres.
Workflow's auto-commit har `[skip ci]` så den ikke trigger seg selv. Krever
"Read and write permissions" i Settings → Actions → General.

Workflow trigger IKKE på sin egen opprettelses-commit (GitHub-quirk) — første
gangs deploy ble committet manuelt i workflow-commiten.

### Modell — ikke-åpenbare valg
- **Real/nominell-konvensjon**: All compounding internt skjer i nominelle
  kroner. Deflatering til realkroner kun for visning og for skatteberegning.
- **Skatt anvendes på REAL inntekt** (ikke nominell). Forutsetter at
  skattebrakter justeres med inflasjon over tid. Å anvende 2025-brakter på
  2063-nominell inntekt ville dramatisk overestimere skatten (bracket creep).
- **Hybrid annuitet**:
  - Folketrygd: naiv `balanse / delingstall / 12` (delingstall har innebakt
    indekseringsforutsetning på ~0,75 %/år, så rentebærende på toppen ville
    dobbelttelle)
  - OTP / IPS / ASK: rentebærende PMT med `payoutRealReturn` (default 2 %)
- **Garantipensjon-floor** på 1,9 × G/år. Kicker inn for lavinntektsbrukere og
  marginalt for middels lønn (650k med 37 års opptjening kan så vidt treffe
  floor'en).
- **AFP** er sterkt forenklet til 0,8 × G/år livsvarig. Treffer omtrent for
  35 års opptjeningsår i privat sektor; overestimat for deltidsarbeidere.
- **`existingAskBalance` behandles som 100 % innskutt kapital** (ikke gevinst).
  Undervurderer gevinst-andel og dermed ASK-skatt — slightly liberal mot
  brukeren. Dokumentert forenkling.

### Konstanter som må vedlikeholdes årlig
- `G_DEFAULT` i `src/pension-engine.ts` (mai-justert hvert år)
- Skattekonstanter i `src/lib/tax.ts` (oppdateres med nytt statsbudsjett
  vedtatt i desember)
- Standard delingstall (per kohort — endrer seg langsomt med
  levetidsprognoser)

### Viktige filer
- `src/pension-engine.ts` — all matematikk, isolert testbar
- `src/lib/tax.ts` — norsk skattemodell (2025-satser)
- `src/lib/useUrlState.ts` — URL-state sync (delbarhet)
- `src/sanity-test.mjs` — kjør `node src/sanity-test.mjs` for å verifisere
  at modellen ikke er regrert. Forventet output: brutto 24–34k, netto 22–30k
  for defaults (realkroner)

### Tone og design
Match `personligokonomi/` — Fraunces (display) + Manrope (body), cream
`#FAF6EF`, ink `#1A1A1A`, accent `#FF5436`. Redaksjonelt, rolig, ikke
fintech-startup. Ingen utropstegn, ingen "AI-tonet" språk.

### Hva som IKKE er modellert
- Skatt på kapitalinntekt utenom ASK (ASK håndteres separat)
- Uføretrygd
- Offentlig sektor AFP
- Skjermingsfradrag for ASK (forenklet bort)
- Endrede pensjonsregler etter 2024 (ny folketrygdmodell antas konstant)

Alle disse er nevnt i footer-disclaimer'en.
