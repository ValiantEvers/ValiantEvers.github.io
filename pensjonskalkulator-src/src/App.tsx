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

function App() {
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
    <div className="min-h-screen bg-bg text-ink grain">
      {/* Decorative background blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-accent/[0.05] blur-3xl" />
        <div className="absolute -top-20 -right-24 w-64 h-64 rounded-full bg-ghost/[0.05] blur-3xl" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-10">
        {/* Header */}
        <header className="mb-10 sm:mb-14">
          <p className="text-xs uppercase tracking-[0.25em] text-muted mb-3">
            Pensjonskalkulator
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] text-ink max-w-3xl">
            Hva blir egentlig din pensjon?
          </h1>
          <p className="text-base sm:text-lg text-ink/75 mt-5 max-w-2xl leading-relaxed">
            Norsk pensjon er stykket opp i fire bokser: folketrygd, tjenestepensjon, IPS og
            egen sparing. Kalkulatoren legger dem sammen og viser et grovt estimat — nok til
            å se hvor du står, ikke nok til å erstatte en pensjonsrådgiver.
          </p>
        </header>

        {/* Hero with toggle */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 mb-10">
          <div className="lg:col-span-3 order-2 lg:order-1">
            <HeroNumber
              monthly={monthly}
              displayMode={displayMode}
              includeAfp={inputs.includeAfp}
              folketrygdAtGarantipensjonFloor={result.folketrygdAtGarantipensjonFloor}
            />
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
            Inntekt og sparing
          </h2>
          <InputPanel inputs={inputs} update={update} macro={macro} />
        </section>

        {/* Chart */}
        <section aria-labelledby="chart-heading" className="mb-10 sm:mb-12">
          <h2
            id="chart-heading"
            className="font-display text-2xl sm:text-3xl text-ink mb-5 sm:mb-6"
          >
            Kapital over tid
          </h2>
          <PensionChart result={result} displayMode={displayMode} />
        </section>

        {/* Gap analysis */}
        <section aria-labelledby="gap-heading" className="mb-10 sm:mb-12">
          <h2
            id="gap-heading"
            className="font-display text-2xl sm:text-3xl text-ink mb-5 sm:mb-6"
          >
            Hvor mye mangler det?
          </h2>
          <GapAnalysis result={result} />
        </section>

        <Footer />
      </main>
    </div>
  )
}

export default App
