import { ReactNode } from 'react'

export function Section({
  id,
  title,
  body,
  chart,
  source,
  extra,
}: {
  id: string
  title: string
  body: string
  chart: ReactNode
  source?: string
  extra?: ReactNode
}) {
  return (
    <section id={id} className="border-t border-line dark:border-line-dark py-12 sm:py-16">
      <div className="mx-auto max-w-prose px-6">
        <h2 className="font-serif text-2xl sm:text-3xl tracking-tight">
          <span className="border-b-2 border-nbred pb-1">{title}</span>
        </h2>
        <p className="mt-5 text-base leading-relaxed text-ink/90 dark:text-ink-dark/90">
          {body}
        </p>
      </div>
      <div className="mx-auto max-w-chart px-6 mt-8">
        {chart}
        {extra && <div className="mt-4">{extra}</div>}
        {source && (
          <p className="mt-4 text-xs text-muted dark:text-muted-dark">{source}</p>
        )}
      </div>
    </section>
  )
}
