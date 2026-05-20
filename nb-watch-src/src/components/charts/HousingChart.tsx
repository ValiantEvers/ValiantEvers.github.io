import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useTheme } from '../../lib/useTheme'
import { fmtPct, fmtNum, fmtYearFromEpoch, toEpoch, yearTickEpochs } from '../../lib/format'
import { LabeledPoint } from '../../lib/data'
import { COPY } from '../../content/descriptions'

type Row = { t: number; date: string; indeks: number; yoy: number | null }

export function HousingChart({ boligpris }: { boligpris: LabeledPoint[] }) {
  const { palette } = useTheme()

  const sorted = [...boligpris].sort((a, b) => a.date.localeCompare(b.date))
  const base = sorted[0]?.value ?? 100
  const data: Row[] = sorted.map((p, i, arr) => {
    const yearAgo = arr[i - 4]  // kvartalsvis → 4 perioder = ett år
    const yoy = yearAgo ? ((p.value - yearAgo.value) / yearAgo.value) * 100 : null
    return {
      t: toEpoch(p.date),
      date: p.date,
      indeks: (p.value / base) * 100,
      yoy,
    }
  })
  const ticks = yearTickEpochs(data.map((d) => d.date))

  return (
    <div className="h-[320px] sm:h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
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
            yAxisId="left"
            stroke={palette.muted}
            tickFormatter={(v) => fmtNum(v, 0)}
            tick={{ fontSize: 11 }}
            width={45}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke={palette.muted}
            tickFormatter={(v) => `${v} %`}
            tick={{ fontSize: 11 }}
            width={45}
          />
          <Tooltip
            formatter={(v: number, name: string) => {
              if (name === COPY.bolig.legend.yoy) return fmtPct(v)
              return fmtNum(v, 1)
            }}
            labelFormatter={(v: number) => new Date(v).toISOString().slice(0, 7)}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="right"
            dataKey="yoy"
            name={COPY.bolig.legend.yoy}
            fill={palette.neutralLight}
            opacity={0.6}
            isAnimationActive={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="indeks"
            name={COPY.bolig.legend.indeks}
            stroke={palette.neutralStrong}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
