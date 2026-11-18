// Språk: norsk (standard) og engelsk, for utlendinger som jobber i Norge.
//
// Valg av språk, sterkest først:
//  1) ?lang=en / ?lang=no i URL-en (delbar lenke)
//  2) `ve-lang` i localStorage, samme nøkkel som resten av evers.no. Bare 'en' gir
//     engelsk; alle andre verdier (no, medieval, og de fryste fr/de/ja) gir norsk.
//  3) norsk
//
// De norske fagordene (folketrygd, AFP, G, delingstall ...) står i parentes i den
// engelske teksten: det er ordene leseren møter hos NAV og i lønnsslippen.
import { createContext, useContext, type ReactNode } from 'react'

export type Lang = 'no' | 'en'
const NOEKKEL = 've-lang'

let gjeldende: Lang = 'no'
/** Språket formaterings-hjelperne (format.ts, macro.ts) bruker nå. */
export function aktivtSpraak(): Lang {
  return gjeldende
}

export function finnSpraak(): Lang {
  if (typeof window === 'undefined') return 'no'
  const fraUrl = new URLSearchParams(window.location.search).get('lang')
  if (fraUrl === 'en' || fraUrl === 'no') return fraUrl
  try {
    return window.localStorage.getItem(NOEKKEL) === 'en' ? 'en' : 'no'
  } catch {
    return 'no'
  }
}

/** Setter språket for formateringen, <html lang> og tittelen. Lagrer valget hvis `lagre`. */
export function brukSpraak(lang: Lang, lagre: boolean) {
  gjeldende = lang
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'en' ? 'en' : 'nb-NO'
    document.title = STR[lang].dokumentTittel
  }
  if (!lagre || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NOEKKEL, lang)
  } catch {
    /* privat modus o.l.: valget gjelder bare denne visningen */
  }
}

const no = {
  dokumentTittel: 'Pensjonskalkulator – Evers',
  sprakvalg: 'Språk',
  overtittel: 'Pensjonskalkulator',
  tittel: 'Hva blir pensjonen din?',
  ingress:
    'Norsk pensjon er stykket opp i fire bokser: folketrygd, tjenestepensjon, IPS og egen sparing. Kalkulatoren legger dem sammen og viser et grovt estimat – nok til å se hvor du står, ikke nok til å erstatte en pensjonsrådgiver.',
  innTittel: 'Inntekt og sparing',
  grafSeksjon: 'Kapital over tid',
  gapSeksjon: 'Hvor mye mangler det?',

  // HeroNumber
  estimertMnd: 'Estimert månedlig pensjon',
  iDagensKroner: 'i dagens kroner',
  iNominelleKroner: 'i nominelle kroner',
  estimertNetto: 'Estimert netto:',
  etterSkatt: '(etter skatt, forenklet estimat)',
  garantipensjon: '(garantipensjon)',
  bruttoForklaring:
    'Brutto = før skatt. Netto er et grovt estimat basert på 2026-satser og forutsetter at hele pensjonen tas ut samme år.',

  // kilder
  kilde: {
    folketrygd: 'Folketrygd',
    otp: 'Tjenestepensjon',
    ips: 'IPS',
    ask: 'Annen sparing (ASK)',
    afp: 'AFP',
  },

  // DisplayToggle + graf
  visningsmodus: 'Visningsmodus for kroner',
  dagensKroner: 'Dagens kroner',
  nominelleKroner: 'Nominelle kroner',
  grafTittel: 'Akkumulert kapital over tid',
  grafIngress:
    'Stablet balanse for hver pensjonskilde. Toppen er ved pensjonsalder, deretter reduseres balansen etter hvert som pengene utbetales.',
  grafLivsvarig:
    'Folketrygd og AFP utbetales livsvarig. Kapitalen i grafen er kun en regnemodell og kan gå mot null selv om utbetalingen fortsetter.',
  grafAria: (fra: number | string, til: number | string, pa: number, ekte: boolean) =>
    `Stablet arealgraf som viser kapital i folketrygd, tjenestepensjon, IPS og ASK fra alder ${fra} til ${til}. Toppen er ved pensjonsalder ${pa}. Verdier vises i ${ekte ? 'dagens' : 'nominelle'} kroner.`,
  alder: 'Alder',
  aar: (n: number | string) => `${n} år`,
  sum: 'Sum',

  // GapAnalysis
  gapAnalyse: 'Gap-analyse',
  paaGodVei: 'Du er på god vei: estimert dekningsgrad',
  avSluttlonn: 'av sluttlønn.',
  maaletDekkes: (maal: string, ips: boolean, ask: boolean, sluttlonn: string) =>
    `Målet på ${maal} dekkes av folketrygd, tjenestepensjon${ips ? ', IPS' : ''}${ask ? ' og annen sparing' : ''}. Sluttlønn i dagens kroner: ${sluttlonn}.`,
  dekningsgradForklaring:
    'Dekningsgrad måles mot sluttlønn. Ved sen pensjonering vokser sluttlønnen raskere enn pensjonen klarer å holde tritt med, så dekningsgraden kan paradoksalt nok falle selv om månedlig pensjon stiger i kroner.',
  forAaNaa: (maal: string) => `For å nå ${maal} av sluttlønn må du spare ekstra`,
  iMaaneden: 'i måneden',
  iAskEllerFond: 'i ASK eller fond.',
  dekningIDag: (pst: string) =>
    `Estimert dekningsgrad i dag: ${pst}. Tallet er regnet i dagens kroner, og beløpet justeres automatisk med inflasjon i utregningen.`,

  // InputPanel
  kildeOppdatert: (kilde: string, dato: string) => `Kilde: ${kilde} · oppdatert ${dato}`,
  naavaerendeAlder: 'Nåværende alder',
  enhetAar: 'år',
  enhetKrAar: 'kr/år',
  enhetKr: 'kr',
  enhetKrMnd: 'kr/mnd',
  onsketPensjonsalder: 'Ønsket pensjonsalder',
  bruttolonn: 'Bruttolønn',
  over12G: (belop: string) => `Lønn over 12 G (${belop}) gir ikke mer pensjonsopptjening.`,
  lonnsvekst: 'Forventet lønnsvekst (nominell)',
  lonnsvekstAntagelse: 'Antagelse: forventet årlig lønnsvekst.',
  harDuSparing: 'Har du allerede pensjonssparing?',
  valgfritt: '(valgfritt)',
  folketrygdBeholdning: 'Folketrygd-beholdning hos NAV',
  folketrygdBeholdningHjelp: 'Logg inn på nav.no for å se beholdningen din.',
  otpSaldo: 'Tjenestepensjon-saldo',
  otpSaldoHjelp: 'Summer alle innskuddspensjon-saldoer fra tidligere og nåværende arbeidsgivere.',
  ipsSaldo: 'IPS-saldo',
  askSaldo: 'ASK / fondskonto-saldo',
  otpLav: 'Tjenestepensjon (opp til 7,1 G)',
  otpLavHjelp: (belop: string) => `Minst 2 % er lovpålagt. Lønn opp til 7,1 G = ${belop}.`,
  ipsPerAar: 'IPS-bidrag per år',
  ipsMaks: (belop: string) => `Maks ${belop} per år.`,
  ipsOver: (belop: string) =>
    `Vi bruker ${belop} i beregningen, som er lovlig maks. Sett verdien ned, eller la den stå (beregningen kapper uansett).`,
  annenSparing: 'Annen sparing (ASK/fond)',
  afp: 'Inkluder privat AFP',
  afpBeskrivelse:
    'Forenklet estimat (0,8 × G livsvarig, ≈ 8 700 kr/mnd). For en typisk lønnsmottaker med rundt 35 års opptjeningsår treffer dette omtrent riktig. For deltidsarbeidere eller kortere yrkeskarrierer er det en overestimat. AFP gjelder kun privat sektor og krever oppfylte kvalifiseringskriterier (jobbet 7 av siste 9 år i AFP-bedrift).',
  avansert: 'Avanserte innstillinger',
  gVerdi: 'G-verdi (grunnbeløp)',
  gHjelp: (belop: string, dato: string) =>
    `Standard: ${belop} per ${dato}. Sjekk nav.no/grunnbelopet for siste verdi.`,
  inflasjon: 'Inflasjon (nominell)',
  inflasjonAntagelse: 'Antagelse: forventet prisvekst.',
  realavkastning: 'Forventet realavkastning',
  realavkastningHjelp:
    'Antagelse: langsiktig forventet realavkastning (etter inflasjon). Nominell regnes ut automatisk.',
  utbetalingsavkastning: 'Realavkastning i utbetalingsfasen',
  utbetalingsavkastningHjelp:
    'Antagelse: lavere enn opptjeningsavkastning fordi pensjonister typisk de-risker porteføljen. Folketrygd bruker NAVs delingstall og påvirkes ikke av dette.',
  delingstall: 'Delingstall ved pensjonsalder',
  delingstallHjelp: 'Typisk 16–20, høyere for yngre årskull. NAV publiserer forventede tall per kohort.',
  otpUtbetaling: 'Tjenestepensjon utbetalingstid',
  otpUtbetalingHjelp: 'Innskuddspensjon utbetales lovpålagt over minimum 10 år eller til 77 år.',
  ipsUtbetaling: 'IPS utbetalingstid',
  askUtbetaling: 'ASK utbetalingstid',
  otpHoy: 'Tjenestepensjon (7,1G – 12G)',
  otpHoyOver: (belop: string) => `Maks lovlig sats er 18,1 %. Lønn over 7,1 G ≈ ${belop} faller i båndet.`,
  otpHoyUnder: (belop: string) => `Maks lovlig sats er 18,1 %. Gjelder kun hvis lønnen er over 7,1 G ≈ ${belop}.`,
  maaldekning: 'Måldekningsgrad (av sluttlønn)',

  // Footer
  ansvar:
    'Forenklet estimat for illustrasjonsformål. Bruker faste antakelser om avkastning, inflasjon, delingstall og folketrygdregler, så faktisk pensjon kan avvike vesentlig. Tall vises brutto, før skatt; ulike pensjonskilder (folketrygd, IPS, tjenestepensjon, ASK) beskattes ulikt ved uttak. Uføretrygd og offentlig sektor AFP er ikke modellert. Privat AFP er sterkt forenklet. Ikke finansiell rådgivning.',
  tilbake: '← Tilbake til evers.no',
  innebygdLenke: 'Åpne hele kalkulatoren på evers.no ↗',
  byggInn: 'Bygg inn kalkulatoren på din side',
  byggInnForklaring:
    'Lim inn koden under der kalkulatoren skal stå. Den regner i nettleseren til den som bruker den, og tallene som skrives inn, blir der. Skriptet lar rammen vokse med innholdet, og lenken under rammen peker tilbake hit.',
  kopier: 'Kopier koden',
  kopiert: 'Kopiert ✓',
}

export type Tekster = typeof no

// G-datoen kommer som norsk tekst fra motoren (G_DEFAULT_AS_OF = '1. mai 2026').
const MND_EN: Record<string, string> = {
  januar: 'January', februar: 'February', mars: 'March', april: 'April', mai: 'May', juni: 'June',
  juli: 'July', august: 'August', september: 'September', oktober: 'October', november: 'November',
  desember: 'December',
}
export function datoPaaEngelsk(norsk: string): string {
  const m = /^(\d{1,2})\. ([a-zæøå]+) (\d{4})$/.exec(norsk.trim())
  return m && MND_EN[m[2]] ? `${m[1]} ${MND_EN[m[2]]} ${m[3]}` : norsk
}

const en: Tekster = {
  dokumentTittel: 'Pension calculator for Norway – Evers',
  sprakvalg: 'Language',
  overtittel: 'Pension calculator',
  tittel: 'What will your pension be?',
  ingress:
    'A Norwegian pension comes in four parts: the National Insurance pension (folketrygd), your workplace pension (tjenestepensjon), IPS and your own savings. This calculator adds them up and gives a rough estimate – enough to see where you stand, not enough to replace a pension adviser.',
  innTittel: 'Income and savings',
  grafSeksjon: 'Savings over time',
  gapSeksjon: 'How big is the gap?',

  estimertMnd: 'Estimated monthly pension',
  iDagensKroner: "in today's kroner",
  iNominelleKroner: 'in nominal kroner',
  estimertNetto: 'Estimated after tax:',
  etterSkatt: '(simplified estimate)',
  garantipensjon: '(guarantee pension)',
  bruttoForklaring:
    'Gross = before tax. The after-tax figure is a rough estimate based on 2026 rates and assumes the whole pension is drawn in the same year.',

  kilde: {
    folketrygd: 'National Insurance',
    otp: 'Workplace pension',
    ips: 'IPS',
    ask: 'Other savings (ASK)',
    afp: 'AFP',
  },

  visningsmodus: 'Show amounts in',
  dagensKroner: "Today's kroner",
  nominelleKroner: 'Nominal kroner',
  grafTittel: 'Accumulated savings over time',
  grafIngress:
    'The balance of each pension source, stacked. It peaks at your retirement age and then falls as the money is paid out.',
  grafLivsvarig:
    'The National Insurance pension and AFP are paid for life. The balance in the chart is only a calculation device and can approach zero while payments continue.',
  grafAria: (fra: number | string, til: number | string, pa: number, ekte: boolean) =>
    `Stacked area chart of the balance in the National Insurance pension, workplace pension, IPS and ASK from age ${fra} to ${til}. It peaks at retirement age ${pa}. Amounts are in ${ekte ? "today's" : 'nominal'} kroner.`,
  alder: 'Age',
  aar: (n: number | string) => `Age ${n}`,
  sum: 'Total',

  gapAnalyse: 'Gap analysis',
  paaGodVei: "You're on track: estimated replacement rate",
  avSluttlonn: 'of your final salary.',
  maaletDekkes: (maal: string, ips: boolean, ask: boolean, sluttlonn: string) =>
    `The target of ${maal} is covered by the National Insurance pension, your workplace pension${ips ? ', IPS' : ''}${ask ? ' and other savings' : ''}. Final salary in today's kroner: ${sluttlonn}.`,
  dekningsgradForklaring:
    'The replacement rate is measured against your final salary. If you retire late, your final salary grows faster than your pension can keep up with, so the rate can fall even while the monthly pension rises in kroner.',
  forAaNaa: (maal: string) => `To reach ${maal} of your final salary, save an extra`,
  iMaaneden: 'a month',
  iAskEllerFond: 'in an ASK or funds.',
  dekningIDag: (pst: string) =>
    `Estimated replacement rate today: ${pst}. The amount is in today's kroner and is adjusted for inflation in the calculation.`,

  kildeOppdatert: (kilde: string, dato: string) => `Source: ${kilde} · updated ${dato}`,
  naavaerendeAlder: 'Current age',
  enhetAar: 'years',
  enhetKrAar: 'kr/year',
  enhetKr: 'kr',
  enhetKrMnd: 'kr/month',
  onsketPensjonsalder: 'Planned retirement age',
  bruttolonn: 'Gross annual salary',
  over12G: (belop: string) => `Salary above 12 G (${belop}) earns no extra pension.`,
  lonnsvekst: 'Expected wage growth (nominal)',
  lonnsvekstAntagelse: 'Assumption: expected annual wage growth.',
  harDuSparing: 'Do you already have pension savings?',
  valgfritt: '(optional)',
  folketrygdBeholdning: 'National Insurance pension balance at NAV',
  folketrygdBeholdningHjelp: 'Log in at nav.no to see your balance (pensjonsbeholdning).',
  otpSaldo: 'Workplace pension balance',
  otpSaldoHjelp: 'Add up all defined-contribution balances (innskuddspensjon) from past and current employers.',
  ipsSaldo: 'IPS balance',
  askSaldo: 'ASK / fund account balance',
  otpLav: 'Workplace pension (up to 7.1 G)',
  otpLavHjelp: (belop: string) => `At least 2 % is required by law. Salary up to 7.1 G = ${belop}.`,
  ipsPerAar: 'IPS contribution per year',
  ipsMaks: (belop: string) => `Maximum ${belop} a year.`,
  ipsOver: (belop: string) =>
    `We use ${belop} in the calculation, the legal maximum. Lower the value, or leave it (the calculation caps it anyway).`,
  annenSparing: 'Other savings (ASK/funds)',
  afp: 'Include private-sector AFP',
  afpBeskrivelse:
    'Simplified estimate (0.8 × G for life, ≈ 8,700 kr/month). For a typical employee with about 35 years of earnings this is roughly right. For part-time workers or shorter careers it overstates. AFP applies only in the private sector and has eligibility rules (you must have worked 7 of the last 9 years at a company with AFP).',
  avansert: 'Advanced settings',
  gVerdi: 'Basic amount, G (grunnbeløp)',
  gHjelp: (belop: string, dato: string) =>
    `Default: ${belop} as of ${datoPaaEngelsk(dato)}. See nav.no/grunnbelopet for the latest value.`,
  inflasjon: 'Inflation (nominal)',
  inflasjonAntagelse: 'Assumption: expected price growth.',
  realavkastning: 'Expected real return',
  realavkastningHjelp:
    'Assumption: long-term expected return after inflation. The nominal return is calculated for you.',
  utbetalingsavkastning: 'Real return while drawing the pension',
  utbetalingsavkastningHjelp:
    "Assumption: lower than while saving, because retirees usually take less risk. The National Insurance pension uses NAV's divisor (delingstall) and is not affected.",
  delingstall: 'Divisor at retirement age (delingstall)',
  delingstallHjelp: 'Typically 16–20, higher for younger cohorts. NAV publishes expected values per birth year.',
  otpUtbetaling: 'Workplace pension payout period',
  otpUtbetalingHjelp:
    'By law, a defined-contribution pension is paid over at least 10 years, or until age 77.',
  ipsUtbetaling: 'IPS payout period',
  askUtbetaling: 'ASK payout period',
  otpHoy: 'Workplace pension (7.1 G – 12 G)',
  otpHoyOver: (belop: string) => `The legal maximum is 18.1 %. The part of your salary above 7.1 G ≈ ${belop} falls in this band.`,
  otpHoyUnder: (belop: string) => `The legal maximum is 18.1 %. Applies only if your salary is above 7.1 G ≈ ${belop}.`,
  maaldekning: 'Target replacement rate (of final salary)',

  ansvar:
    'A simplified estimate for illustration. It uses fixed assumptions about returns, inflation, the divisor (delingstall) and National Insurance rules, so your actual pension may differ substantially. Amounts are shown gross, before tax; the sources (National Insurance, IPS, workplace pension, ASK) are taxed differently when paid out. Disability benefit and public-sector AFP are not modelled. Private-sector AFP is heavily simplified. Not financial advice.',
  tilbake: '← Back to evers.no',
  innebygdLenke: 'Open the full calculator on evers.no ↗',
  byggInn: 'Embed the calculator on your site',
  byggInnForklaring:
    'Paste the code below where the calculator should appear. It runs in the visitor’s browser, and the numbers they enter stay there. The script lets the frame grow with its content, and the link below the frame points back here.',
  kopier: 'Copy the code',
  kopiert: 'Copied ✓',
}

export const STR: Record<Lang, Tekster> = { no, en }

const SpraakKontekst = createContext<{ lang: Lang; t: Tekster }>({ lang: 'no', t: no })

export function SpraakTilbyder({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <SpraakKontekst.Provider value={{ lang, t: STR[lang] }}>{children}</SpraakKontekst.Provider>
}

export function useSpraak() {
  return useContext(SpraakKontekst)
}
