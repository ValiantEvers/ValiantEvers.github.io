import { ReactNode } from 'react'

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  accent,
}: {
  label: string
  value: ReactNode
  delta?: ReactNode
  deltaLabel?: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col py-3 sm:py-0">
      <span className="text-xs uppercase tracking-wide text-muted dark:text-muted-dark">
        {label}
      </span>
      <span
        className={
          'mt-2 num text-3xl sm:text-4xl font-serif tracking-tight ' +
          (accent ? 'text-nbred' : '')
        }
      >
        {value}
      </span>
      {(delta !== undefined || deltaLabel) && (
        <span className="mt-1 num text-xs text-muted dark:text-muted-dark">
          {delta} {deltaLabel && <span className="ml-1">{deltaLabel}</span>}
        </span>
      )}
    </div>
  )
}

export function StatTileRow({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-chart px-6 pb-12 sm:pb-16">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 border-y border-line dark:border-line-dark divide-x-0 sm:divide-x sm:divide-line sm:dark:divide-line-dark py-4 sm:py-6 px-0 sm:px-0">
        {children}
      </div>
    </div>
  )
}
