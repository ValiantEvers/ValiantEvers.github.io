// =====================================================================
// tax.ts — forenklet norsk skattemodell for pensjonsinntekt
// =====================================================================
//
// Modellen er kalibrert mot 2025-satser. CC: før produksjon, verifiser
// mot siste statsbudsjett (regjeringen.no/skatt). Skattesystemet endres
// årlig.
//
// Pensjonsinntekt (folketrygd + OTP + IPS + AFP) beskattes som:
//   - Alminnelig inntekt 22 % på inntekt etter minstefradrag
//   - Trygdeavgift 5,1 % (vs 7,8 % på lønn)
//   - Trinnskatt 1,7–17,6 % på personinntekt
//   - Pensjonsskattefradrag (maks ~33 250, trappes ned)
//
// ASK-uttak beskattes ikke som pensjon men som aksjegevinst:
//   - 37,84 % på gevinst-andelen (over skjermingsfradrag, som er liten)
//   - Skjermingsfradrag ignoreres i denne forenklingen
//
// =====================================================================

// 2025-tall — verifiser før produksjon
export const TAX_YEAR = 2025

export const ALMINNELIG_INNTEKT_RATE = 0.22
export const TRYGDEAVGIFT_PENSJON_RATE = 0.051
export const TRYGDEAVGIFT_LOWER_LIMIT = 25_000 // pensjon under denne grensen ikke trygdeavgift

// Minstefradrag for pensjonsinntekt
export const MINSTEFRADRAG_RATE = 0.4
export const MINSTEFRADRAG_MAX = 90_800

// Trinnskatt 2025
export const TRINNSKATT_BRACKETS: Array<[number, number, number]> = [
  // [low, high, rate]
  [217_400, 306_050, 0.017],
  [306_050, 697_150, 0.04],
  [697_150, 942_400, 0.136],
  [942_400, 1_410_750, 0.166],
  [1_410_750, Infinity, 0.176],
]

// Pensjonsskattefradrag — forenklet 3-trinns nedtrapping (2025)
export const PENSJONSFRADRAG_MAX = 33_250
export const PENSJONSFRADRAG_TRINN1_GRENSE = 219_950
export const PENSJONSFRADRAG_TRINN2_GRENSE = 359_700
export const PENSJONSFRADRAG_TRINN1_NEDTRAPPING = 0.167
export const PENSJONSFRADRAG_TRINN2_NEDTRAPPING = 0.067

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
  const alminneligInntekt = Math.max(0, annualGrossPensionIncome - minstefradrag)
  const inntektsskatt = alminneligInntekt * ALMINNELIG_INNTEKT_RATE

  // Trygdeavgift på brutto pensjon (under grense = 0)
  const trygdeavgift =
    annualGrossPensionIncome > TRYGDEAVGIFT_LOWER_LIMIT
      ? annualGrossPensionIncome * TRYGDEAVGIFT_PENSJON_RATE
      : 0

  // Trinnskatt på personinntekt (= brutto pensjonsinntekt)
  let trinnskatt = 0
  for (const [low, high, rate] of TRINNSKATT_BRACKETS) {
    if (annualGrossPensionIncome > low) {
      trinnskatt += (Math.min(annualGrossPensionIncome, high) - low) * rate
    }
  }

  // Pensjonsskattefradrag (max 33 250, trappes ned)
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
