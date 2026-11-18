import { useSpraak } from '../lib/i18n'

interface Props {
  value: 'real' | 'nominal'
  onChange: (v: 'real' | 'nominal') => void
}

export function DisplayToggle({ value, onChange }: Props) {
  const { t } = useSpraak()
  return (
    <div
      role="radiogroup"
      aria-label={t.visningsmodus}
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
        {t.dagensKroner}
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
        {t.nominelleKroner}
      </button>
    </div>
  )
}
