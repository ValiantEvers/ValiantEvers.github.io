interface Props {
  value: 'real' | 'nominal'
  onChange: (v: 'real' | 'nominal') => void
}

export function DisplayToggle({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Visningsmodus for kroner"
      className="inline-flex bg-bg border border-ink/15 rounded-full p-1 text-sm"
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === 'real'}
        onClick={() => onChange('real')}
        className={`px-4 py-1.5 rounded-full font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
          value === 'real' ? 'bg-ink text-bg' : 'text-ink/70 hover:text-ink'
        }`}
      >
        Dagens kroner
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'nominal'}
        onClick={() => onChange('nominal')}
        className={`px-4 py-1.5 rounded-full font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
          value === 'nominal' ? 'bg-ink text-bg' : 'text-ink/70 hover:text-ink'
        }`}
      >
        Nominelle kroner
      </button>
    </div>
  )
}
