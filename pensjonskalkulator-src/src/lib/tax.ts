// =====================================================================
// tax.ts — forenklet norsk skattemodell for pensjonsinntekt
// =====================================================================
//
// Modellen bruker 2026-satser, verifisert mot Stortingets skattevedtak for
// inntektsåret 2026 (lovdata.no/dokument/STV/forskrift/2025-12-18-2747,
// sist endret 19.06.2026) og skatteloven § 16-1 (endret ved lov 23.06.2026
// nr. 66). Skattesystemet endres årlig — oppdater konstantene med nytt
// statsbudsjett, og sjekk revidert budsjett i juni: det endret
// pensjonsfradraget midt i 2026.
//
// Pensjonsinntekt (folketrygd + OTP + IPS + AFP) beskattes som:
//   - Alminnelig inntekt 22 % på inntekt etter minstefradrag og personfradrag
//   - Trygdeavgift 5,1 % (vs 7,6 % på lønn), med 25 %-opptrappingsregel
//     rett over nedre grense
//   - Trinnskatt 1,7–17,8 % på personinntekt
//   - Skattefradrag for pensjonsinntekt (maks 39 100, trappes ned)
//
// ASK-uttak beskattes ikke som pensjon men som aksjegevinst:
//   - 37,84 % på gevinst-andelen (over skjermingsfradrag, som er liten)
//   - Skjermingsfradrag ignoreres i denne forenklingen
//
// =====================================================================

// 2026-tall — verifisert mot Lovdata 2026-10-15, avstemt mot
// skatt-mcp/src/data/satser/2026.json (alle felles felt like)
export const TAX_YEAR = 2026

export const ALMINNELIG_INNTEKT_RATE = 0.22

// Personfradrag — trekkes fra alminnelig inntekt før 22 %-satsen
export const PERSONFRADRAG = 114_540

export const TRYGDEAVGIFT_PENSJON_RATE = 0.051
// Nedre grense med opptrappingsregel: avgiften skal ikke overstige 25 % av
// (personinntekt − nedre grense). Glatter overgangen rett over grensen.
export const TRYGDEAVGIFT_NEDRE_GRENSE = 99_650
export const TRYGDEAVGIFT_OPPTRAPPING_RATE = 0.25

// Minstefradrag for pensjonsinntekt
export const MINSTEFRADRAG_RATE = 0.4
export const MINSTEFRADRAG_MAX = 75_400

// Trinnskatt 2026 (trinn 4 og 5 hevet 0,1 pp)
export const TRINNSKATT_BRACKETS: Array<[number, number, number]> = [
  // [low, high, rate]
  [226_100, 318_300, 0.017],
  [318_300, 725_050, 0.04],
  [725_050, 980_100, 0.137],
  [980_100, 1_467_200, 0.168],
  [1_467_200, Infinity, 0.178],
]

// Skattefradrag for pensjonsinntekt — to-trinns nedtrapping (2026, etter
// revidert budsjett). Beløpene står i skattevedtaket § 6-5, satsene i
// skatteloven § 16-1 tredje ledd. NB: regjeringens satsside (22.12.2025)
// viser fortsatt 37 100 / 284 950 / 16,7 %, og Skatteetatens satsside var
// halvveis oppdatert 2026-10-15 (39 100, men gamle grenser og 16,7 %).
// Lovteksten er fasit.
export const PENSJONSFRADRAG_MAX = 39_100
export const PENSJONSFRADRAG_TRINN1_GRENSE = 294_200
export const PENSJONSFRADRAG_TRINN2_GRENSE = 437_100
export const PENSJONSFRADRAG_TRINN1_NEDTRAPPING = 0.191
export const PENSJONSFRADRAG_TRINN2_NEDTRAPPING = 0.06

// Aksjegevinstskatt 2026 (oppjustert sats, faktor 1,72 uendret)
export const ASK_GAIN_TAX_RATE = 0.3784

/**
 * Beregn årlig skatt på pensjonsinntekt (folketrygd + OTP + IPS + AFP).
 * Returnerer totalt skattebeløp.
 */
export function calculatePensionTax(annualGrossPensionIncome: number): number {
  if (annualGrossPensionIncome <= 0) return 0

  // Minstefradrag: 40 % av pensjonsinntekt, kapet
  const minstefradrag = Math.min(
    annualGrossPensionIncome * MINSTEFRADRAG_RATE,
    MINSTEFRADRAG_MAX,
  )
  // Personfradrag trekkes fra alminnelig inntekt før 22 %-satsen
  const alminneligInntekt = Math.max(
    0,
    annualGrossPensionIncome - minstefradrag - PERSONFRADRAG,
  )
  const inntektsskatt = alminneligInntekt * ALMINNELIG_INNTEKT_RATE

  // Trygdeavgift: 5,1 % av brutto pensjon, men aldri mer enn 25 % av
  // inntekten over nedre grense (opptrappingsregelen). Under grensen = 0.
  const trygdeavgift = Math.max(
    0,
    Math.min(
      annualGrossPensionIncome * TRYGDEAVGIFT_PENSJON_RATE,
      TRYGDEAVGIFT_OPPTRAPPING_RATE *
        (annualGrossPensionIncome - TRYGDEAVGIFT_NEDRE_GRENSE),
    ),
  )

  // Trinnskatt på personinntekt (= brutto pensjonsinntekt)
  let trinnskatt = 0
  for (const [low, high, rate] of TRINNSKATT_BRACKETS) {
    if (annualGrossPensionIncome > low) {
      trinnskatt += (Math.min(annualGrossPensionIncome, high) - low) * rate
    }
  }

  // Skattefradrag for pensjonsinntekt (maks 39 100, trappes ned)
  let pensjonsfradrag = 0
  if (annualGrossPensionIncome <= PENSJONSFRADRAG_TRINN1_GRENSE) {
    pensjonsfradrag = PENSJONSFRADRAG_MAX
  } else if (annualGrossPensionIncome <= PENSJONSFRADRAG_TRINN2_GRENSE) {
    pensjonsfradrag = Math.max(
      0,
      PENSJONSFRADRAG_MAX -
        (annualGrossPensionIncome - PENSJONSFRADRAG_TRINN1_GRENSE) *
          PENSJONSFRADRAG_TRINN1_NEDTRAPPING,
    )
  } else {
    const trinn1Reduksjon =
      (PENSJONSFRADRAG_TRINN2_GRENSE - PENSJONSFRADRAG_TRINN1_GRENSE) *
      PENSJONSFRADRAG_TRINN1_NEDTRAPPING
    const trinn2Reduksjon =
      (annualGrossPensionIncome - PENSJONSFRADRAG_TRINN2_GRENSE) *
      PENSJONSFRADRAG_TRINN2_NEDTRAPPING
    pensjonsfradrag = Math.max(
      0,
      PENSJONSFRADRAG_MAX - trinn1Reduksjon - trinn2Reduksjon,
    )
  }

  return Math.max(0, inntektsskatt + trygdeavgift + trinnskatt - pensjonsfradrag)
}

/**
 * Beregn skatt på årlig ASK-uttak. Skatten er kun på gevinstandelen.
 * gevinstAndel: 0–1, andel av uttaket som er urealisert gevinst (resten er innskutt kapital).
 */
export function calculateAskTax(annualAskWithdrawal: number, gevinstAndel: number): number {
  if (annualAskWithdrawal <= 0) return 0
  const taxableAmount = annualAskWithdrawal * Math.max(0, Math.min(1, gevinstAndel))
  return taxableAmount * ASK_GAIN_TAX_RATE
}
