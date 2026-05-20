// Norsk tall- og datoformatering.
// - Desimalskilletegn: komma
// - Tusenskilletegn: hardt mellomrom ( )
// - Prosent: én desimal, mellomrom før %
// - Valuta: to desimaler
// - Dato lang: "15. mars 2026"

const HARDSPACE = ' '

const MONTHS_NB = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
]

function _fmt(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals)
  const [intPart, decPart] = fixed.split('.')
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, HARDSPACE)
  return decPart !== undefined ? `${withThousands},${decPart}` : withThousands
}

export function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${_fmt(value, decimals)}${HARDSPACE}%`
}

export function fmtNum(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return _fmt(value, decimals)
}

export function fmtFx(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return _fmt(value, decimals)
}

export function fmtSignedPct(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${_fmt(Math.abs(value), decimals)}${HARDSPACE}%`
}

export function fmtDateLong(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return `${d}.${HARDSPACE}${MONTHS_NB[m - 1]}${HARDSPACE}${y}`
}

export function fmtDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return `${d}.${HARDSPACE}${MONTHS_NB[m - 1].slice(0, 3)}.${HARDSPACE}${y}`
}

export function fmtMonthYear(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number)
  if (!y || !m) return isoDate
  return `${MONTHS_NB[m - 1]}${HARDSPACE}${y}`
}

export function fmtYear(isoDate: string): string {
  return isoDate.slice(0, 4)
}

// Konverterer ISO-dato til epoch (ms). Bruk når x-aksen skal være tidsskalert
// numerisk (slik at dato-avstand på aksen tilsvarer faktisk tidsforskjell).
export function toEpoch(isoDate: string): number {
  // Tving UTC for konsistens — daglige obs er datostempler, ikke tidssoner.
  const [y, m, d] = isoDate.split('-').map(Number)
  return Date.UTC(y, (m || 1) - 1, d || 1)
}

// Returnerer epoch-verdier for 1. januar i hvert år dekket av input-datoene.
// Brukes til å gi numeric XAxis eksplisitte årsticks uten duplikater.
export function yearTickEpochs(isoDates: string[]): number[] {
  if (!isoDates.length) return []
  const years = new Set<string>()
  for (const d of isoDates) years.add(d.slice(0, 4))
  return [...years].sort().map((y) => Date.UTC(parseInt(y, 10), 0, 1))
}

export function fmtYearFromEpoch(ms: number): string {
  return new Date(ms).getUTCFullYear().toString()
}
