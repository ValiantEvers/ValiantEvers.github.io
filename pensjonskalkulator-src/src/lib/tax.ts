// =====================================================================
// tax.ts — forenklet norsk skattemodell for pensjonsinntekt
// =====================================================================
//
// Modellen bruker 2025-satser, verifisert mot Skatteetaten
// (Forskuddsmeldingen 2025 / Stortingets skattevedtak for inntektsåret
// 2025). Skattesystemet endres årlig — oppdater konstantene med nytt
// statsbudsjett (regjeringen.no/skatt).
//
// Pensjonsinntekt (folketrygd + OTP + IPS + AFP) beskattes som:
//   - Alminnelig inntekt 22 % på inntekt etter minstefradrag og personfradrag
//   - Trygdeavgift 5,1 % (vs 7,7 % på lønn), med 25 %-opptrappingsregel
//     rett over nedre grense
//   - Trinnskatt 1,7–17,7 % på personinntekt
//   - Skattefradrag for pensjonsinntekt (maks 36 000, trappes ned)
//
// ASK-uttak beskattes ikke som pensjon men som aksjegevinst:
//   - 37,84 % på gevinst-andelen (over skjermingsfradrag, som er liten)
//   - Skjermingsfradrag ignoreres i denne forenklingen
//
// =====================================================================

// 2025-tall — verifisert mot Skatteetaten 2026-07-03
export const TAX_YEAR = 2025

export const ALMINNELIG_INNTEKT_RATE = 0.22

// Personfradrag — trekkes fra alminnelig inntekt før 22 %-satsen
export const PERSONFRADRAG = 108_550

export const TRYGDEAVGIFT_PENSJON_RATE = 0.051
// Nedre grense med opptrappingsregel: avgiften skal ikke overstige 25 % av
// (personinntekt − nedre grense). Glatter overgangen rett over grensen.
export const TRYGDEAVGIFT_NEDRE_GRENSE = 99_650
export const TRYGDEAVGIFT_OPPTRAPPING_RATE = 0.25

// Minstefradrag for pensjonsinntekt
export const MINSTEFRADRAG_RATE = 0.4
export const MINSTEFRADRAG_MAX = 73_150

// Trinnskatt 2025
export const TRINNSKATT_BRACKETS: Array<[number, number, number]> = [
  // [low, high, rate]
  [217_400, 306_050, 0.017],
  [306_050, 697_150, 0.04],
  [697_150, 942_400, 0.137],
  [942_400, 1_410_750, 0.167],
  [1_410_750, Infinity, 0.177],
]

// Skattefradrag for pensjonsinntekt — to-trinns nedtrapping (2025)
export const PENSJONSFRADRAG_MAX = 36_000
export const PENSJONSFRADRAG_TRINN1_GRENSE = 276_400
export const PENSJONSFRADRAG_TRINN2_GRENSE = 422_950
export const PENSJONSFRADRAG_TRINN1_NEDTRAPPING = 0.167
export const PENSJONSFRADRAG_TRINN2_NEDTRAPPING = 0.06

// Aksjegevinstskatt 2025 (oppjustert sats)
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

  // Skattefradrag for pensjonsinntekt (maks 36 000, trappes ned)
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
