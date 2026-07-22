# pensjonskalkulator

Norsk pensjonskalkulator. Live: https://www.evers.no/pensjonskalkulator/

Auto-lastes av Claude Code ved arbeid i `pensjonskalkulator-src/`. Globale
site-regler: `../CLAUDE.md`. Design (cream-familien): `../DESIGN.md`.
Stier nedenfor refererer til repo-roten der annet ikke framgår.

## Struktur
- `pensjonskalkulator-src/` — kildekode (Vite + React + Tailwind + Recharts)
- `pensjonskalkulator/` — bygd output (committed, men generert automatisk av
  GitHub Actions; ikke rediger direkte)

Vite er konfigurert med `outDir: '../pensjonskalkulator'` og
`base: '/pensjonskalkulator/'`. Build-output går rett til deploy-mappen.

## Offentlig kilde-repo (mirror)
Kilden er også publisert som eget offentlig repo:
[`ValiantEvers/pensjonskalkulator`](https://github.com/ValiantEvers/pensjonskalkulator)
(rekrutterer-synlig portefølje). **`pensjonskalkulator-src/` her er fortsatt
kanonisk for deploy** — den live siden bygger fra denne in-tree-kopien, ikke fra
mirror-repoet. De to holdes manuelt i synk ved (~årlige) sats-/G-oppdateringer;
eneste tilsiktede forskjell er at mirror-repoets `vite.config.ts` bygger til
`dist/` (standalone) i stedet for `../pensjonskalkulator`. (De-drift til single
source — submodule / cross-repo-trigger — er en mulig senere oppgave.)

## Deploy
`.github/workflows/build-pensjonskalkulator.yml` bygger og committer
deploy-output ved push til main når noe under `pensjonskalkulator-src/` endres.
Workflow's auto-commit har `[skip ci]` så den ikke trigger seg selv. Krever
"Read and write permissions" i Settings → Actions → General.

Workflow trigger IKKE på sin egen opprettelses-commit (GitHub-quirk) — første
gangs deploy ble committet manuelt i workflow-commiten.

## Modell — ikke-åpenbare valg
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

## Konstanter som må vedlikeholdes årlig
- `G_DEFAULT` i `src/pension-engine.ts` (mai-justert hvert år)
- Skattekonstanter i `src/lib/tax.ts` (oppdateres med nytt statsbudsjett
  vedtatt i desember)
- Standard delingstall (per kohort — endrer seg langsomt med
  levetidsprognoser)

## Viktige filer
- `src/pension-engine.ts` — all matematikk, isolert testbar
- `src/lib/tax.ts` — norsk skattemodell (2025-satser)
- `src/lib/useUrlState.ts` — URL-state sync (delbarhet)
- `src/sanity-test.mjs` — kjør `node src/sanity-test.mjs` for å verifisere
  at modellen ikke er regrert. Forventet output: brutto 24–34k, netto 22–30k
  for defaults (realkroner)

## Tone og design
Match `personligokonomi/` — Fraunces (display) + Manrope (body), cream
`#FAF6EF`, ink `#1A1A1A`, accent `#FF5436`. Redaksjonelt, rolig, ikke
fintech-startup. Ingen utropstegn, ingen "AI-tonet" språk.

## Hva som IKKE er modellert
- Skatt på kapitalinntekt utenom ASK (ASK håndteres separat)
- Uføretrygd
- Offentlig sektor AFP
- Skjermingsfradrag for ASK (forenklet bort)
- Endrede pensjonsregler etter 2024 (ny folketrygdmodell antas konstant)

Alle disse er nevnt i footer-disclaimer'en.
