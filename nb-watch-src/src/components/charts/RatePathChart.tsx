import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useTheme } from '../../lib/useTheme'
import { fmtPct, fmtYearFromEpoch, toEpoch, yearTickEpochs, fmtDateShort } from '../../lib/format'
import { Point, RentebanePoint } from '../../lib/data'
import { COPY } from '../../content/descriptions'

type Row = {
  t: number  // epoch ms
  date: string
  historisk?: number
  bane?: number
  nibor?: number
}

export function RatePathChart({
  styringsrente,
  nibor,
  rentebane,
}: {
  styringsrente: Point[]
  nibor: Point[]
  rentebane: RentebanePoint[]
}) {
  const { palette } = useTheme()

  const map = new Map<string, Row>()
  for (const p of styringsrente) {
    const r = map.get(p.date) || { t: toEpoch(p.date), date: p.date }
    r.historisk = p.value
    map.set(p.date, r)
  }
  for (const p of nibor) {
    const r = map.get(p.date) || { t: toEpoch(p.date), date: p.date }
    r.nibor = p.value
    map.set(p.date, r)
  }
  for (const p of rentebane) {
    const r = map.get(p.date) || { t: toEpoch(p.date), date: p.date }
    r.bane = p.value
    map.set(p.date, r)
  }
  const data = Array.from(map.values()).sort((a, b) => a.t - b.t)
  const ticks = yearTickEpochs(data.map((d) => d.date))

  const xMin = data[0]?.t
  const xMax = data[data.length - 1]?.t

  return (
    <div className="h-[320px] sm:h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={palette.line} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[xMin ?? 'auto', xMax ?? 'auto']}
            ticks={ticks}
            tickFormatter={fmtYearFromEpoch}
            stroke={palette.muted}
            tick={{ fontSize: 11 }}
            allowDataOverflow={false}
          />
          <YAxis
            stroke={palette.muted}
            tickFormatter={(v) => `${v} %`}
            tick={{ fontSize: 11 }}
            width={45}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(v: number) => fmtPct(v)}
            labelFormatter={(v: number) => fmtDateShort(new Date(v).toISOString().slice(0, 10))}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="stepAfter"
            dataKey="nibor"
            name={COPY.rentebane.legend.nibor}
            stroke={palette.neutralLight}
            strokeWidth={1}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="stepAfter"
            dataKey="historisk"
            name={COPY.rentebane.legend.historisk}
            stroke={palette.red}
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="bane"
            name={COPY.rentebane.legend.bane}
            stroke={palette.red}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
