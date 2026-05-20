import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useTheme } from '../../lib/useTheme'
import { fmtFx, fmtYearFromEpoch, toEpoch, yearTickEpochs, fmtDateShort } from '../../lib/format'
import { ValutaPoint } from '../../lib/data'
import { COPY } from '../../content/descriptions'

type Row = { t: number; date: string; EUR?: number; USD?: number }

export function FxChart({ valuta }: { valuta: ValutaPoint[] }) {
  const { palette } = useTheme()

  // Siste 5 år.
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 5)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const data: Row[] = valuta
    .filter((p) => p.date >= cutoffStr)
    .map((p) => ({ t: toEpoch(p.date), date: p.date, EUR: p.EUR, USD: p.USD }))
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
            tickFormatter={(v) => fmtFx(v, 1)}
            tick={{ fontSize: 11 }}
            width={45}
          />
          <Tooltip
            formatter={(v: number) => fmtFx(v)}
            labelFormatter={(v: number) => fmtDateShort(new Date(v).toISOString().slice(0, 10))}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="EUR"
            name={COPY.valuta.legend.eur}
            stroke={palette.neutralStrong}
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="USD"
            name={COPY.valuta.legend.usd}
            stroke={palette.blue}
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
