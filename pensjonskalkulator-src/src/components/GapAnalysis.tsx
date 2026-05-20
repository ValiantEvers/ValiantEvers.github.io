import type { PensionResult } from '../pension-engine'
import { formatKr, formatPercent } from '../lib/format'

interface Props {
  result: PensionResult
}

export function GapAnalysis({ result }: Props) {
  const { gapAnalysis, replacementRatio, inputs, finalSalaryReal, monthlyAtRetirementReal } =
    result
  const targetPct = inputs.targetReplacementRatio

  if (gapAnalysis.onTrack) {
    return (
      <div className="rounded-3xl bg-white shadow-card p-5 sm:p-7">
        <div className="text-xs uppercase tracking-[0.25em] text-muted mb-2">Gap-analyse</div>
        <p className="font-display text-2xl sm:text-3xl text-ink leading-snug">
          Du er på god vei — estimert dekningsgrad{' '}
          <span className="text-accent">{formatPercent(replacementRatio, 0)}</span> av
          sluttlønn.
        </p>
        <p className="text-sm text-muted mt-3 max-w-xl leading-relaxed">
          Målet på {formatPercent(targetPct, 0)} dekkes av folketrygd, tjenestepensjon
          {monthlyAtRetirementReal.ips > 0 ? ', IPS' : ''}
          {monthlyAtRetirementReal.ask > 0 ? ' og annen sparing' : ''}. Sluttlønn i dagens
          kroner: {formatKr(finalSalaryReal)}.
        </p>
        <p className="text-xs text-muted/80 mt-4 leading-relaxed max-w-xl">
          Dekningsgrad måles mot sluttlønn. Ved sen pensjonering vokser sluttlønnen raskere
          enn pensjonen klarer å holde tritt med, så dekningsgraden kan paradoksalt nok
          falle selv om månedlig pensjon stiger i kroner.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-ink text-bg shadow-pop p-5 sm:p-7">
      <div className="text-xs uppercase tracking-[0.25em] text-bg/60 mb-2">Gap-analyse</div>
      <p className="font-display text-2xl sm:text-3xl leading-snug">
        For å nå {formatPercent(targetPct, 0)} av sluttlønn må du spare ekstra{' '}
        <span className="text-accent">{formatKr(gapAnalysis.extraAskMonthlyToday)}</span>{' '}
        <span className="text-bg">i måneden</span> i ASK eller fond.
      </p>
      <p className="text-sm text-bg/70 mt-3 max-w-xl leading-relaxed">
        Estimert dekningsgrad i dag: {formatPercent(replacementRatio, 0)}. Tallet er regnet
        i dagens kroner — beløpet justeres automatisk med inflasjon i utregningen.
      </p>
      <p className="text-xs text-bg/60 mt-4 leading-relaxed max-w-xl">
        Dekningsgrad måles mot sluttlønn. Ved sen pensjonering vokser sluttlønnen raskere
        enn pensjonen klarer å holde tritt med, så dekningsgraden kan paradoksalt nok
        falle selv om månedlig pensjon stiger i kroner.
      </p>
    </div>
  )
}
