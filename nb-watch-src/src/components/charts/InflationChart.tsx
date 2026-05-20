import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { useTheme } from '../../lib/useTheme'
import { fmtPct, fmtMonthYear, fmtYearFromEpoch, toEpoch, yearTickEpochs } from '../../lib/format'
import { LabeledPoint } from '../../lib/data'
import { COPY } from '../../content/descriptions'

type Row = { t: number; date: string; kpi?: number; kpi_jae?: number }

export function InflationChart({ kpi, kpiJae }: { kpi: LabeledPoint[]; kpiJae: LabeledPoint[] }) {
  const { palette } = useTheme()

  const map = new Map<string, Row>()
  for (const p of kpi) {
    const r = map.get(p.date) || { t: toEpoch(p.date), date: p.date }
    r.kpi = p.value
    map.set(p.date, r)
  }
  for (const p of kpiJae) {
    const r = map.get(p.date) || { t: toEpoch(p.date), date: p.date }
    r.kpi_jae = p.value
    map.set(p.date, r)
  }
  const data = Array.from(map.values()).sort((a, b) => a.t - b.t)
  const ticks = yearTickEpochs(data.map((d) => d.date))

  return (
    <div className="h-[320px] sm:h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={palette.line} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={ticks}
            tickFormatter={fmtYearFromEpoch}
            stroke={palette.muted}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            stroke={palette.muted}
            tickFormatter={(v) => `${v} %`}
            tick={{ fontSize: 11 }}
            width={45}
          />
          <Tooltip
            formatter={(v: number) => fmtPct(v)}
            labelFormatter={(v: number) => fmtMonthYear(new Date(v).toISOString().slice(0, 10))}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            y={2}
            stroke={palette.muted}
            strokeDasharray="3 3"
            label={{
              value: COPY.inflasjon.legend.mal,
              position: 'insideTopRight',
              fontSize: 10,
              fill: palette.muted,
            }}
          />
          <Line
            type="monotone"
            dataKey="kpi"
            name={COPY.inflasjon.legend.kpi}
            stroke={palette.neutralStrong}
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="kpi_jae"
            name={COPY.inflasjon.legend.kpi_jae}
            stroke={palette.red}
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
