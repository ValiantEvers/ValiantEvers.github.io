import type { MonthlyBreakdown } from '../pension-engine'
import { SOURCE_COLORS, SOURCE_LABELS, type SourceKey } from '../lib/colors'
import { formatKr } from '../lib/format'

interface Props {
  monthly: MonthlyBreakdown
  displayMode: 'real' | 'nominal'
  includeAfp: boolean
  folketrygdAtGarantipensjonFloor: boolean
}

export function HeroNumber({
  monthly,
  displayMode,
  includeAfp,
  folketrygdAtGarantipensjonFloor,
}: Props) {
  const visible: SourceKey[] = ['folketrygd', 'otp', 'ips', 'ask']
  if (includeAfp) visible.push('afp')

  const labelSuffix = displayMode === 'real' ? 'i dagens kroner' : 'i nominelle kroner'

  return (
    <section
      aria-labelledby="hero-heading"
      className="rounded-3xl bg-bg/0 px-1 py-2 sm:py-6"
    >
      <div className="text-xs uppercase tracking-[0.25em] text-muted mb-3">
        Estimert månedlig pensjon
      </div>
      <div
        id="hero-heading"
        className="font-display text-bignum tabular text-ink"
        aria-live="polite"
      >
        {formatKr(monthly.total)}
      </div>
      <div className="text-sm text-muted mt-1">{labelSuffix}</div>

      <p className="text-base sm:text-lg text-ink/70 mt-3">
        Estimert netto:{' '}
        <span className="font-semibold text-ink tabular">{formatKr(monthly.net)}</span>
        <span className="text-muted text-sm ml-2">(etter skatt — forenklet estimat)</span>
      </p>

      <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-w-xl">
        {visible.map((src) => {
          const value = monthly[src]
          if (src === 'afp' && value === 0) return null
          return (
            <li
              key={src}
              className="flex items-baseline justify-between gap-3 text-sm border-b border-ink/10 py-1.5"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SOURCE_COLORS[src] }}
                />
                <span className="text-ink/75">{SOURCE_LABELS[src]}</span>
                {src === 'folketrygd' && folketrygdAtGarantipensjonFloor && (
                  <span className="text-xs text-muted ml-1">(garantipensjon-floor)</span>
                )}
              </span>
              <span className="font-semibold tabular text-ink">{formatKr(value)}</span>
            </li>
          )
        })}
      </ul>

      <p className="text-xs text-muted/80 mt-4 max-w-xl leading-relaxed">
        Brutto = før skatt. Netto er et grovt estimat basert på 2025-satser og forutsetter
        at hele pensjonen tas ut samme år.
      </p>
    </section>
  )
}
