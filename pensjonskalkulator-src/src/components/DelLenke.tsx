import { useEffect, useRef, useState } from 'react'
import type { PensionInputs } from '../pension-engine'
import { useSpraak } from '../lib/i18n'
import { delbarLenke } from '../lib/useUrlState'

interface Props {
  inputs: PensionInputs
  baseline: PensionInputs
}

// «Kopier lenke til utregningen»: hele scenarioet ligger i lenken (useUrlState), ingen server.
// Nekter nettleseren utklippstavlen (f.eks. i en innebygd ramme uten clipboard-write),
// vises lenken i et felt som er markert og klart til å kopieres for hånd.
export function DelLenke({ inputs, baseline }: Props) {
  const { t, lang } = useSpraak()
  const [status, setStatus] = useState<'klar' | 'kopiert' | 'manuelt'>('klar')
  const [lenke, setLenke] = useState('')
  const felt = useRef<HTMLInputElement>(null)
  const tidtaker = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (tidtaker.current) clearTimeout(tidtaker.current)
  }, [])
  useEffect(() => {
    if (status === 'manuelt') felt.current?.select()
  }, [status, lenke])

  const kopier = () => {
    const url = delbarLenke(inputs, baseline, lang)
    setLenke(url)
    const manuelt = () => setStatus('manuelt')
    if (!navigator.clipboard?.writeText) return manuelt()
    navigator.clipboard.writeText(url).then(() => {
      setStatus('kopiert')
      if (tidtaker.current) clearTimeout(tidtaker.current)
      tidtaker.current = setTimeout(() => setStatus('klar'), 2500)
    }, manuelt)
  }

  return (
    <div className="mt-5 max-w-xl">
      <button
        type="button"
        onClick={kopier}
        className="px-4 py-1.5 rounded-full border border-ink/15 text-sm text-ink font-semibold hover:border-ink/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t.delKnapp}
      </button>
      <span role="status" className="ml-3 text-sm text-ink">
        {status === 'kopiert' ? t.delKopiert : ''}
      </span>
      {status === 'manuelt' && (
        <label className="block mt-3 text-xs text-muted">
          {t.delManuelt}
          <input
            ref={felt}
            readOnly
            value={lenke}
            aria-label={t.delLenkeFelt}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1.5 block w-full px-3 py-1.5 rounded-xl border border-ink/15 bg-bg text-ink text-xs tabular"
          />
        </label>
      )}
      <p className="text-xs text-muted mt-2 leading-relaxed">{t.delForklaring}</p>
    </div>
  )
}
