# evers.no

## What this is
Single-file vanilla HTML personal website for Valiant Evers. Deployed via GitHub Pages, custom domain `evers.no`. No build step, no frameworks, no bundler.

## Structure
- `index.html` — main page with everything (CSS in `<style>`, JS at bottom)
- `profile.jpg`, `og-image.png`, `favicon.svg` — assets in root
- `CNAME` — points to evers.no (do not delete or modify)
- `portfolio/index.html` — dark luxury editorial portfolio for recruiters
- `cv/index.html` — CV page
- `rekrutterer/index.html` — landing page for recruiters in Wealth Management / Private Banking / Fund Sales (public, indexed)
- `strategi.html` — private internal job-search strategy tracker (noindex, nofollow — not for public)
- `osebx/` — separate sub-app (mirrored from osebx repo)
- `personligokonomi/` — separate sub-app (built from personligokonomi repo)
- `pensjonskalkulator/` — bygd output for pensjonskalkulator (generert av GitHub Actions, ikke rediger direkte)
- `pensjonskalkulator-src/` — kildekode for pensjonskalkulatoren (Vite + React + Tailwind + Recharts)
- `fra-null-til-investor/`, `fra-null-til-investor2/`, `fra-null-til-investor3/` — FNTI iterations
- `examprep/` — mock exam tool with question models + timeline data (JSX-based, no build step — loaded via CDN?)
- `garmin/` — ? Garmin fitness/activity data page
- `jobs/` — ? job search or applications tracker
- `travel/` — compressed travel photos used in Leaflet map
- `.github/workflows/` — Strava + Letterboxd integrations

## Conventions
- ALL CSS, JS, HTML stays in single file per page (no extracted .css/.js — this is intentional, not a bug)
- Custom-property-driven theming (CSS vars at `:root`)
- 6-language support: nb-NO, en, fr, de, es, nl. Strings driven by `data-i` attributes + JS dictionary
- Email is JS-rendered from character codes after page load. The HTML source must contain only an empty `<a>` element with an empty `<span>` inside — no plain mailto: href and no visible email text. This pattern bypasses Cloudflare email obfuscation entirely. Apply to every page that exposes the email.

## Easter eggs (DO NOT BREAK)
- Type "prins" anywhere → Prins Valiant medieval mode (CSS theme switch + APNG transitions)
- Triple-click profile photo → same medieval mode
- Type "run", "waffle", "thesis", "viking", "mjød" → respective effects
- These are personality features, not bugs. If a refactor risks breaking them, ASK before proceeding.

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
