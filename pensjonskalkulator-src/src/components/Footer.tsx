import { useState } from 'react'
import { useSpraak } from '../lib/i18n'
import { kodesnutt } from '../lib/embed'

export function Footer({ innebygd = false }: { innebygd?: boolean }) {
  const { t, lang } = useSpraak()
  const [kopiert, setKopiert] = useState(false)
  const kode = kodesnutt(lang)
  const kopier = () => {
    navigator.clipboard?.writeText(kode).then(
      () => {
        setKopiert(true)
        setTimeout(() => setKopiert(false), 2500)
      },
      () => {},
    )
  }
  return (
    <footer
      className={`max-w-3xl mx-auto px-1 ${innebygd ? 'mt-8 pb-2' : 'mt-12 sm:mt-16 pb-12 sm:pb-16'}`}
    >
      <div className="border-t border-ink/10 pt-8">
        <p className="text-xs text-muted leading-relaxed">
          {t.ansvar}
        </p>
        {!innebygd && (
          <details className="mt-5 text-xs text-muted">
            <summary className="cursor-pointer underline underline-offset-4 hover:text-ink">
              {t.byggInn}
            </summary>
            <p className="mt-3 leading-relaxed">{t.byggInnForklaring}</p>
            <pre className="mt-3 p-3 rounded-xl border border-ink/10 bg-bg overflow-x-auto text-[11px] leading-snug text-ink/85 whitespace-pre">
              <code>{kode}</code>
            </pre>
            <button
              type="button"
              onClick={kopier}
              className="mt-2 px-3 py-1 rounded-full border border-ink/15 text-ink font-semibold hover:border-ink/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {kopiert ? t.kopiert : t.kopier}
            </button>
          </details>
        )}
        {!innebygd && (
        <p className="text-xs text-muted mt-5">
          <a
            href="/"
            className="underline underline-offset-4 hover:text-ink transition-colors"
          >
            {t.tilbake}
          </a>
        </p>
        )}
      </div>
    </footer>
  )
}
