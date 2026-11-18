// Live makrodata fra repo-rotens /macro.json (committet av .github/workflows/macro.yml,
// kilder SSB + Norges Bank). Klienten leser KUN denne fila — ingen eksterne API-kall.
// Defensivt: feiler hentingen, returneres null og kalkulatoren kjører på hardkodede defaults.

import { aktivtSpraak } from './i18n'

export interface MacroSeries {
  yoyPct?: number
  indexLevel?: number
  indexAsOf?: string
  pct?: number
  asOf?: string
  source?: string
}

export interface MacroData {
  updated?: string
  inflation?: MacroSeries
  wageGrowth?: MacroSeries
  policyRate?: MacroSeries
}

export async function fetchMacro(): Promise<MacroData | null> {
  try {
    const r = await fetch('/macro.json', { cache: 'no-store' })
    if (!r.ok) return null
    const m = (await r.json()) as unknown
    return m && typeof m === 'object' ? (m as MacroData) : null
  } catch {
    return null
  }
}

const MONTHS_NO = ['jan.', 'feb.', 'mar.', 'apr.', 'mai', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'des.']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Formaterer SSB/NB-perioder lesbart: "2025-12" → "des. 2025", "2026-06-03" → "3. jun. 2026", "2025" → "2025".
 *  Engelsk: "Dec 2025", "3 Jun 2026". */
export function fmtAsOf(asOf?: string): string {
  if (!asOf) return ''
  const en = aktivtSpraak() === 'en'
  const mnd = en ? MONTHS_EN : MONTHS_NO
  const ym = /^(\d{4})-(\d{2})$/.exec(asOf)
  if (ym) return `${mnd[+ym[2] - 1]} ${ym[1]}`
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOf)
  if (ymd) return en ? `${+ymd[3]} ${mnd[+ymd[2] - 1]} ${ymd[1]}` : `${+ymd[3]}. ${mnd[+ymd[2] - 1]} ${ymd[1]}`
  return asOf
}
