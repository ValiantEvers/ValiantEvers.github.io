import type { PensionResult } from '../pension-engine'
import { formatKr, formatPercent } from '../lib/format'
import { useSpraak } from '../lib/i18n'

interface Props {
  result: PensionResult
}

export function GapAnalysis({ result }: Props) {
  const { gapAnalysis, replacementRatio, inputs, finalSalaryReal, monthlyAtRetirementReal } =
    result
  const targetPct = inputs.targetReplacementRatio
  const { t } = useSpraak()

  if (gapAnalysis.onTrack) {
    return (
      <div className="rounded-3xl bg-bg border border-ink/10 p-5 sm:p-7">
        <div className="text-sm text-muted mb-2">{t.gapAnalyse}</div>
        <p className="font-display text-2xl sm:text-3xl text-ink leading-snug">
          {t.paaGodVei}{' '}
          <span className="text-accent">{formatPercent(replacementRatio, 0)}</span>{' '}
          {t.avSluttlonn}
        </p>
        <p className="text-sm text-muted mt-3 max-w-xl leading-relaxed">
          {t.maaletDekkes(
            formatPercent(targetPct, 0),
            monthlyAtRetirementReal.ips > 0,
            monthlyAtRetirementReal.ask > 0,
            formatKr(finalSalaryReal),
          )}
        </p>
        <p className="text-xs text-muted mt-4 leading-relaxed max-w-xl">
          {t.dekningsgradForklaring}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-ink text-bg p-5 sm:p-7">
      <div className="text-sm text-bg/60 mb-2">{t.gapAnalyse}</div>
      <p className="font-display text-2xl sm:text-3xl leading-snug">
        {t.forAaNaa(formatPercent(targetPct, 0))}{' '}
        <span className="text-accent">{formatKr(gapAnalysis.extraAskMonthlyToday)}</span>{' '}
        <span className="text-bg">{t.iMaaneden}</span> {t.iAskEllerFond}
      </p>
      <p className="text-sm text-bg/70 mt-3 max-w-xl leading-relaxed">
        {t.dekningIDag(formatPercent(replacementRatio, 0))}
      </p>
      <p className="text-xs text-bg/60 mt-4 leading-relaxed max-w-xl">
        {t.dekningsgradForklaring}
      </p>
    </div>
  )
}
