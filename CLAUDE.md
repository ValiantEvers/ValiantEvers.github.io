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
- `prosjekter/` — project gallery (`index.html` + `projects.json` + `screenshots/`). Kortene bakes OGSÅ statisk inn mellom `<!--STATIC-CARDS-->`-markørene av `scripts/build_projects_static.py` (workflow: `update-projects-static.yml`) så galleriet er lesbart for crawlere/AI-screenere uten JS — rediger aldri mellom markørene for hånd, endre `projects.json` og la baken kjøre with subpage `masteroppgave/` (scrollytelling thesis presentation). Subpage `finansielle-maler/` is UNLISTED as of 2026-07-09: live at its URL but noindex, no gallery card (`synlig:false` in projects.json), no links, not in sitemap — flip `synlig` back and re-add sitemap/section to relaunch. `forretningsenhet-dashboard/` was REMOVED 2026-07-31 (page, screenshot and projects.json entry) because it claimed SQL/SQLite skills that overstate what I can do; the folder is archived outside the repo under `_til sletting/`.
- `aksjeskatt/` — after-tax return comparison depot vs ASK vs holdingselskap; reads pre-computed `aksjeskatt_grid.json` (deterministic tax engine runs offline, not in the browser)
- `formuessamtalen/` — interaktiv rådgivningsdemo (wealth-management-samtalen: egnethet → kontovalg → møtereferat); reads pre-computed `samtale_grid.json` (same offline skatt-optimizer engine pattern as `aksjeskatt/`, tax math never in the browser). Cream-skin, norsk-only, medieval «prins»-easter-egg
- `klima/` — climate status/myths page, every number with a source reference
- `leie-eller-eie/` — rent-vs-buy interactive calculator (Chart.js from CDN)
- `nb-watch/` — Norges Bank Watch macro dashboard. DISCONTINUED 2026-07-09: the auto-refresh pipeline (`.github/workflows/refresh-nb-watch-data.yml`) was deleted (restore from git history if ever revived); last data is frozen static. Page is unlisted (noindex, out of sitemap) but stays live at its URL
- `nb-watch-src/` — frozen source for nb-watch (Vite + React + Tailwind; crawl-blocked in robots.txt)
- `osebx/` og `wc2026/` — IKKE mapper i dette repoet: egne prosjekt-repoer (ValiantEvers/osebx, ValiantEvers/wc2026) servert under evers.no-stiene via GitHub Pages prosjektside-ruting
- `personligokonomi/` — separate sub-app (built from personligokonomi repo)
- `pensjonskalkulator/` — bygd output for pensjonskalkulator (generert av GitHub Actions, ikke rediger direkte)
- `pensjonskalkulator-src/` — kildekode for pensjonskalkulatoren (Vite + React + Tailwind + Recharts). Har egen `CLAUDE.md` (auto-lastes ved arbeid i mappa): modellvalg, årlige konstanter, mirror-synk, deploy
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
  **FRYST 2026-08-14 (supersederer over):** fr/de/ja er frosset — knappene er fjernet fra
  språkmenyene og lagret `ve-lang` faller tilbake til no, men ordbøkene BESTÅR i koden for
  reversibilitet. Nytt/endret innhold vedlikeholdes kun i **no + en (+ medieval)** — ikke
  oppdater fr/de/ja-strenger, og ikke re-eksponer knappene uten eksplisitt ønske.
  Bakgrunn: hver tekstendring kostet 6 redigeringer (motstandsgjennomgang 2026-08-14).
- Email is JS-rendered from character codes after page load. The HTML source must contain only an empty `<a>` element with an empty `<span>` inside — no plain mailto: href and no visible email text. This pattern bypasses Cloudflare email obfuscation entirely. Apply to every page that exposes the email.
- Telefonnummeret følger samme mønster (2026-08-14): tomt `<a>` + `<span>`, `tel:`-href og visningstekst bygges fra tegnkoder i `setPhone()` etter load. Aldri `tel:`-href eller nummer i klartekst i HTML-kilden.

## Offentlig repo — hygiene (stående påminnelse fra Valiant, 2026-08-14)

Dette repoet er OFFENTLIG, og commit-historikken kan ikke trekkes tilbake. Motstandsgjennomgangen
2026-08-14 fant at prep-sidene røpet jobbsøket i sanntid: mappenavnene (`unifor/`, `oslobors/`)
sa HVOR det ble intervjuet, og commit-meldinger som «personlig quiz (generalprøvens feilsvar som
distraktorer)» og «nytt passord» sa HVA og NÅR. Reglene for alt lignende i framtiden:

- **Prep-/intervjuinnhold:** nøytrale mappenavn og nøytrale commit-meldinger («prep: oppdatert
  innhold» — aldri arbeidsgivernavn, aldri intervjudetaljer, aldri passordhint).
- **Passord:** aldri hentet fra intervjukonteksten (gate, tema, navn) — de eneste som finner
  sidene er akkurat de som kan gjette slike passord.
- **Vurder privat repo/Workers** (jobblogg-mønsteret) før neste prep-hub bygges her.
- strategi.html serverer scoringen (PROFILE/priorityCompanies) i klartekst — dette er en
  AKSEPTERT risiko (Valiants beslutning 2026-08-14), men ikke utvid hva som ligger der.

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

Egg-jegeren (2026-08-14): en diskret 🥚-teller i footeren (`#eggBadge`, localStorage `ve-eggs`)
som dukker opp først når det FØRSTE egget er funnet, med gåtehint for resten. Den bruker EGNE
lyttere (egen buffer + egen konami-speiling + MutationObserver på `data-theme` for medieval) og
rører aldri trigger-koden — men endres/legges det til et egg, MÅ `EGGS`/`WORDS`-listene i
egg-jeger-scriptet nederst i index.html oppdateres. «jobb»-egget telles ALDRI og skal aldri inn
i listene (privat). Touch-gates som resten av eggene.

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

## Regelfiler (les ved behov)

| Situasjon | Les først |
|---|---|
| Arbeid på pensjonskalkulatoren (kildekode, deploy-workflow, mirror-synk) | `pensjonskalkulator-src/CLAUDE.md` — auto-lastes når du jobber i mappa |
| Bygge ny side eller redesigne en eksisterende | `DESIGN.md` — følg sjekklisten nederst |

Cream-familien: `personligokonomi/`, `pensjonskalkulator(-src)/`, `fra-null-til-investor{,2,3}/`
og `formuessamtalen/` bruker Fraunces + Manrope på cream `#FAF6EF` — ikke Inter-kjernen.
Detaljer: DESIGN.md § Typography (to familier er bevisst, ikke drift).
