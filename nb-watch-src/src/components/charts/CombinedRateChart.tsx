import { useEffect, useRef } from 'react'
import {
  createChart, LineSeries, LineStyle, LineType, CrosshairMode, ColorType, TickMarkType,
} from 'lightweight-charts'
import type { IChartApi, ISeriesApi, Time, LineData, WhitespaceData } from 'lightweight-charts'
import { useTheme, Palette } from '../../lib/useTheme'
import { fmtPct, fmtDateShort } from '../../lib/format'
import { Point, RentebanePoint } from '../../lib/data'
import { COPY } from '../../content/descriptions'

// Korte norske månedsnavn til tick-formatering (akse-ticks ved innzooming).
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des']

// lightweight-charts gir tilbake Time som streng, UNIX-tidsstempel eller BusinessDay
// avhengig av input. Vi mater inn 'YYYY-MM-DD'-strenger; håndter alle tre for robusthet.
function timeToISO(t: Time): string {
  if (typeof t === 'string') return t
  if (typeof t === 'number') return new Date(t * 1000).toISOString().slice(0, 10)
  const mm = String(t.month).padStart(2, '0')
  const dd = String(t.day).padStart(2, '0')
  return `${t.year}-${mm}-${dd}`
}

// Årstall på Year-ticks (som den gamle grafen). Måned/dag vises kun ved dyp innzooming.
function tickMarkFormatter(time: Time, tickMarkType: TickMarkType, _locale: string): string {
  const [y, m, d] = timeToISO(time).split('-')
  switch (tickMarkType) {
    case TickMarkType.Year:
      return y
    case TickMarkType.Month:
      return `${MONTHS_SHORT[parseInt(m, 10) - 1]} ${y}`
    default:
      return `${parseInt(d, 10)}. ${MONTHS_SHORT[parseInt(m, 10) - 1]}`
  }
}

// Virkedager (man–fre) i intervallet (startISO, endISO]. Brukes til å fylle
// prognoseperioden med whitespace, slik at de kvartalsvise banepunktene får
// proporsjonal bredde — lightweight-charts plasserer punkter etter indeks, ikke
// kalendertid, så uten dette stables banen til en usynlig stripe helt til høyre.
function businessDays(startISO: string, endISO: string): string[] {
  const out: string[] = []
  const [sy, sm, sd] = startISO.split('-').map(Number)
  const [ey, em, ed] = endISO.split('-').map(Number)
  const end = Date.UTC(ey, em - 1, ed)
  const cur = new Date(Date.UTC(sy, sm - 1, sd))
  cur.setUTCDate(cur.getUTCDate() + 1)
  while (cur.getTime() <= end) {
    const dow = cur.getUTCDay()
    if (dow !== 0 && dow !== 6) out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

function LegendItem({ color, dashed, label }: { color: string; dashed?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        style={{
          width: 18,
          height: 0,
          borderTopWidth: 2,
          borderTopColor: color,
          borderTopStyle: dashed ? 'dashed' : 'solid',
        }}
      />
      {label}
    </span>
  )
}

export function CombinedRateChart({
  styringsrente,
  nibor,
  rentebane,
  showNibor,
}: {
  styringsrente: Point[]
  nibor: Point[]
  rentebane: RentebanePoint[]
  showNibor: boolean
}) {
  const { isDark, palette } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const srRef = useRef<ISeriesApi<'Line'> | null>(null)
  const baneRef = useRef<ISeriesApi<'Line'> | null>(null)
  const niborRef = useRef<ISeriesApi<'Line'> | null>(null)

  // Bygg/ombygg grafen når dataene endrer seg (i praksis én gang, etter lasting).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const p = palette

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: p.muted,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        attributionLogo: false,
      },
      grid: {
        horzLines: { color: p.line },
        vertLines: { visible: false },
      },
      rightPriceScale: { borderColor: p.line, scaleMargins: { top: 0.12, bottom: 0.12 } },
      leftPriceScale: { visible: false },
      // minBarSpacing lavt nok til at hele historikken + prognosen får plass i
      // fitContent (mange daglige punkter), også på smale skjermer.
      timeScale: { borderColor: p.line, tickMarkFormatter, minBarSpacing: 0.05 },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: p.muted, style: LineStyle.Dotted, labelBackgroundColor: p.ink },
        horzLine: { color: p.muted, style: LineStyle.Dotted, labelBackgroundColor: p.ink },
      },
      localization: {
        priceFormatter: (price: number) => fmtPct(price),
        timeFormatter: (t: Time) => fmtDateShort(timeToISO(t)),
      },
      // På touch: la vertikal finger-drag rulle siden, ikke kapre grafen.
      // Horisontal drag panorerer, pinch zoomer.
      handleScroll: { vertTouchDrag: false },
      handleScale: { pinch: true, mouseWheel: true, axisPressedMouseMove: true },
    })

    const srData: LineData<Time>[] = styringsrente.map((d) => ({ time: d.date, value: d.value }))
    const niborData: LineData<Time>[] = nibor.map((d) => ({ time: d.date, value: d.value }))

    // Rentebanen tegnes som stiplet forlengelse fra siste faktiske observasjon.
    // PPR-banen kan starte før siste historiske punkt (overlapp), så vi beholder
    // kun de framoverskuende punktene og seeder med siste historiske verdi —
    // da fortsetter den stiplede linjen sømløst fra trappetrinnet.
    const lastHist = styringsrente[styringsrente.length - 1]
    const future = lastHist ? rentebane.filter((d) => d.date > lastHist.date) : rentebane
    let baneData: (LineData<Time> | WhitespaceData<Time>)[]
    if (lastHist && future.length) {
      const lastBaneDate = future[future.length - 1].date
      // Whitespace for hver virkedag i prognoseperioden; deretter overstyr med de
      // faktiske banepunktene. Linjen brofører over whitespace, så de stiplede
      // segmentene blir rette mellom kvartalene men dekker proporsjonal bredde.
      const slots = new Map<string, LineData<Time> | WhitespaceData<Time>>()
      for (const day of businessDays(lastHist.date, lastBaneDate)) slots.set(day, { time: day })
      slots.set(lastHist.date, { time: lastHist.date, value: lastHist.value }) // seed = siste faktiske
      for (const d of future) slots.set(d.date, { time: d.date, value: d.value })
      baneData = [...slots.values()].sort((a, b) =>
        String(a.time) < String(b.time) ? -1 : String(a.time) > String(b.time) ? 1 : 0,
      )
    } else {
      baneData = rentebane.map((d) => ({ time: d.date, value: d.value }))
    }

    // NOWA 3M — tynn, nøytral bakgrunnsserie (rekkefølge: tegnes under de røde).
    const niborSeries = chart.addSeries(LineSeries, {
      color: p.neutralLight,
      lineWidth: 1,
      lineType: LineType.WithSteps,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: showNibor,
    })
    niborSeries.setData(niborData)

    // Historisk styringsrente — trappetrinn (bevarer stepAfter-semantikken).
    const srSeries = chart.addSeries(LineSeries, {
      color: p.red,
      lineWidth: 2,
      lineType: LineType.WithSteps,
      lastValueVisible: false,
      priceLineVisible: false,
    })
    srSeries.setData(srData)

    // Rentebane — stiplet.
    const baneSeries = chart.addSeries(LineSeries, {
      color: p.red,
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      lineType: LineType.Simple,
      lastValueVisible: false,
      priceLineVisible: false,
    })
    baneSeries.setData(baneData)

    chartRef.current = chart
    srRef.current = srSeries
    baneRef.current = baneSeries
    niborRef.current = niborSeries

    chart.timeScale().fitContent()

    // Dobbeltklikk → tilbake til full visning.
    const onDblClick = () => chart.timeScale().fitContent()
    el.addEventListener('dblclick', onDblClick)

    return () => {
      el.removeEventListener('dblclick', onDblClick)
      chart.remove()
      chartRef.current = null
      srRef.current = null
      baneRef.current = null
      niborRef.current = null
    }
  }, [styringsrente, nibor, rentebane])

  // Toggle NOWA-serien uten å bygge grafen på nytt.
  useEffect(() => {
    niborRef.current?.applyOptions({ visible: showNibor })
  }, [showNibor])

  // Tema er media-drevet (ingen DOM-klasse å observere) — re-fargelegg manuelt
  // når prefers-color-scheme bytter.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const p: Palette = palette
    chart.applyOptions({
      layout: { textColor: p.muted },
      grid: { horzLines: { color: p.line } },
      rightPriceScale: { borderColor: p.line },
      timeScale: { borderColor: p.line },
      crosshair: {
        vertLine: { color: p.muted, labelBackgroundColor: p.ink },
        horzLine: { color: p.muted, labelBackgroundColor: p.ink },
      },
    })
    srRef.current?.applyOptions({ color: p.red })
    baneRef.current?.applyOptions({ color: p.red })
    niborRef.current?.applyOptions({ color: p.neutralLight })
  }, [isDark])

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs text-muted dark:text-muted-dark">
        <LegendItem color={palette.red} label={COPY.rentebane.legend.historisk} />
        <LegendItem color={palette.red} dashed label={COPY.rentebane.legend.bane} />
        {showNibor && <LegendItem color={palette.neutralLight} label={COPY.rentebane.legend.nibor} />}
      </div>
      <div ref={containerRef} className="h-[320px] sm:h-[400px] w-full" />
    </div>
  )
}
