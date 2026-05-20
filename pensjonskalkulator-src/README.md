# Pensjonskalkulator

Norsk pensjonskalkulator for evers.no. Vite + React + Tailwind. Ingen backend, ingen
tracking, ingen cookies — all beregning skjer i nettleseren.

Deployes under `evers.no/pensjonskalkulator/`.

## Kjøre lokalt

```bash
npm install
npm run dev          # http://localhost:5173/pensjonskalkulator/
npm run typecheck    # TypeScript-validering uten emit
npm run build        # Produksjons-build til dist/
npm run preview      # Forhåndsvis dist/ lokalt
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

- Alminnelig inntekt 22 % på pensjonsinntekt etter minstefradrag
- Trygdeavgift 5,1 % på pensjon (vs 7,8 % på lønn)
- Trinnskatt (5 brakketter, 1,7–17,6 %)
- Pensjonsskattefradrag (maks 33 250, 3-trinns nedtrapping)
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

Bygget havner i `pensjonskalkulator/dist/`. For at GitHub Pages skal servere det under
`evers.no/pensjonskalkulator/` må innholdet i `dist/` flyttes opp ett nivå, slik
`personligokonomi/` er strukturert i hovedrepoet. Eksempel:

```bash
npm run build
rsync -av --delete dist/ ../  # overskriver kilde — bruk med varsomhet
```

Mer praktisk: hold kilden i pensjonskalkulator-mappen, og kopier kun `index.html`,
`assets/` og `favicon.svg` fra `dist/` til ønsket deploy-sti.

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
