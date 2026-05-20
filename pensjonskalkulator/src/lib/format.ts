// Norsk tallformatering. Bruker ikke-brytende mellomrom (U+00A0) som tusenskille
// (det er nb-NO-standarden) og " kr"-suffiks.

const nbNumber0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
const nbNumber1 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 })

export function formatKr(value: number): string {
  if (!Number.isFinite(value)) return '–'
  return `${nbNumber0.format(Math.round(value))} kr`
}

export function formatKrShort(value: number): string {
  if (!Number.isFinite(value)) return '–'
  return nbNumber0.format(Math.round(value))
}

export function formatPercent(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return '–'
  const fmt = fractionDigits === 0 ? nbNumber0 : nbNumber1
  return `${fmt.format(value * 100)} %`
}

export function formatNumber(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return '–'
  const fmt = fractionDigits === 0 ? nbNumber0 : nbNumber1
  return fmt.format(value)
}

// kompakt 1,2 M kr / 850 k kr for store tall i grafen.
export function formatKrCompact(value: number): string {
  if (!Number.isFinite(value)) return '–'
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${nbNumber1.format(value / 1_000_000)} M kr`
  if (abs >= 1_000) return `${nbNumber0.format(value / 1_000)} k kr`
  return formatKr(value)
}
