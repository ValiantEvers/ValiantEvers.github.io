import type { PensionInputs } from '../pension-engine'
import { G_CAP_LOW, G_CAP_HIGH, IPS_ANNUAL_MAX, G_DEFAULT_AS_OF } from '../pension-engine'
import { NumberField, SliderField, ToggleField, sliderFormatters } from './InputControls'
import { formatKr } from '../lib/format'
import { fmtAsOf, type MacroData, type MacroSeries } from '../lib/macro'

interface Props {
  inputs: PensionInputs
  update: <K extends keyof PensionInputs>(key: K, value: PensionInputs[K]) => void
  macro?: MacroData | null
}

export function InputPanel({ inputs, update, macro }: Props) {
  // Live makro-verdi → kildehenvisning + sist oppdatert; ellers en dokumentert antagelse.
  const srcNote = (s?: MacroSeries) =>
    s?.source ? `Kilde: ${s.source} · oppdatert ${fmtAsOf(s.asOf)}` : undefined
  const ipsOver = inputs.ipsAnnualContribution > IPS_ANNUAL_MAX
  const salaryAbove12G = inputs.salaryGross > G_CAP_HIGH * inputs.G
  const salaryAbove71G = inputs.salaryGross > G_CAP_LOW * inputs.G
  const cap71G = G_CAP_LOW * inputs.G

  return (
    <div className="rounded-3xl bg-white shadow-card p-5 sm:p-8">
      {/* Hovedseksjon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <NumberField
          id="currentAge"
          label="Nåværende alder"
          unit="år"
          value={inputs.currentAge}
          onChange={(v) => update('currentAge', v)}
          min={18}
          max={inputs.retirementAge - 1}
          step={1}
        />
        <SliderField
          id="retirementAge"
          label="Ønsket pensjonsalder"
          value={inputs.retirementAge}
          onChange={(v) => update('retirementAge', v)}
          min={Math.max(62, inputs.currentAge + 1)}
          max={75}
          step={1}
          formatValue={sliderFormatters.age}
        />
        <NumberField
          id="salaryGross"
          label="Bruttolønn"
          unit="kr/år"
          value={inputs.salaryGross}
          onChange={(v) => update('salaryGross', v)}
          min={0}
          step={10_000}
          warning={
            salaryAbove12G
              ? `Lønn over 12 G (${formatKr(G_CAP_HIGH * inputs.G)}) gir ikke mer pensjonsopptjening.`
              : undefined
          }
        />
        <NumberField
          id="wageGrowth"
          label="Forventet lønnsvekst (nominell)"
          unit="%"
          value={Math.round(inputs.wageGrowthNominal * 1000) / 10}
          onChange={(v) => update('wageGrowthNominal', v / 100)}
          min={0}
          max={20}
          step={0.1}
          help={srcNote(macro?.wageGrowth) ?? 'Antagelse: forventet årlig lønnsvekst.'}
        />
        <details className="md:col-span-2 rounded-2xl border border-ink/10 p-4 group">
          <summary className="cursor-pointer text-sm font-semibold text-ink/80 select-none">
            Har du allerede pensjonssparing?{' '}
            <span className="text-muted font-normal">(valgfritt)</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            <NumberField
              id="existingFolketrygdBalance"
              label="Folketrygd-beholdning hos NAV"
              unit="kr"
              value={inputs.existingFolketrygdBalance}
              onChange={(v) => update('existingFolketrygdBalance', v)}
              min={0}
              step={10_000}
              help="Logg inn på nav.no for å se beholdningen din."
            />
            <NumberField
              id="existingOtpBalance"
              label="Tjenestepensjon-saldo"
              unit="kr"
              value={inputs.existingOtpBalance}
              onChange={(v) => update('existingOtpBalance', v)}
              min={0}
              step={10_000}
              help="Summer alle innskuddspensjon-saldoer fra tidligere og nåværende arbeidsgivere."
            />
            <NumberField
              id="existingIpsBalance"
              label="IPS-saldo"
              unit="kr"
              value={inputs.existingIpsBalance}
              onChange={(v) => update('existingIpsBalance', v)}
              min={0}
              step={10_000}
            />
            <NumberField
              id="existingAskBalance"
              label="ASK / fondskonto-saldo"
              unit="kr"
              value={inputs.existingAskBalance}
              onChange={(v) => update('existingAskBalance', v)}
              min={0}
              step={10_000}
            />
          </div>
        </details>
        <SliderField
          id="otpRateLow"
          label="Tjenestepensjon (opp til 7,1 G)"
          value={Math.round(inputs.otpRateLow * 1000) / 10}
          onChange={(v) => update('otpRateLow', v / 100)}
          min={2}
          max={7}
          step={0.1}
          formatValue={sliderFormatters.percent}
          help={`Minst 2 % er lovpålagt. Lønn opp til 7,1 G = ${formatKr(cap71G)}.`}
        />
        <NumberField
          id="ipsAnnual"
          label="IPS-bidrag per år"
          unit="kr"
          value={inputs.ipsAnnualContribution}
          onChange={(v) => update('ipsAnnualContribution', v)}
          min={0}
          step={500}
          help={`Maks ${formatKr(IPS_ANNUAL_MAX)} per år.`}
          warning={
            ipsOver
              ? `Vi bruker ${formatKr(IPS_ANNUAL_MAX)} i beregningen — det er lovlig maks. Sett verdien ned, eller la den stå (beregningen kapper uansett).`
              : undefined
          }
        />
        <NumberField
          id="askMonthly"
          label="Annen sparing (ASK/fond)"
          unit="kr/mnd"
          value={inputs.askMonthlyContribution}
          onChange={(v) => update('askMonthlyContribution', v)}
          min={0}
          step={500}
        />
      </div>

      <div className="mt-6">
        <ToggleField
          id="includeAfp"
          label="Inkluder privat AFP"
          description="Forenklet estimat (0,8 × G livsvarig, ≈ 8 700 kr/mnd). For en typisk lønnsmottaker med rundt 35 års opptjeningsår treffer dette omtrent riktig. For deltidsarbeidere eller kortere yrkeskarrierer er det en overestimat. AFP gjelder kun privat sektor og krever oppfylte kvalifiseringskriterier (jobbet 7 av siste 9 år i AFP-bedrift)."
          value={inputs.includeAfp}
          onChange={(v) => update('includeAfp', v)}
        />
      </div>

      {/* Avansert */}
      <details className="mt-6 border-t border-ink/10 pt-5 group">
        <summary className="cursor-pointer text-sm font-semibold text-accent uppercase tracking-[0.2em] list-none flex items-center gap-2 select-none">
          <span
            aria-hidden
            className="inline-block transition-transform group-open:rotate-90"
          >
            ›
          </span>
          Avanserte innstillinger
        </summary>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <NumberField
            id="G"
            label="G-verdi (grunnbeløp)"
            unit="kr"
            value={inputs.G}
            onChange={(v) => update('G', v)}
            min={1}
            step={100}
            help={`Standard: ${formatKr(inputs.G)} per ${G_DEFAULT_AS_OF}. Sjekk nav.no/grunnbelopet for siste verdi.`}
          />
          <NumberField
            id="inflation"
            label="Inflasjon (nominell)"
            unit="%"
            value={Math.round(inputs.inflationNominal * 1000) / 10}
            onChange={(v) => update('inflationNominal', v / 100)}
            min={0}
            max={15}
            step={0.1}
            help={srcNote(macro?.inflation) ?? 'Antagelse: forventet prisvekst.'}
          />
          <NumberField
            id="realReturn"
            label="Forventet realavkastning"
            unit="%"
            value={Math.round(inputs.realReturn * 1000) / 10}
            onChange={(v) => update('realReturn', v / 100)}
            min={-5}
            max={15}
            step={0.1}
            help="Antagelse: langsiktig forventet realavkastning (etter inflasjon). Nominell regnes ut automatisk."
          />
          <NumberField
            id="payoutRealReturn"
            label="Realavkastning i utbetalingsfasen"
            unit="%"
            value={Math.round(inputs.payoutRealReturn * 1000) / 10}
            onChange={(v) => update('payoutRealReturn', v / 100)}
            min={-5}
            max={15}
            step={0.1}
            help="Antagelse: lavere enn opptjeningsavkastning fordi pensjonister typisk de-risker porteføljen. Folketrygd bruker NAVs delingstall og påvirkes ikke av dette."
          />
          <NumberField
            id="delingstall"
            label="Delingstall ved pensjonsalder"
            unit=""
            value={inputs.delingstall}
            onChange={(v) => update('delingstall', v)}
            min={10}
            max={30}
            step={0.1}
            help="Typisk 16–20, høyere for yngre årskull. NAV publiserer forventede tall per kohort."
          />
          <NumberField
            id="otpPayoutYears"
            label="Tjenestepensjon utbetalingstid"
            unit="år"
            value={inputs.otpPayoutYears}
            onChange={(v) => update('otpPayoutYears', v)}
            min={10}
            max={30}
            step={1}
            help="Innskuddspensjon utbetales lovpålagt over minimum 10 år eller til 77 år."
          />
          <NumberField
            id="ipsPayoutYears"
            label="IPS utbetalingstid"
            unit="år"
            value={inputs.ipsPayoutYears}
            onChange={(v) => update('ipsPayoutYears', v)}
            min={10}
            max={30}
            step={1}
          />
          <NumberField
            id="askPayoutYears"
            label="ASK utbetalingstid"
            unit="år"
            value={inputs.askPayoutYears}
            onChange={(v) => update('askPayoutYears', v)}
            min={5}
            max={40}
            step={1}
          />
          <SliderField
            id="otpRateHigh"
            label="Tjenestepensjon (7,1G – 12G)"
            value={Math.round(inputs.otpRateHigh * 1000) / 10}
            onChange={(v) => update('otpRateHigh', v / 100)}
            min={0}
            max={18.1}
            step={0.1}
            formatValue={sliderFormatters.percent}
            help={
              salaryAbove71G
                ? `Maks lovlig sats er 18,1 %. Lønn over 7,1 G ≈ ${formatKr(
                    Math.max(0, inputs.salaryGross - cap71G),
                  )} faller i båndet.`
                : `Maks lovlig sats er 18,1 %. Gjelder kun hvis lønnen er over 7,1 G ≈ ${formatKr(cap71G)}.`
            }
          />
          <SliderField
            id="targetReplacementRatio"
            label="Måldekningsgrad (av sluttlønn)"
            value={Math.round(inputs.targetReplacementRatio * 100)}
            onChange={(v) => update('targetReplacementRatio', v / 100)}
            min={50}
            max={90}
            step={1}
            formatValue={(v) => `${v} %`}
          />
        </div>
      </details>
    </div>
  )
}
