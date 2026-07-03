import { useEffect, useRef } from 'react'
import type { PensionInputs } from '../pension-engine'
import { DEFAULT_INPUTS } from '../pension-engine'

// Korte nøkler for URL — for kortere lenker
const URL_KEY_MAP: Record<keyof PensionInputs, string> = {
  currentAge: 'a',
  retirementAge: 'pa',
  salaryGross: 'l',
  wageGrowthNominal: 'lv',
  existingFolketrygdBalance: 'ef',
  existingOtpBalance: 'eo',
  existingIpsBalance: 'ei',
  existingAskBalance: 'es',
  otpRateLow: 'otl',
  otpRateHigh: 'oth',
  ipsAnnualContribution: 'ips',
  askMonthlyContribution: 'ask',
  includeAfp: 'afp',
  G: 'g',
  inflationNominal: 'i',
  realReturn: 'r',
  payoutRealReturn: 'rp',
  delingstall: 'dt',
  otpPayoutYears: 'opy',
  ipsPayoutYears: 'ipy',
  askPayoutYears: 'asy',
  targetReplacementRatio: 'm',
}

const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(URL_KEY_MAP).map(([k, v]) => [v, k as keyof PensionInputs]),
) as Record<string, keyof PensionInputs>

// Grenser per felt — speiler min/max i InputPanel (prosentfelt omregnet til
// andel). Ikke-endelige verdier forkastes og resten klippes, slik at delte
// lenker (?pa=Infinity, ?asy=1e9, ?dt=0) ikke kan fryse fanen eller gi
// divisjon på null.
type NumericInputKey = Exclude<keyof PensionInputs, 'includeAfp'>
const URL_BOUNDS: Record<NumericInputKey, readonly [number, number]> = {
  currentAge: [18, 74],
  retirementAge: [62, 75],
  salaryGross: [0, 100_000_000],
  wageGrowthNominal: [0, 0.2],
  existingFolketrygdBalance: [0, 1_000_000_000],
  existingOtpBalance: [0, 1_000_000_000],
  existingIpsBalance: [0, 1_000_000_000],
  existingAskBalance: [0, 1_000_000_000],
  otpRateLow: [0.02, 0.07],
  otpRateHigh: [0, 0.181],
  ipsAnnualContribution: [0, 1_000_000],
  askMonthlyContribution: [0, 1_000_000],
  G: [1, 1_000_000],
  inflationNominal: [0, 0.15],
  realReturn: [-0.05, 0.15],
  payoutRealReturn: [-0.05, 0.15],
  delingstall: [10, 30],
  otpPayoutYears: [10, 30],
  ipsPayoutYears: [10, 30],
  askPayoutYears: [5, 40],
  targetReplacementRatio: [0.5, 0.9],
}

export function readInputsFromUrl(): Partial<PensionInputs> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const result: Partial<PensionInputs> = {}
  for (const [short, full] of Object.entries(REVERSE_KEY_MAP)) {
    const v = params.get(short)
    if (v === null) continue
    if (full === 'includeAfp') {
      ;(result as Record<string, unknown>)[full] = v === '1' || v === 'true'
    } else {
      const n = Number(v)
      if (!Number.isFinite(n)) continue
      const [lo, hi] = URL_BOUNDS[full as NumericInputKey]
      ;(result as Record<string, unknown>)[full] = Math.min(hi, Math.max(lo, n))
    }
  }
  return result
}

export function writeInputsToUrl(inputs: PensionInputs, baseline: PensionInputs = DEFAULT_INPUTS) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams()
  for (const key of Object.keys(URL_KEY_MAP) as Array<keyof PensionInputs>) {
    const short = URL_KEY_MAP[key]
    const v = inputs[key]
    // Sammenlign mot baseline (defaults overstyrt av live makrodata) — så live-verdier
    // brukeren ikke har endret IKKE havner i URL-en (ren lenke + fersk live ved hver visning).
    const def = baseline[key]
    if (v === def) continue
    if (typeof v === 'boolean') {
      params.set(short, v ? '1' : '0')
    } else {
      params.set(short, String(v))
    }
  }
  const newUrl =
    window.location.pathname + (params.toString() ? '?' + params.toString() : '')
  window.history.replaceState({}, '', newUrl)
}

export function useUrlSync(inputs: PensionInputs, baseline: PensionInputs = DEFAULT_INPUTS) {
  // Debounce writes for å unngå å spamme history-API'en under live input.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => writeInputsToUrl(inputs, baseline), 200)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [inputs, baseline])
}
