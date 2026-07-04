# Pensjonskalkulator

Norsk pensjonskalkulator for evers.no. Vite + React + Tailwind. Ingen backend, ingen
tracking, ingen cookies — all beregning skjer i nettleseren.

Deployes under `evers.no/pensjonskalkulator/`.

## Kjøre lokalt

```bash
npm install
npm run dev          # http://localhost:5173/pensjonskalkulator/
npm run typecheck    # TypeScript-validering uten emit
npm run build        # Produksjons-build til ../pensjonskalkulator/ (deploy-mappen)
npm run preview      # Forhåndsvis bygget lokalt
```

## Sanity-test av beregningsmotoren

`src/pension-engine.ts` kan kjøres isolert fra UI. En selvstendig sanity-test ligger
i `src/sanity-test.mjs`:

```bash
node src/sanity-test.mjs
```

Den verifiserer at standardinput (alder 30, pensjon 67, lønn 650 000, OTP 2 %) gir
månedlig pensjon i intervallet 22 000–30 000 kr (realkroner).

## Beregning

All matematikk og dokumentasjon ligger i [`src/pension-engine.ts`](src/pension-engine.ts).
Filen er bevisst skrevet uten React-avhengigheter slik at den er testbar isolert.
De viktigste antakelsene:

- Lønnsvekst og inflasjon oppgis nominelt. Realavkastning oppgis real.
- All compounding internt skjer i nominelle kroner.
- Deflatering til realkroner skjer kun for visning.
- Nominell avkastning = `(1 + real_avk) × (1 + inflasjon) − 1`.
- Folketrygd: 18,1 % av min(lønn, 7,1 G) per år, indeksert med lønnsvekst.
  Månedlig = beholdning / delingstall / 12.
- Tjenestepensjon, IPS, ASK: compound med nominell avkastning i opptjeningsfasen.
  Utbetalingsfasen modelleres som rentebærende annuitet (PMT-formel) for
  tjenestepensjon, IPS og ASK, med separat lavere realavkastning (default 2 %) for å
  reflektere de-risking. Folketrygd bruker NAVs delingstall som allerede inkluderer en
  indekseringsforutsetning.
- Privat AFP: forenklet 0,8 × G / 12 livsvarig.
- G per 1. mai 2025 = 130 160 kr. Oppdater i `pension-engine.ts` ved nye verdier.
- Garantipensjon-floor (`1,9 × G/år`) anvendes på folketrygd-utbetalingen, slik at
  lavinntektsbrukere ikke får underestimert pensjonen. Flagget
  `folketrygdAtGarantipensjonFloor` i resultatet sier om floor'en ble brukt.

## Skattemodell

Modellen i `src/lib/tax.ts` er kalibrert mot **2025-satser** og dekker:

- Alminnelig inntekt 22 % på pensjonsinntekt etter minstefradrag og personfradrag
- Trygdeavgift 5,1 % på pensjon (vs 7,7 % på lønn), med 25 %-opptrappingsregel
  rett over nedre grense
- Trinnskatt (5 brakketter, 1,7–17,7 %)
- Skattefradrag for pensjonsinntekt (maks 36 000, to-trinns nedtrapping)
- ASK beskattes separat som aksjegevinst, 37,84 % på gevinst-andelen

Skatten anvendes på **real** (dagens kjøpekraft) pensjonsinntekt, ikke
nominell. Det forutsetter at skattebraktene justeres med inflasjon i takt
med pensjonen — en standard antakelse for langsiktig pensjonsmodellering.
Uten dette ville en pensjon på X real i 2063 blitt beskattet med 2025-brakter
på sin nominelle verdi, som ville overestimert skatten dramatisk (bracket creep).

Før produksjon: verifiser mot siste statsbudsjett på
[regjeringen.no/skatt](https://www.regjeringen.no/no/tema/okonomi-og-budsjett/skatter-og-avgifter/id1456/).
Skattesystemet endres årlig. Forenklinger: skjermingsfradrag på ASK
ignoreres, og hele pensjonen antas tatt ut samme år (ingen separat
formuesskatt eller andre skatter modellert).

## URL-state

Alle inputs synkroniseres til URL'en (debounce 200 ms), slik at lenker kan
deles. Kun ikke-default-verdier havner i query-stringen for å holde URLene
korte. Logikken ligger i `src/lib/useUrlState.ts`.

## Deploy til evers.no

Deploy er automatisk. `.github/workflows/build-pensjonskalkulator.yml` bygger og
committer output til søsken-mappen `../pensjonskalkulator/` ved push til main når
noe under `pensjonskalkulator-src/` endres (auto-commiten har `[skip ci]` så den
ikke trigger seg selv). Ikke rediger `../pensjonskalkulator/` direkte, og ingen
manuell kopiering av build-output er nødvendig.

`vite.config.ts` har `outDir: '../pensjonskalkulator'` (med `emptyOutDir`), så et
lokalt `npm run build` skriver også rett til deploy-mappen — CI regenererer den
uansett ved neste push til main.

Det offentlige mirror-repoet
([ValiantEvers/pensjonskalkulator](https://github.com/ValiantEvers/pensjonskalkulator))
bygger i stedet standalone til `dist/` — den eneste tilsiktede forskjellen mellom
de to kopiene.

## Struktur

```
pensjonskalkulator/
├── index.html              Vite entry
├── package.json
├── vite.config.ts          base: '/pensjonskalkulator/'
├── tailwind.config.js      farger og fonter matchet personligokonomi
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css           Tailwind + range slider styling
    ├── pension-engine.ts   all beregningslogikk (testbar isolert)
    ├── sanity-test.mjs     standalone smoke-test
    ├── components/
    │   ├── HeroNumber.tsx
    │   ├── InputPanel.tsx
    │   ├── InputControls.tsx
    │   ├── PensionChart.tsx
    │   ├── GapAnalysis.tsx
    │   ├── DisplayToggle.tsx
    │   └── Footer.tsx
    └── lib/
        ├── format.ts                 nb-NO tallformat
        ├── colors.ts                 fargetokens per pensjonskilde
        └── usePrefersReducedMotion.ts
```
