import { COPY } from '../content/descriptions'
import { fmtDateLong } from '../lib/format'

export function Header({ lastUpdated }: { lastUpdated: string | null }) {
  const dateStr = lastUpdated ? fmtDateLong(lastUpdated.slice(0, 10)) : null
  return (
    <header className="mx-auto max-w-prose px-6 pt-16 pb-12 sm:pt-24">
      <h1 className="font-serif text-4xl sm:text-5xl tracking-tight leading-tight">
        {COPY.header.title}
      </h1>
      <p className="mt-3 text-lg text-muted dark:text-muted-dark">
        {COPY.header.tagline}
      </p>
      <div className="mt-6 flex flex-col gap-1 text-xs text-muted dark:text-muted-dark">
        {dateStr && (
          <span>
            {COPY.header.last_updated_prefix}: <span className="num">{dateStr}</span>
          </span>
        )}
        <span>{COPY.header.built_by}</span>
      </div>
    </header>
  )
}
