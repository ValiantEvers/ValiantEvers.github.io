import { useSpraak } from '../lib/i18n'

export function Footer() {
  const { t } = useSpraak()
  return (
    <footer className="mt-12 sm:mt-16 pb-12 sm:pb-16 max-w-3xl mx-auto px-1">
      <div className="border-t border-ink/10 pt-8">
        <p className="text-xs text-muted leading-relaxed">
          {t.ansvar}
        </p>
        <p className="text-xs text-muted mt-5">
          <a
            href="/"
            className="underline underline-offset-4 hover:text-ink transition-colors"
          >
            {t.tilbake}
          </a>
        </p>
      </div>
    </footer>
  )
}
