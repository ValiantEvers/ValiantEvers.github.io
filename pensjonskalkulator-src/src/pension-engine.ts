// =====================================================================
// pension-engine.ts
// =====================================================================
//
// Forenklet pensjonsberegning for Norge (ny folketrygd-modell + innskuddspensjon).
//
// Konvensjon for real/nominell:
//   - Lønnsvekst og inflasjon oppgis nominelt.
//   - Realavkastning oppgis real.
//   - All compounding internt skjer i NOMINELLE kroner.
//   - Deflatering til realkroner skjer kun for visning (i UI), aldri internt.
//
// Sammenheng:
//   nominell_avk = (1 + real_avk) × (1 + inflasjon) - 1
//
// Pensjonskilder (alle forenklet):
//
//   1. Folketrygd (alderspensjon, ny modell)
//      Hvert år: opptjening = 18,1 % × min(lønn_år, 7,1 × G_år).
//      Pensjonsbeholdning vokser med nominell lønnsvekst (forenkling: ingen
//      separat reguleringssats før/etter uttak).
//      Ved pensjonsalder: månedlig = beholdning / delingstall / 12, livsvarig.
//
//   2. Tjenestepensjon (innskuddspensjon)
//      Årlig innskudd = sats_lav × min(lønn, 7,1G) + sats_høy × max(0, min(lønn, 12G) − 7,1G).
//      Compound med nominell avkastning i opptjeningsfasen.
//      PMT-annuitet (rentebærende) over utbetalingstid med payoutNominalReturn.
//
//   3. IPS (Individuell PensjonsSparing)
//      Årlig bidrag (begrenset til 15 000 kr) compound med nominell avkastning.
//      PMT-annuitet over utbetalingstid.
//
//   4. Annen sparing (ASK / fondskonto)
//      Månedlig bidrag compound med nominell avkastning.
//      PMT-annuitet over utbetalingstid.
//
//   5. AFP (privat, sterkt forenklet, kun hvis toggle på)
//      Livsvarig 0,8 × G / 12 per måned fra pensjonsalder. Faktisk privat AFP
//      avhenger av lønnshistorikk, kvalifiseringsår og bedriftsavtale.
//
// Annuitet-konvensjon (hybrid):
//   - Folketrygd bruker naiv balanse / delingstall / 12. NAVs delingstall har
//     allerede en innebakt indekseringsforutsetning (~0,75 %/år), så en
//     rentebærende annuitet på toppen ville dobbelttelle.
//   - OTP / IPS / ASK bruker PMT-formelen med en egen, typisk lavere realavkastning
//     i utbetalingsfasen (payoutRealReturn) for å reflektere de-risking.
//
// =====================================================================

import { calculatePensionTax, calculateAskTax } from './lib/tax'

// G per 1. mai 2026 = 136 549 kr.
// Bekreftet fra NAV, lest 2026-08-20. Sjekk https://www.nav.no/grunnbelopet
// for siste verdi. Oppdateres hvert år etter trygdeoppgjøret i mai.
export const G_DEFAULT = 136_549
export const G_DEFAULT_AS_OF = '1. mai 2026'

// Gjennomsnittlig G per år = 134 419 kr for 2026 (NAV oppgir begge tallene på
// samme side, lest 2026-08-20). Gjennomsnittet er lavere enn selve G fordi
// beløpet oppdateres 1. mai og ikke 1. januar.
//
// Dette er IKKE det samme tallet som G_DEFAULT, og forskjellen har praktisk
// betydning: NAV skriver at alderspensjon tjenes opp med 18,1 prosent av
// inntekt «opp til 7,1 ganger gjennomsnittlig grunnbeløp». Regner man taket av
// mai-verdien i stedet, blir taket 2 130 kr for høyt i 2026, og opptjeningen
// for lønn over taket tilsvarende for høy.
export const G_SNITT_DEFAULT = 134_419

// Forholdet mellom gjennomsnittlig G og G per 1. mai (0,9844 for 2026).
// Brukes som faktor og ikke som fast tall, slik at en bruker som overstyrer G
// i skjemaet fortsatt får et gjennomsnitt som følger sin egen verdi.
export const G_SNITT_FAKTOR = G_SNITT_DEFAULT / G_DEFAULT

// Lovlig maks årlig innbetaling til IPS. 25 000 kr fra og med inntektsåret
// 2026, hevet fra 15 000 kr som gjaldt til og med 2025 (Skatteetaten, lest
// 2026-08-19). Sjekk satssiden ved årsskiftet.
export const IPS_ANNUAL_MAX = 25_000

// 7,1G og 12G er grenser for pensjonsopptjening i folketrygd / tjenestepensjon
export const G_CAP_LOW = 7.1
export const G_CAP_HIGH = 12

// 18,1 % er folketrygdens opptjeningssats
export const FOLKETRYGD_OPPTJENING_RATE = 0.181

// AFP privat (forenklet): livsvarig 0,8 × G/12 per måned
export const AFP_RATE_OF_G = 0.8

// Garantipensjon (minste pensjonsnivå) for enslige, ca 1,9 G per år.
// Faktisk sats varierer med sivilstand, kommunale tilskudd og bostedsland.
export const GARANTIPENSJON_G_FACTOR = 1.9

export interface PensionInputs {
  currentAge: number
  retirementAge: number
  salaryGross: number // kr/år i dagens kr
  wageGrowthNominal: number // f.eks. 0.03 for 3 %
  existingFolketrygdBalance: number // pensjonsbeholdning hos NAV i dag
  existingOtpBalance: number // tjenestepensjon-saldo i dag
  existingIpsBalance: number // IPS-saldo i dag
  existingAskBalance: number // ASK/fondskonto-saldo i dag
  otpRateLow: number // 0..0.07 typisk (av lønn opp til 7,1G)
  otpRateHigh: number // 0..0.181 (av lønn i båndet 7,1G–12G)
  ipsAnnualContribution: number // kr/år, capet på IPS_ANNUAL_MAX internt
  askMonthlyContribution: number // kr/mnd
  includeAfp: boolean
  G: number
  inflationNominal: number // f.eks. 0.025
  realReturn: number // f.eks. 0.04 — opptjeningsfasen
  payoutRealReturn: number // f.eks. 0.02 — utbetalingsfasen (typisk lavere fordi pensjonister de-risker)
  delingstall: number
  otpPayoutYears: number
  ipsPayoutYears: number
  askPayoutYears: number
  targetReplacementRatio: number // f.eks. 0.70
}

export interface YearSnapshot {
  age: number
  yearOffset: number
  inflationFactor: number // (1+inflation)^yearOffset
  // Nominelle balanser i slutten av året
  folketrygdBalance: number
  otpBalance: number
  ipsBalance: number
  askBalance: number
  // Nominell månedlig utbetaling i året (0 før pensjon, 0 etter at utbetalingstiden er over)
  monthlyFolketrygd: number
  monthlyOtp: number
  monthlyIps: number
  monthlyAsk: number
  monthlyAfp: number
  salaryNominal: number // 0 etter pensjon
}

export interface MonthlyBreakdown {
  folketrygd: number
  otp: number
  ips: number
  ask: number
  afp: number
  total: number
  tax: number
  net: number
}

export interface PensionResult {
  inputs: PensionInputs
  nominalReturn: number
  yearsToRetirement: number
  series: YearSnapshot[]
  // Snapshot av månedlige utbetalinger første år som pensjonist (konstant nominell sum gjennom utbetalingstiden)
  monthlyAtRetirementNominal: MonthlyBreakdown
  monthlyAtRetirementReal: MonthlyBreakdown
  finalSalaryNominal: number
  finalSalaryReal: number
  replacementRatio: number
  askGevinstAndel: number // 0..1 — andel av ASK-balansen som er gevinst ved pensjon
  effectiveTaxRate: number // 0..1 — snitt skattesats anvendt
  folketrygdAtGarantipensjonFloor: boolean // true hvis garantipensjon-floor ble brukt
  gapAnalysis: {
    targetMonthlyReal: number
    currentMonthlyReal: number
    extraAskMonthlyToday: number // kr/mnd i dagens kr — 0 hvis allerede over målet
    onTrack: boolean
  }
  // Topp på balanse ved pensjonsalder
  peakBalances: {
    folketrygd: number
    otp: number
    ips: number
    ask: number
  }
}

export function calculatePension(inputs: PensionInputs): PensionResult {
  const {
    currentAge,
    retirementAge,
    salaryGross,
    wageGrowthNominal: g,
    existingFolketrygdBalance,
    existingOtpBalance,
    existingIpsBalance,
    existingAskBalance,
    otpRateLow,
    otpRateHigh,
    ipsAnnualContribution,
    askMonthlyContribution,
    includeAfp,
    G,
    inflationNominal,
    realReturn,
    payoutRealReturn,
    delingstall,
    otpPayoutYears,
    ipsPayoutYears,
    askPayoutYears,
    targetReplacementRatio,
  } = inputs

  // nominell_avk = (1 + real_avk) × (1 + inflasjon) - 1
  const nominalReturn = (1 + realReturn) * (1 + inflationNominal) - 1

  const yearsToRetirement = Math.max(0, retirementAge - currentAge)

  // Visualiser til siste relevante utbetalingsår + et lite tillegg.
  // Folketrygd og AFP er livsvarig — ikke begrensende.
  // Defensivt tak på 120 år så ekstreme inputs ikke kan fryse fanen.
  const visualizeEndAge =
    retirementAge + Math.max(otpPayoutYears, ipsPayoutYears, askPayoutYears) + 2
  const totalYears = Math.min(visualizeEndAge - currentAge, 120)

  // IPS er capet på IPS_ANNUAL_MAX per år (norske skatteregler). Tallet står
  // ett sted, i konstanten, så det ikke råtner i en kommentar.
  const ipsAnnualCapped = Math.min(Math.max(0, ipsAnnualContribution), IPS_ANNUAL_MAX)

  // Initielle balanser — én per pensjonskilde.
  let folketrygdBalance = existingFolketrygdBalance
  let otpBalance = existingOtpBalance
  let ipsBalance = existingIpsBalance
  let askBalance = existingAskBalance

  // Akkumulert innskutt kapital i ASK. Brukes for gevinst-andel-beregning ved skatt.
  // Antar konservativt at hele eksisterende balansen er innskutt kapital.
  let askTotalContributions = existingAskBalance

  const series: YearSnapshot[] = []

  // Balanser ved pensjonsalder (snapshot tatt etter siste arbeidsår)
  let retirementFolketrygdBalance = 0
  let retirementOtpBalance = 0
  let retirementIpsBalance = 0
  let retirementAskBalance = 0
  let retirementSalaryNominal = 0
  let retirementG = G

  // Konstante månedlige utbetalinger (nominelt) — hybrid:
  //   - Folketrygd: naiv balanse / delingstall / 12 (delingstall har innebakt indekseringsforutsetning)
  //   - OTP / IPS / ASK: rentebærende PMT-annuitet med payoutNominalReturn
  let monthlyFolketrygd = 0
  let monthlyOtp = 0
  let monthlyIps = 0
  let monthlyAsk = 0
  let monthlyAfp = 0

  // Avkastning i utbetalingsfasen (typisk lavere fordi pensjonister de-risker).
  const payoutNominalReturn = (1 + payoutRealReturn) * (1 + inflationNominal) - 1
  const monthlyPayoutRate = Math.pow(1 + payoutNominalReturn, 1 / 12) - 1

  // PMT-formel: konstant månedlig utbetaling som tømmer balansen på N år
  // med månedlig rente monthlyPayoutRate.
  const pmt = (balance: number, years: number): number => {
    if (years <= 0 || balance <= 0) return 0
    const n = years * 12
    if (monthlyPayoutRate === 0) return balance / n
    return (balance * monthlyPayoutRate) / (1 - Math.pow(1 + monthlyPayoutRate, -n))
  }

  // Snapshot ved yearOffset = 0 (i dag)
  series.push({
    age: currentAge,
    yearOffset: 0,
    inflationFactor: 1,
    folketrygdBalance,
    otpBalance,
    ipsBalance,
    askBalance,
    monthlyFolketrygd: 0,
    monthlyOtp: 0,
    monthlyIps: 0,
    monthlyAsk: 0,
    monthlyAfp: 0,
    salaryNominal: salaryGross,
  })

  // Allerede ved/over pensjonsalder: frys balansene nå og beregn månedlige
  // utbetalinger (inkl. garantipensjon-floor) umiddelbart — ellers ville
  // loopens "siste arbeidsår"-gren aldri truffet og resultatet blitt 0 kr.
  if (yearsToRetirement === 0) {
    retirementFolketrygdBalance = folketrygdBalance
    retirementOtpBalance = otpBalance
    retirementIpsBalance = ipsBalance
    retirementAskBalance = askBalance
    retirementSalaryNominal = salaryGross
    retirementG = G

    const beregnetMonthlyFolketrygd = retirementFolketrygdBalance / delingstall / 12
    const monthlyGarantipensjonNominal = (GARANTIPENSJON_G_FACTOR * retirementG) / 12
    monthlyFolketrygd = Math.max(beregnetMonthlyFolketrygd, monthlyGarantipensjonNominal)
    monthlyOtp = pmt(retirementOtpBalance, otpPayoutYears)
    monthlyIps = pmt(retirementIpsBalance, ipsPayoutYears)
    monthlyAsk = pmt(retirementAskBalance, askPayoutYears)
    monthlyAfp = includeAfp ? (AFP_RATE_OF_G * retirementG) / 12 : 0
  }

  for (let yearOffset = 1; yearOffset <= totalYears; yearOffset++) {
    const age = currentAge + yearOffset
    const inflationFactor = Math.pow(1 + inflationNominal, yearOffset)

    if (yearOffset <= yearsToRetirement) {
      // ARBEIDSÅR — bidrag og avkastning legges til.
      //
      // Konvensjon: lønn i år `yearOffset` (mellom alder currentAge+yearOffset-1 og currentAge+yearOffset)
      // = salaryGross × (1+g)^(yearOffset-1). Slik vokser lønnen 1 år av gangen fra dagens nivå.
      const yearsFromNow = yearOffset - 1 // antall fulle år lønnsvekst har virket fra dagens kr
      const salaryThisYear = salaryGross * Math.pow(1 + g, yearsFromNow)
      const G_thisYear = G * Math.pow(1 + g, yearsFromNow)

      // Opptjeningstakene regnes av GJENNOMSNITTLIG G, ikke av mai-verdien.
      // NAV: «opp til 7,1 ganger gjennomsnittlig grunnbeløp i folketrygden».
      // Modellvalg: 12 G-båndet regnes av samme grunnlag som 7,1 G, slik at
      // båndet mellom dem verken overlapper eller får et hull. Den delen har
      // ikke sin egen kilde og er en bevisst forenkling.
      const G_snittThisYear = G_thisYear * G_SNITT_FAKTOR

      const cappedLow = Math.min(salaryThisYear, G_CAP_LOW * G_snittThisYear)
      const cappedHigh = Math.max(
        0,
        Math.min(salaryThisYear, G_CAP_HIGH * G_snittThisYear) - G_CAP_LOW * G_snittThisYear,
      )

      // Folketrygd: balanse vokser med lønnsvekst, deretter legges årets opptjening til.
      // Dette er ekvivalent med "compound + bidrag på slutten av året".
      const folketrygdContrib = FOLKETRYGD_OPPTJENING_RATE * cappedLow
      folketrygdBalance = folketrygdBalance * (1 + g) + folketrygdContrib

      // Tjenestepensjon: årlig innskudd, nominell avkastning.
      const otpAnnualContrib = otpRateLow * cappedLow + otpRateHigh * cappedHigh
      otpBalance = otpBalance * (1 + nominalReturn) + otpAnnualContrib

      // IPS: årlig bidrag (capet), nominell avkastning.
      ipsBalance = ipsBalance * (1 + nominalReturn) + ipsAnnualCapped

      // ASK: månedlig bidrag (samlet som årlig sum), nominell avkastning.
      const askAnnualContrib = askMonthlyContribution * 12
      askBalance = askBalance * (1 + nominalReturn) + askAnnualContrib
      askTotalContributions += askAnnualContrib

      // Hvis dette var siste arbeidsår, fryser vi pensjonsbalanser og regner månedlig.
      if (yearOffset === yearsToRetirement) {
        retirementFolketrygdBalance = folketrygdBalance
        retirementOtpBalance = otpBalance
        retirementIpsBalance = ipsBalance
        retirementAskBalance = askBalance
        retirementSalaryNominal = salaryThisYear
        retirementG = G_thisYear

        // Folketrygd: naiv divisjon, men ikke under garantipensjon (minste pensjonsnivå).
        const beregnetMonthlyFolketrygd = retirementFolketrygdBalance / delingstall / 12
        const monthlyGarantipensjonNominal = (GARANTIPENSJON_G_FACTOR * retirementG) / 12
        monthlyFolketrygd = Math.max(beregnetMonthlyFolketrygd, monthlyGarantipensjonNominal)
        monthlyOtp = pmt(retirementOtpBalance, otpPayoutYears)
        monthlyIps = pmt(retirementIpsBalance, ipsPayoutYears)
        monthlyAsk = pmt(retirementAskBalance, askPayoutYears)
        monthlyAfp = includeAfp ? (AFP_RATE_OF_G * retirementG) / 12 : 0
      }

      series.push({
        age,
        yearOffset,
        inflationFactor,
        folketrygdBalance,
        otpBalance,
        ipsBalance,
        askBalance,
        monthlyFolketrygd: 0,
        monthlyOtp: 0,
        monthlyIps: 0,
        monthlyAsk: 0,
        monthlyAfp: 0,
        salaryNominal: salaryThisYear,
      })
    } else {
      // UTBETALINGSÅR. Balansene vokser med utbetalingsfase-avkastning, deretter
      // trekkes årets utbetaling fra. Folketrygd-balansen vokser med lønnsvekst
      // (forenkling for NAV-reguleringen).
      const yearsIntoRetirement = yearOffset - yearsToRetirement // 1, 2, ...

      const annualFolketrygdPayout = monthlyFolketrygd * 12
      const annualOtpPayout = monthlyOtp * 12
      const annualIpsPayout = monthlyIps * 12
      const annualAskPayout = monthlyAsk * 12

      folketrygdBalance = Math.max(0, folketrygdBalance * (1 + g) - annualFolketrygdPayout)
      otpBalance = Math.max(0, otpBalance * (1 + payoutNominalReturn) - annualOtpPayout)
      ipsBalance = Math.max(0, ipsBalance * (1 + payoutNominalReturn) - annualIpsPayout)
      askBalance = Math.max(0, askBalance * (1 + payoutNominalReturn) - annualAskPayout)

      // Vis månedlig utbetaling kun mens kilden fortsatt utbetaler.
      // Folketrygd er livsvarig i praksis, men i modellen er beholdningen
      // matematisk uttømt etter `delingstall` år. Vi viser utbetalingen
      // gjennom hele visningsperioden for å reflektere livsvarig karakter.
      const showFolketrygd = monthlyFolketrygd // livsvarig
      const showAfp = monthlyAfp // livsvarig
      const showOtp = yearsIntoRetirement <= otpPayoutYears ? monthlyOtp : 0
      const showIps = yearsIntoRetirement <= ipsPayoutYears ? monthlyIps : 0
      const showAsk = yearsIntoRetirement <= askPayoutYears ? monthlyAsk : 0

      series.push({
        age,
        yearOffset,
        inflationFactor,
        folketrygdBalance,
        otpBalance,
        ipsBalance,
        askBalance,
        monthlyFolketrygd: showFolketrygd,
        monthlyOtp: showOtp,
        monthlyIps: showIps,
        monthlyAsk: showAsk,
        monthlyAfp: showAfp,
        salaryNominal: 0,
      })
    }
  }

  const totalMonthlyNominal =
    monthlyFolketrygd + monthlyOtp + monthlyIps + monthlyAsk + monthlyAfp

  // Garantipensjon-floor flagg: sant hvis det beregnede folketrygd-tallet ble løftet
  // til minste pensjonsnivå. Toleranse for float-feil.
  const beregnetMonthlyFolketrygdRaw = retirementFolketrygdBalance / delingstall / 12
  const folketrygdAtGarantipensjonFloor =
    monthlyFolketrygd > beregnetMonthlyFolketrygdRaw + 1

  // Deflateringsfaktor til dagens kr — brukes både for real-visning og for å
  // anvende skattemodellen i realkroner.
  const inflationFactorAtRetirement = Math.pow(1 + inflationNominal, yearsToRetirement)
  const deflate = (x: number) =>
    inflationFactorAtRetirement > 0 ? x / inflationFactorAtRetirement : x

  // Skatt anvendes i REALKRONER (dagens kjøpekraft). Forutsetning: norske
  // skattebrakter justeres årlig med inflasjon, slik at en pensjon på X real
  // i 2063 beskattes som en pensjon på X i 2025. Dette er den korrekte
  // modelleringen — å anvende 2025-brakter på 2063-nominell inntekt ville
  // dramatisk overestimere skatten (bracket creep).
  const monthlyFolketrygdRealForTax = deflate(monthlyFolketrygd)
  const monthlyOtpRealForTax = deflate(monthlyOtp)
  const monthlyIpsRealForTax = deflate(monthlyIps)
  const monthlyAfpRealForTax = deflate(monthlyAfp)
  const monthlyAskRealForTax = deflate(monthlyAsk)

  const annualGrossPensionIncomeReal =
    (monthlyFolketrygdRealForTax +
      monthlyOtpRealForTax +
      monthlyIpsRealForTax +
      monthlyAfpRealForTax) *
    12
  const annualPensionTaxReal = calculatePensionTax(annualGrossPensionIncomeReal)

  // ASK gevinstandel: hvor mye av ASK-balansen ved pensjon er urealisert gevinst?
  // Forenkling: hele balansen er en blanding av innskudd og gevinst, og hver utbetaling
  // består av samme blanding. Gevinstandel = 1 - (innskudd / balanse).
  const askGevinstAndel =
    retirementAskBalance > 0
      ? Math.max(0, 1 - askTotalContributions / retirementAskBalance)
      : 0
  const annualAskTaxReal = calculateAskTax(monthlyAskRealForTax * 12, askGevinstAndel)

  const totalAnnualTaxReal = annualPensionTaxReal + annualAskTaxReal
  const monthlyTaxReal = totalAnnualTaxReal / 12
  // Inflér tilbake til nominell for intern konsistens (alle andre tall internt er nominelle).
  const monthlyTaxNominal = monthlyTaxReal * inflationFactorAtRetirement

  const totalMonthlyNetNominal = totalMonthlyNominal - monthlyTaxNominal

  const effectiveTaxRate =
    totalMonthlyNominal > 0 ? monthlyTaxNominal / totalMonthlyNominal : 0

  const monthlyAtRetirementNominal: MonthlyBreakdown = {
    folketrygd: monthlyFolketrygd,
    otp: monthlyOtp,
    ips: monthlyIps,
    ask: monthlyAsk,
    afp: monthlyAfp,
    total: totalMonthlyNominal,
    tax: monthlyTaxNominal,
    net: totalMonthlyNetNominal,
  }

  const monthlyAtRetirementReal: MonthlyBreakdown = {
    folketrygd: deflate(monthlyFolketrygd),
    otp: deflate(monthlyOtp),
    ips: deflate(monthlyIps),
    ask: deflate(monthlyAsk),
    afp: deflate(monthlyAfp),
    total: deflate(totalMonthlyNominal),
    tax: deflate(monthlyTaxNominal),
    net: deflate(totalMonthlyNetNominal),
  }

  const finalSalaryReal = deflate(retirementSalaryNominal)
  const annualPensionReal = monthlyAtRetirementReal.total * 12
  const replacementRatio = finalSalaryReal > 0 ? annualPensionReal / finalSalaryReal : 0

  // Gap-analyse: hvor mye ekstra ASK kr/mnd i dagens kr trengs for å nå måldekningsgrad?
  // Antakelse: brukeren fortsetter med samme ASK-bidrag (i dagens kr) som flat realsum.
  // Vi finner ekstra månedlig ASK-bidrag (i dagens kr, dvs. konstant nominelt for enkelhet)
  // som ville gitt nok ekstra utbetaling til å nå målet.
  const targetMonthlyReal = (targetReplacementRatio * finalSalaryReal) / 12
  const gapMonthlyReal = Math.max(0, targetMonthlyReal - monthlyAtRetirementReal.total)
  const gapMonthlyNominalAtRetirement = gapMonthlyReal * inflationFactorAtRetirement

  // Balanse som trengs for å produsere gapMonthlyNominal i PMT-form
  let balanceNeededAtRetirement = 0
  if (gapMonthlyNominalAtRetirement > 0) {
    if (monthlyPayoutRate === 0) {
      balanceNeededAtRetirement = gapMonthlyNominalAtRetirement * 12 * askPayoutYears
    } else {
      const n = askPayoutYears * 12
      balanceNeededAtRetirement =
        (gapMonthlyNominalAtRetirement * (1 - Math.pow(1 + monthlyPayoutRate, -n))) /
        monthlyPayoutRate
    }
  }

  let extraAskMonthlyToday = 0
  if (balanceNeededAtRetirement > 0 && yearsToRetirement > 0 && nominalReturn !== 0) {
    // FV av månedlig bidrag i 12*N måneder med månedlig avkastning, forenklet til årlig:
    // FV = C_year × ((1+r)^N - 1) / r, der C_year = 12 × c_month.
    // Formelen gjelder for alle r ≠ 0, også negative (r > −1). Grensen r → 0 er
    // ((1+r)^N − 1)/r → N, så lineær-fallbacken under er den kontinuerlige grensen.
    // (Lineær divisjon for r < 0 ville underestimert nødvendig sparing, siden
    // bidragene taper verdi frem til pensjon.)
    const r = nominalReturn
    const N = yearsToRetirement
    const fvFactor = (Math.pow(1 + r, N) - 1) / r
    extraAskMonthlyToday = balanceNeededAtRetirement / (12 * fvFactor)
  } else if (balanceNeededAtRetirement > 0 && yearsToRetirement > 0) {
    // nominalReturn er nøyaktig 0: annuiteten faller ned til balanse / antall år
    extraAskMonthlyToday = balanceNeededAtRetirement / (12 * yearsToRetirement)
  }

  return {
    inputs,
    nominalReturn,
    yearsToRetirement,
    series,
    monthlyAtRetirementNominal,
    monthlyAtRetirementReal,
    finalSalaryNominal: retirementSalaryNominal,
    finalSalaryReal,
    replacementRatio,
    gapAnalysis: {
      targetMonthlyReal,
      currentMonthlyReal: monthlyAtRetirementReal.total,
      extraAskMonthlyToday,
      onTrack: yearsToRetirement > 0 && gapMonthlyReal === 0,
    },
    peakBalances: {
      folketrygd: retirementFolketrygdBalance,
      otp: retirementOtpBalance,
      ips: retirementIpsBalance,
      ask: retirementAskBalance,
    },
    askGevinstAndel,
    effectiveTaxRate,
    folketrygdAtGarantipensjonFloor,
  }
}

export const DEFAULT_INPUTS: PensionInputs = {
  currentAge: 30,
  retirementAge: 67,
  salaryGross: 650_000,
  wageGrowthNominal: 0.03,
  existingFolketrygdBalance: 0,
  existingOtpBalance: 0,
  existingIpsBalance: 0,
  existingAskBalance: 0,
  otpRateLow: 0.02,
  otpRateHigh: 0,
  ipsAnnualContribution: 0,
  askMonthlyContribution: 0,
  includeAfp: false,
  G: G_DEFAULT,
  inflationNominal: 0.025,
  realReturn: 0.04,
  payoutRealReturn: 0.02,
  delingstall: 18,
  otpPayoutYears: 15,
  ipsPayoutYears: 15,
  askPayoutYears: 20,
  targetReplacementRatio: 0.7,
}
