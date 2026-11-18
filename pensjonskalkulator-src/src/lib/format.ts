// Tallformatering. Norsk: ikke-brytende mellomrom (U+00A0) som tusenskille (nb-NO-standarden)
// og " kr"-suffiks. Engelsk: komma som tusenskille og punktum som desimaltegn, fortsatt " kr",
// siden beløpene er norske kroner. Språket leses fra i18n (aktivtSpraak).
import { aktivtSpraak } from './i18n'

const FMT = {
  no: {
    n0: new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }),
    n1: new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }),
  },
  en: {
    n0: new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }),
    n1: new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }),
  },
}
const f = () => FMT[aktivtSpraak()]

export function formatKr(value: number): string {
  if (!Number.isFinite(value)) return '–'
  return `${f().n0.format(Math.round(value))} kr`
}

export function formatKrShort(value: number): string {
  if (!Number.isFinite(value)) return '–'
  return f().n0.format(Math.round(value))
}

export function formatPercent(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return '–'
  const fmt = fractionDigits === 0 ? f().n0 : f().n1
  return `${fmt.format(value * 100)} %`
}

export function formatNumber(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return '–'
  const fmt = fractionDigits === 0 ? f().n0 : f().n1
  return fmt.format(value)
}

// kompakt 1,2 M kr / 850 k kr for store tall i grafen (engelsk: 1.2 M kr / 850 k kr).
export function formatKrCompact(value: number): string {
  if (!Number.isFinite(value)) return '–'
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${f().n1.format(value / 1_000_000)} M kr`
  if (abs >= 1_000) return `${f().n0.format(value / 1_000)} k kr`
  return formatKr(value)
}
