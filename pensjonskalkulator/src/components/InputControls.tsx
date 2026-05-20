import type { ReactNode } from 'react'
import { formatKr, formatNumber } from '../lib/format'

interface NumberFieldProps {
  id: string
  label: string
  unit?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  help?: ReactNode
  warning?: ReactNode
}

export function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step,
  help,
  warning,
}: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink/85">
        {label}
      </label>
      <div className="flex items-center bg-bg border border-ink/15 rounded-xl focus-within:border-accent transition-colors">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => {
            const v = e.target.value === '' ? 0 : Number(e.target.value)
            onChange(v)
          }}
          min={min}
          max={max}
          step={step}
          className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-base font-semibold tabular outline-none"
        />
        {unit && <span className="text-xs text-muted pr-3 whitespace-nowrap">{unit}</span>}
      </div>
      {help && <p className="text-xs text-muted/80 leading-snug">{help}</p>}
      {warning && (
        <p className="text-xs text-accent font-medium leading-snug" role="alert">
          {warning}
        </p>
      )}
    </div>
  )
}

interface SliderFieldProps {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  formatValue: (v: number) => string
  help?: ReactNode
}

export function SliderField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  formatValue,
  help,
}: SliderFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink/85">
          {label}
        </label>
        <span className="text-base font-display font-semibold tabular text-ink" aria-hidden>
          {formatValue(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={formatValue(value)}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        className="mt-2"
      />
      {help && <p className="text-xs text-muted/80 leading-snug mt-1">{help}</p>}
    </div>
  )
}

interface ToggleFieldProps {
  id: string
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}

export function ToggleField({ id, label, description, value, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-start justify-between gap-4 bg-bg border border-ink/15 rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-ink/85 block cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted/80 leading-snug mt-0.5">{description}</p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative shrink-0 h-7 w-12 rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
          value
            ? 'bg-accent border-accent'
            : 'bg-bg border-ink/25 hover:border-ink/40'
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg shadow-sm transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

// Convenience: formatters bundled here so InputPanel doesn't repeat them
export const sliderFormatters = {
  age: (v: number) => `${v} år`,
  percent: (v: number) => `${formatNumber(v, 1)} %`,
  kr: (v: number) => formatKr(v),
  years: (v: number) => `${formatNumber(v, 0)} år`,
  delingstall: (v: number) => formatNumber(v, 1),
}
