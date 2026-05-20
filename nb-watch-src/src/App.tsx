import { useEffect, useState } from 'react'
import { COPY } from './content/descriptions'
import {
  loadBoligpris, loadKpi, loadKpiJae, loadLonn, loadManifest,
  loadNibor, loadRentebane, loadStyringsrente, loadValuta,
  Manifest, Point, LabeledPoint, LonnPoint, ValutaPoint, RentebanePoint, SeriesPayload,
} from './lib/data'
import { fmtPct, fmtFx, fmtSignedPct } from './lib/format'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Section } from './components/Section'
import { StatTile, StatTileRow } from './components/StatTile'
import { RatePathChart } from './components/charts/RatePathChart'
import { InflationChart } from './components/charts/InflationChart'
import { WageChart } from './components/charts/WageChart'
import { HousingChart } from './components/charts/HousingChart'
import { FxChart } from './components/charts/FxChart'

type Bundle = {
  manifest: Manifest | null
  styringsrente: SeriesPayload<Point> | null
  nibor: SeriesPayload<Point> | null
  kpi: SeriesPayload<LabeledPoint> | null
  kpi_jae: SeriesPayload<LabeledPoint> | null
  boligpris: SeriesPayload<LabeledPoint> | null
  lonn: SeriesPayload<LonnPoint> | null
  valuta: SeriesPayload<ValutaPoint> | null
  rentebane: SeriesPayload<RentebanePoint> | null
}

function lastN<T>(arr: T[] | undefined, n: number): T[] {
  if (!arr) return []
  return arr.slice(Math.max(0, arr.length - n))
}

function styringsrenteDelta(series: Point[] | undefined): number | null {
  if (!series || series.length < 2) return null
  const last = series[series.length - 1].value
  // Finn forrige distinkte verdi (forrige rentemøte = sist gang verdien endret seg).
  for (let i = series.length - 2; i >= 0; i--) {
    if (series[i].value !== last) {
      return last - series[i].value
    }
  }
  return 0
}

function ytdPct(series: ValutaPoint[] | undefined, ccy: keyof ValutaPoint): number | null {
  if (!series || series.length === 0) return null
  const latest = series[series.length - 1]
  const latestVal = latest[ccy] as number | undefined
  if (latestVal === undefined) return null
  const year = latest.date.slice(0, 4)
  const ytdStart = series.find((p) => p.date.startsWith(year))
  const startVal = ytdStart ? (ytdStart[ccy] as number | undefined) : undefined
  if (startVal === undefined || startVal === 0) return null
  return ((latestVal - startVal) / startVal) * 100
}

export default function App() {
  const [b, setB] = useState<Bundle | null>(null)

  useEffect(() => {
    Promise.all([
      loadManifest(),
      loadStyringsrente(),
      loadNibor(),
      loadKpi(),
      loadKpiJae(),
      loadBoligpris(),
      loadLonn(),
      loadValuta(),
      loadRentebane(),
    ]).then(([manifest, styringsrente, nibor, kpi, kpi_jae, boligpris, lonn, valuta, rentebane]) => {
      setB({ manifest, styringsrente, nibor, kpi, kpi_jae, boligpris, lonn, valuta, rentebane })
    })
  }, [])

  const lastKpi = b?.kpi?.data?.[b.kpi.data.length - 1]
  const prevKpi = b?.kpi?.data?.[b.kpi!.data.length - 2]
  const lastKpiJae = b?.kpi_jae?.data?.[b.kpi_jae.data.length - 1]
  const prevKpiJae = b?.kpi_jae?.data?.[b.kpi_jae!.data.length - 2]
  const lastSr = b?.styringsrente?.data?.[b.styringsrente.data.length - 1]
  const srDelta = styringsrenteDelta(b?.styringsrente?.data)
  const lastFx = b?.valuta?.data?.[b.valuta.data.length - 1]
  const eurYtd = ytdPct(b?.valuta?.data, 'EUR')

  // Begrens historisk styringsrente til siste 5 år for å unngå overfylt graf.
  const srLast5y = b?.styringsrente?.data
    ? b.styringsrente.data.filter((p) => p.date >= cutoffStr(5))
    : []
  const niborLast5y = b?.nibor?.data
    ? b.nibor.data.filter((p) => p.date >= cutoffStr(5))
    : []

  return (
    <div className="min-h-screen">
      <Header lastUpdated={b?.manifest?.lastUpdated ?? null} />

      <StatTileRow>
        <StatTile
          label={COPY.tiles.styringsrente}
          value={lastSr ? fmtPct(lastSr.value, 2) : '—'}
          delta={srDelta !== null ? fmtSignedPct(srDelta, 2) : '—'}
          deltaLabel={COPY.tiles.styringsrente_sub}
          accent
        />
        <StatTile
          label={COPY.tiles.kpi}
          value={lastKpi ? fmtPct(lastKpi.value) : '—'}
          delta={
            lastKpi && prevKpi
              ? fmtSignedPct(lastKpi.value - prevKpi.value, 1)
              : '—'
          }
          deltaLabel={COPY.tiles.kpi_sub}
        />
        <StatTile
          label={COPY.tiles.kpi_jae}
          value={lastKpiJae ? fmtPct(lastKpiJae.value) : '—'}
          delta={
            lastKpiJae && prevKpiJae
              ? fmtSignedPct(lastKpiJae.value - prevKpiJae.value, 1)
              : '—'
          }
          deltaLabel={COPY.tiles.kpi_jae_sub}
        />
        <StatTile
          label={COPY.tiles.eurnok}
          value={lastFx?.EUR ? fmtFx(lastFx.EUR) : '—'}
          delta={eurYtd !== null ? fmtSignedPct(eurYtd, 1) : '—'}
          deltaLabel={COPY.tiles.eurnok_sub}
        />
      </StatTileRow>

      <Section
        id="rentebane"
        title={COPY.rentebane.title}
        body={COPY.rentebane.body}
        chart={
          srLast5y.length > 0 ? (
            <RatePathChart
              styringsrente={srLast5y}
              nibor={niborLast5y}
              rentebane={b?.rentebane?.data ?? []}
            />
          ) : (
            <NoData />
          )
        }
        extra={
          <>
            <p className="text-xs text-muted dark:text-muted-dark italic mb-3">
              {COPY.rentebane.note}
            </p>
            <div className="rounded border border-dashed border-line dark:border-line-dark px-3 py-2 text-xs text-muted dark:text-muted-dark">
              TODO: {COPY.rentebane.todo}
            </div>
          </>
        }
        source={COPY.rentebane.source}
      />

      <Section
        id="inflasjon"
        title={COPY.inflasjon.title}
        body={COPY.inflasjon.body}
        chart={
          b?.kpi?.data?.length && b?.kpi_jae?.data?.length ? (
            <InflationChart kpi={b.kpi.data} kpiJae={b.kpi_jae.data} />
          ) : (
            <NoData />
          )
        }
        source={COPY.inflasjon.source}
      />

      <Section
        id="lonn"
        title={COPY.lonn.title}
        body={COPY.lonn.body}
        chart={
          b?.lonn?.data?.length ? (
            <WageChart lonn={lastN(b.lonn.data, 10)} />
          ) : (
            <NoData />
          )
        }
        source={COPY.lonn.source}
      />

      <Section
        id="bolig"
        title={COPY.bolig.title}
        body={COPY.bolig.body}
        chart={
          b?.boligpris?.data?.length ? (
            <HousingChart boligpris={b.boligpris.data} />
          ) : (
            <NoData />
          )
        }
        source={COPY.bolig.source}
      />

      <Section
        id="valuta"
        title={COPY.valuta.title}
        body={COPY.valuta.body}
        chart={
          b?.valuta?.data?.length ? (
            <FxChart valuta={b.valuta.data} />
          ) : (
            <NoData />
          )
        }
        source={COPY.valuta.source}
      />

      <Footer />
    </div>
  )
}

function NoData() {
  return (
    <div className="h-[200px] flex items-center justify-center text-sm text-muted dark:text-muted-dark border border-dashed border-line dark:border-line-dark">
      {COPY.noData}
    </div>
  )
}

function cutoffStr(yearsBack: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - yearsBack)
  return d.toISOString().slice(0, 10)
}
