import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts'
import { useTheme } from '../../lib/useTheme'
import { fmtPct } from '../../lib/format'
import { LonnPoint } from '../../lib/data'

export function WageChart({ lonn }: { lonn: LonnPoint[] }) {
  const { palette } = useTheme()

  const data = lonn
    .filter((p) => p.yoy_pct !== null)
    .map((p) => ({ year: p.year, yoy: p.yoy_pct as number }))

  return (
    <div className="h-[300px] sm:h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke={palette.line} vertical={false} />
          <XAxis dataKey="year" stroke={palette.muted} tick={{ fontSize: 11 }} />
          <YAxis
            stroke={palette.muted}
            tickFormatter={(v) => `${v} %`}
            tick={{ fontSize: 11 }}
            width={45}
          />
          <Tooltip
            formatter={(v: number) => fmtPct(v)}
            labelFormatter={(d: string) => `Året ${d}`}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar
            dataKey="yoy"
            fill={palette.neutralStrong}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="yoy"
              position="top"
              formatter={(v: unknown) => (typeof v === 'number' ? fmtPct(v) : '')}
              style={{ fontSize: 10, fill: palette.muted }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
