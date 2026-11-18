import { useEffect, useMemo, useRef, useState } from 'react'
import { calculatePension, DEFAULT_INPUTS, type PensionInputs } from './pension-engine'
import { readInputsFromUrl, useUrlSync } from './lib/useUrlState'
import { fetchMacro, type MacroData } from './lib/macro'
import { InputPanel } from './components/InputPanel'
import { HeroNumber } from './components/HeroNumber'
import { PensionChart } from './components/PensionChart'
import { GapAnalysis } from './components/GapAnalysis'
import { DisplayToggle } from './components/DisplayToggle'
import { Footer } from './components/Footer'
import { DelLenke } from './components/DelLenke'
import { brukSpraak, finnSpraak, SpraakTilbyder, STR, type Lang } from './lib/i18n'
import { erInnebygd, FULL_URL, meldHoyde } from './lib/embed'

function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const l = finnSpraak()
    brukSpraak(l, false)
    return l
  })
  const t = STR[lang]
  const innebygd = useMemo(() => erInnebygd(), [])
  useEffect(() => (innebygd ? meldHoyde() : undefined), [innebygd])
  const velgSpraak = (l: Lang) => {
    brukSpraak(l, true)
    // Lenken skal vise språket, så den kan deles som den er.
    const url = new URL(window.location.href)
    if (l === 'en') url.searchParams.set('lang', 'en')
    else url.searchParams.delete('lang')
    window.history.replaceState({}, '', url.pathname + url.search)
    setLang(l)
  }
  // URL-parametre = eksplisitt brukerintensjon (delt lenke); fanges én gang.
  const urlInputs = useRef<Partial<PensionInputs>>(readInputsFromUrl())
  const [inputs, setInputs] = useState<PensionInputs>(() => ({
    ...DEFAULT_INPUTS,
    ...urlInputs.current,
  }))
  const [macro, setMacro] = useState<MacroData | null>(null)

  // Live makrodata (SSB/Norges Bank via /macro.json) overstyrer inflasjon + lønnsvekst —
  // men kun felt brukeren ikke har satt i URL. Feiler hentingen: defaults står, ingen konsollfeil.
  useEffect(() => {
    let alive = true
    fetchMacro().then((m) => {
      if (!alive || !m) return
      setMacro(m)
      setInputs((prev) => {
        const next = { ...prev }
        if (m.inflation?.yoyPct != null && !('inflationNominal' in urlInputs.current)) {
          next.inflationNominal = m.inflation.yoyPct / 100
        }
        if (m.wageGrowth?.yoyPct != null && !('wageGrowthNominal' in urlInputs.current)) {
          next.wageGrowthNominal = m.wageGrowth.yoyPct / 100
        }
        return next
      })
    })
    return () => {
      alive = false
    }
  }, [])

  // Baseline for URL-sync = defaults overstyrt av live makrodata, så live-verdier ikke
  // forurenser lenken (og hver visning får ferske tall).
  const baseline = useMemo<PensionInputs>(() => {
    if (!macro) return DEFAULT_INPUTS
    return {
      ...DEFAULT_INPUTS,
      inflationNominal:
        macro.inflation?.yoyPct != null ? macro.inflation.yoyPct / 100 : DEFAULT_INPUTS.inflationNominal,
      wageGrowthNominal:
        macro.wageGrowth?.yoyPct != null ? macro.wageGrowth.yoyPct / 100 : DEFAULT_INPUTS.wageGrowthNominal,
    }
  }, [macro])

  useUrlSync(inputs, baseline)
  const [displayMode, setDisplayMode] = useState<'real' | 'nominal'>('real')

  const update = <K extends keyof PensionInputs>(key: K, value: PensionInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  const result = useMemo(() => calculatePension(inputs), [inputs])
  const monthly =
    displayMode === 'real' ? result.monthlyAtRetirementReal : result.monthlyAtRetirementNominal

  return (
    <SpraakTilbyder lang={lang}>
    <div className="min-h-screen bg-bg text-ink grain">
      <main
        className={`relative z-10 max-w-5xl mx-auto px-5 sm:px-8 ${
          innebygd ? 'pt-5 pb-4' : 'pt-16 sm:pt-24 pb-10'
        }`}
      >
        {/* Header. Innebygd (?embed=1): bare en linje med lenken til fullversjonen. */}
        {innebygd ? (
          <header className="mb-6 flex items-baseline justify-between gap-4">
            <h1 className="sr-only">{t.tittel}</h1>
            <p className="text-sm text-muted">{t.overtittel}</p>
            <a
              href={FULL_URL + (lang === 'en' ? '?lang=en' : '')}
              target="_blank"
              rel="noopener"
              className="text-sm text-accent-ink underline underline-offset-4 hover:text-ink"
            >
              {t.innebygdLenke}
            </a>
          </header>
        ) : (
        <header className="mb-10 sm:mb-14">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <p className="text-sm text-muted">{t.overtittel}</p>
            <div role="group" aria-label={t.sprakvalg} className="text-sm">
              {(['no', 'en'] as const).map((l, i) => (
                <span key={l}>
                  {i > 0 && <span aria-hidden className="text-muted px-1.5">·</span>}
                  <button
                    type="button"
                    lang={l === 'en' ? 'en' : 'nb'}
                    aria-pressed={lang === l}
                    onClick={() => velgSpraak(l)}
                    className={`underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded ${
                      lang === l ? 'font-semibold text-ink' : 'text-muted underline hover:text-ink'
                    }`}
                  >
                    {l === 'en' ? 'English' : 'Norsk'}
                  </button>
                </span>
              ))}
            </div>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] text-ink max-w-3xl">
            {t.tittel}
          </h1>
          <p className="text-base sm:text-lg text-ink/75 mt-5 max-w-2xl leading-relaxed">
            {t.ingress}
          </p>
        </header>
        )}

        {/* Hero with toggle */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 mb-10">
          <div className="lg:col-span-3 order-2 lg:order-1">
            <HeroNumber
              monthly={monthly}
              displayMode={displayMode}
              includeAfp={inputs.includeAfp}
              folketrygdAtGarantipensjonFloor={result.folketrygdAtGarantipensjonFloor}
            />
            <DelLenke inputs={inputs} baseline={baseline} />
          </div>
          <div className="lg:col-span-2 order-1 lg:order-2 flex lg:justify-end items-start">
            <DisplayToggle value={displayMode} onChange={setDisplayMode} />
          </div>
        </div>

        {/* Inputs */}
        <section aria-labelledby="inputs-heading" className="mb-10 sm:mb-12">
          <h2
            id="inputs-heading"
            className="font-display text-2xl sm:text-3xl text-ink mb-5 sm:mb-6"
          >
            {t.innTittel}
          </h2>
          <InputPanel inputs={inputs} update={update} macro={macro} />
        </section>

        {/* Chart */}
        <section aria-labelledby="chart-heading" className="mb-10 sm:mb-12">
          <h2
            id="chart-heading"
            className="font-display text-2xl sm:text-3xl text-ink mb-5 sm:mb-6"
          >
            {t.grafSeksjon}
          </h2>
          <PensionChart result={result} displayMode={displayMode} />
        </section>

        {/* Gap analysis */}
        <section aria-labelledby="gap-heading" className="mb-10 sm:mb-12">
          <h2
            id="gap-heading"
            className="font-display text-2xl sm:text-3xl text-ink mb-5 sm:mb-6"
          >
            {t.gapSeksjon}
          </h2>
          <GapAnalysis result={result} />
        </section>

        <Footer innebygd={innebygd} />
      </main>
    </div>
    </SpraakTilbyder>
  )
}

export default App
