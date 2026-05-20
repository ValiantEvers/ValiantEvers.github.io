// Type-defs og fetcher fra /data/*.json.
// Filene lever under public/data/ og serveres som /nb-watch/data/*.json
// i prod (Vite base=/nb-watch/).

export type Point = { date: string; value: number }
export type LabeledPoint = { date: string; label?: string; value: number }
export type RentebanePoint = { date: string; value: number; source?: string }
export type ValutaPoint = { date: string; EUR?: number; USD?: number; SEK?: number; GBP?: number }
export type LonnPoint = { date: string; year: string; value: number; yoy_pct: number | null }

export type SeriesPayload<T> = {
  series: string
  unit: string
  description?: string
  data: T[]
  last_fetched?: string
  [k: string]: unknown
}

export type Manifest = {
  lastUpdated: string
  sources: { name: string; url: string; series: string[] }[]
  fetch_status?: Record<string, unknown>
}

function dataUrl(name: string): string {
  // Vite injecter BASE_URL = "/nb-watch/" i prod. I dev er det "/".
  const base = import.meta.env.BASE_URL || '/'
  const trimmed = base.endsWith('/') ? base : base + '/'
  return `${trimmed}data/${name}.json`
}

async function load<T>(name: string): Promise<T | null> {
  try {
    const r = await fetch(dataUrl(name), { cache: 'no-store' })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

export const loadStyringsrente = () => load<SeriesPayload<Point>>('styringsrente')
export const loadNibor = () => load<SeriesPayload<Point>>('nibor')
export const loadKpi = () => load<SeriesPayload<LabeledPoint>>('kpi')
export const loadKpiJae = () => load<SeriesPayload<LabeledPoint>>('kpi_jae')
export const loadBoligpris = () => load<SeriesPayload<LabeledPoint>>('boligpris')
export const loadLonn = () => load<SeriesPayload<LonnPoint>>('lonnsvekst')
export const loadValuta = () => load<SeriesPayload<ValutaPoint>>('valuta')
export const loadRentebane = () => load<SeriesPayload<RentebanePoint>>('rentebane')
export const loadManifest = () => load<Manifest>('manifest')
