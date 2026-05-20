import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PensionResult } from '../pension-engine'
import { SOURCE_COLORS, SOURCE_LABELS } from '../lib/colors'

type StackKey = 'folketrygd' | 'otp' | 'ips' | 'ask'
import { formatKr, formatKrCompact } from '../lib/format'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'

interface Props {
  result: PensionResult
  displayMode: 'real' | 'nominal'
}

const STACK_ORDER: StackKey[] = ['folketrygd', 'otp', 'ips', 'ask']

interface ChartRow {
  age: number
  folketrygd: number
  otp: number
  ips: number
  ask: number
  total: number
}

export function PensionChart({ result, displayMode }: Props) {
  const reducedMotion = usePrefersReducedMotion()

  const data: ChartRow[] = useMemo(() => {
    return result.series.map((y) => {
      const factor = displayMode === 'real' ? 1 / y.inflationFactor : 1
      const folketrygd = y.folketrygdBalance * factor
      const otp = y.otpBalance * factor
      const ips = y.ipsBalance * factor
      const ask = y.askBalance * factor
      return {
        age: y.age,
        folketrygd,
        otp,
        ips,
        ask,
        total: folketrygd + otp + ips + ask,
      }
    })
  }, [result, displayMode])

  const retirementAge = result.inputs.retirementAge

  return (
    <div className="rounded-3xl bg-white shadow-card p-5 sm:p-7">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
        <h3 className="font-display text-xl sm:text-2xl text-ink">
          Akkumulert kapital over tid
        </h3>
        <span className="text-xs uppercase tracking-[0.2em] text-muted">
          {displayMode === 'real' ? 'Dagens kroner' : 'Nominelle kroner'}
        </span>
      </div>
      <p className="text-sm text-muted">
        Stablet balanse for hver pensjonskilde. Toppen er ved pensjonsalder, deretter
        reduseres balansen etter hvert som pengene utbetales.
      </p>
      <p className="text-xs text-muted/80 mb-5 mt-1">
        Folketrygd og AFP utbetales livsvarig — kapitalen i grafen er kun en regnemodell og
        kan gå mot null selv om utbetalingen fortsetter.
      </p>

      <div
        className="h-72 sm:h-[340px] w-full"
        role="img"
        aria-label={`Stablet arealgraf som viser nominell kapital i folketrygd, tjenestepensjon, IPS og ASK fra alder ${data[0]?.age ?? '?'} til ${data[data.length - 1]?.age ?? '?'}. Toppen er ved pensjonsalder ${retirementAge}. Verdier vises i ${displayMode === 'real' ? 'dagens' : 'nominelle'} kroner.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1A1A1A" strokeOpacity={0.06} vertical={false} />
            <XAxis
              dataKey="age"
              tick={{ fill: '#7A7268', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#1A1A1A', strokeOpacity: 0.2 }}
              label={{
                value: 'Alder',
                position: 'insideBottom',
                offset: -2,
                style: { fill: '#7A7268', fontSize: 11 },
              }}
              ticks={getAgeTicks(data, retirementAge)}
            />
            <YAxis
              tick={{ fill: '#7A7268', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatKrCompact(v)}
              width={70}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#1A1A1A', strokeOpacity: 0.2 }} />
            {STACK_ORDER.map((src) => (
              <Area
                key={src}
                type="monotone"
                dataKey={src}
                stackId="1"
                stroke={SOURCE_COLORS[src]}
                fill={SOURCE_COLORS[src]}
                fillOpacity={0.85}
                strokeWidth={1}
                isAnimationActive={!reducedMotion}
                animationDuration={500}
                name={SOURCE_LABELS[src]}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {STACK_ORDER.map((src) => (
          <span key={src} className="inline-flex items-center gap-2 text-ink/70">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: SOURCE_COLORS[src] }}
            />
            {SOURCE_LABELS[src]}
          </span>
        ))}
      </div>
    </div>
  )
}

function getAgeTicks(data: ChartRow[], retirementAge: number): number[] {
  if (data.length === 0) return []
  const first = data[0].age
  const last = data[data.length - 1].age
  const ticks = new Set<number>()
  ticks.add(first)
  ticks.add(retirementAge)
  ticks.add(last)
  for (let a = Math.ceil(first / 10) * 10; a <= last; a += 10) {
    ticks.add(a)
  }
  return [...ticks].sort((a, b) => a - b)
}

interface TooltipPayload {
  dataKey: string
  value: number
  color: string
  payload: ChartRow
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: number
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0].payload
  return (
    <div className="bg-white rounded-xl shadow-card border border-ink/10 px-4 py-3 text-sm">
      <div className="font-display font-semibold text-ink mb-1.5">{label} år</div>
      <ul className="space-y-0.5">
        {STACK_ORDER.map((src) => (
          <li key={src} className="flex items-center justify-between gap-4 text-xs">
            <span className="inline-flex items-center gap-2 text-ink/75">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: SOURCE_COLORS[src] }}
              />
              {SOURCE_LABELS[src]}
            </span>
            <span className="font-semibold tabular text-ink">{formatKr(row[src])}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-4 text-xs pt-1.5 mt-1 border-t border-ink/10">
          <span className="text-ink/75 font-semibold">Sum</span>
          <span className="font-display font-semibold tabular text-ink">
            {formatKr(row.total)}
          </span>
        </li>
      </ul>
    </div>
  )
}
