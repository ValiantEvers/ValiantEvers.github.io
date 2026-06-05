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
      if (!isNaN(n)) (result as Record<string, unknown>)[full] = n
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
