import type { PensionInputs } from '../pension-engine'
import { G_CAP_LOW, G_CAP_HIGH, IPS_ANNUAL_MAX, G_DEFAULT_AS_OF, G_SNITT_FAKTOR } from '../pension-engine'
import { NumberField, SliderField, ToggleField, sliderFormatters } from './InputControls'
import { formatKr } from '../lib/format'
import { fmtAsOf, type MacroData, type MacroSeries } from '../lib/macro'
import { useSpraak } from '../lib/i18n'

interface Props {
  inputs: PensionInputs
  update: <K extends keyof PensionInputs>(key: K, value: PensionInputs[K]) => void
  macro?: MacroData | null
}

export function InputPanel({ inputs, update, macro }: Props) {
  const { t } = useSpraak()
  // Live makro-verdi → kildehenvisning + sist oppdatert; ellers en dokumentert antagelse.
  const srcNote = (s?: MacroSeries) =>
    s?.source ? t.kildeOppdatert(s.source, fmtAsOf(s.asOf)) : undefined
  const ipsOver = inputs.ipsAnnualContribution > IPS_ANNUAL_MAX
  // Takene regnes av gjennomsnittlig G, samme grunnlag som motoren bruker.
  // Brukte panelet mai-verdien, ville varselet slått inn på et annet beløp
  // enn det beregningen faktisk kapper på.
  const gSnitt = inputs.G * G_SNITT_FAKTOR
  const salaryAbove12G = inputs.salaryGross > G_CAP_HIGH * gSnitt
  const salaryAbove71G = inputs.salaryGross > G_CAP_LOW * gSnitt
  const cap71G = G_CAP_LOW * gSnitt

  return (
    <div className="rounded-3xl bg-bg border border-ink/10 p-5 sm:p-8">
      {/* Hovedseksjon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <NumberField
          id="currentAge"
          label={t.naavaerendeAlder}
          unit={t.enhetAar}
          value={inputs.currentAge}
          onChange={(v) => update('currentAge', v)}
          min={18}
          max={inputs.retirementAge - 1}
          step={1}
        />
        <SliderField
          id="retirementAge"
          label={t.onsketPensjonsalder}
          value={inputs.retirementAge}
          onChange={(v) => update('retirementAge', v)}
          min={Math.max(62, inputs.currentAge + 1)}
          max={75}
          step={1}
          formatValue={sliderFormatters.age}
        />
        <NumberField
          id="salaryGross"
          label={t.bruttolonn}
          unit={t.enhetKrAar}
          value={inputs.salaryGross}
          onChange={(v) => update('salaryGross', v)}
          min={0}
          step={10_000}
          warning={
            salaryAbove12G
              ? t.over12G(formatKr(G_CAP_HIGH * gSnitt))
              : undefined
          }
        />
        <NumberField
          id="wageGrowth"
          label={t.lonnsvekst}
          unit="%"
          value={Math.round(inputs.wageGrowthNominal * 1000) / 10}
          onChange={(v) => update('wageGrowthNominal', v / 100)}
          min={0}
          max={20}
          step={0.1}
          help={srcNote(macro?.wageGrowth) ?? t.lonnsvekstAntagelse}
        />
        <details className="md:col-span-2 rounded-2xl border border-ink/10 p-4 group">
          <summary className="cursor-pointer text-sm font-semibold text-ink/80 select-none">
            {t.harDuSparing}{' '}
            <span className="text-muted font-normal">{t.valgfritt}</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            <NumberField
              id="existingFolketrygdBalance"
              label={t.folketrygdBeholdning}
              unit={t.enhetKr}
              value={inputs.existingFolketrygdBalance}
              onChange={(v) => update('existingFolketrygdBalance', v)}
              min={0}
              step={10_000}
              help={t.folketrygdBeholdningHjelp}
            />
            <NumberField
              id="existingOtpBalance"
              label={t.otpSaldo}
              unit={t.enhetKr}
              value={inputs.existingOtpBalance}
              onChange={(v) => update('existingOtpBalance', v)}
              min={0}
              step={10_000}
              help={t.otpSaldoHjelp}
            />
            <NumberField
              id="existingIpsBalance"
              label={t.ipsSaldo}
              unit={t.enhetKr}
              value={inputs.existingIpsBalance}
              onChange={(v) => update('existingIpsBalance', v)}
              min={0}
              step={10_000}
            />
            <NumberField
              id="existingAskBalance"
              label={t.askSaldo}
              unit={t.enhetKr}
              value={inputs.existingAskBalance}
              onChange={(v) => update('existingAskBalance', v)}
              min={0}
              step={10_000}
            />
          </div>
        </details>
        <SliderField
          id="otpRateLow"
          label={t.otpLav}
          value={Math.round(inputs.otpRateLow * 1000) / 10}
          onChange={(v) => update('otpRateLow', v / 100)}
          min={2}
          max={7}
          step={0.1}
          formatValue={sliderFormatters.percent}
          help={t.otpLavHjelp(formatKr(cap71G))}
        />
        <NumberField
          id="ipsAnnual"
          label={t.ipsPerAar}
          unit={t.enhetKr}
          value={inputs.ipsAnnualContribution}
          onChange={(v) => update('ipsAnnualContribution', v)}
          min={0}
          step={500}
          help={t.ipsMaks(formatKr(IPS_ANNUAL_MAX))}
          warning={
            ipsOver
              ? t.ipsOver(formatKr(IPS_ANNUAL_MAX))
              : undefined
          }
        />
        <NumberField
          id="askMonthly"
          label={t.annenSparing}
          unit={t.enhetKrMnd}
          value={inputs.askMonthlyContribution}
          onChange={(v) => update('askMonthlyContribution', v)}
          min={0}
          step={500}
        />
      </div>

      <div className="mt-6">
        <ToggleField
          id="includeAfp"
          label={t.afp}
          description={t.afpBeskrivelse}
          value={inputs.includeAfp}
          onChange={(v) => update('includeAfp', v)}
        />
      </div>

      {/* Avansert */}
      <details className="mt-6 border-t border-ink/10 pt-5 group">
        <summary className="cursor-pointer text-sm font-semibold text-accent-ink list-none flex items-center gap-2 select-none">
          <span
            aria-hidden
            className="inline-block transition-transform group-open:rotate-90"
          >
            ›
          </span>
          {t.avansert}
        </summary>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <NumberField
            id="G"
            label={t.gVerdi}
            unit={t.enhetKr}
            value={inputs.G}
            onChange={(v) => update('G', v)}
            min={1}
            step={100}
            help={t.gHjelp(formatKr(inputs.G), G_DEFAULT_AS_OF)}
          />
          <NumberField
            id="inflation"
            label={t.inflasjon}
            unit="%"
            value={Math.round(inputs.inflationNominal * 1000) / 10}
            onChange={(v) => update('inflationNominal', v / 100)}
            min={0}
            max={15}
            step={0.1}
            help={srcNote(macro?.inflation) ?? t.inflasjonAntagelse}
          />
          <NumberField
            id="realReturn"
            label={t.realavkastning}
            unit="%"
            value={Math.round(inputs.realReturn * 1000) / 10}
            onChange={(v) => update('realReturn', v / 100)}
            min={-5}
            max={15}
            step={0.1}
            help={t.realavkastningHjelp}
          />
          <NumberField
            id="payoutRealReturn"
            label={t.utbetalingsavkastning}
            unit="%"
            value={Math.round(inputs.payoutRealReturn * 1000) / 10}
            onChange={(v) => update('payoutRealReturn', v / 100)}
            min={-5}
            max={15}
            step={0.1}
            help={t.utbetalingsavkastningHjelp}
          />
          <NumberField
            id="delingstall"
            label={t.delingstall}
            unit=""
            value={inputs.delingstall}
            onChange={(v) => update('delingstall', v)}
            min={10}
            max={30}
            step={0.1}
            help={t.delingstallHjelp}
          />
          <NumberField
            id="otpPayoutYears"
            label={t.otpUtbetaling}
            unit={t.enhetAar}
            value={inputs.otpPayoutYears}
            onChange={(v) => update('otpPayoutYears', v)}
            min={10}
            max={30}
            step={1}
            help={t.otpUtbetalingHjelp}
          />
          <NumberField
            id="ipsPayoutYears"
            label={t.ipsUtbetaling}
            unit={t.enhetAar}
            value={inputs.ipsPayoutYears}
            onChange={(v) => update('ipsPayoutYears', v)}
            min={10}
            max={30}
            step={1}
          />
          <NumberField
            id="askPayoutYears"
            label={t.askUtbetaling}
            unit={t.enhetAar}
            value={inputs.askPayoutYears}
            onChange={(v) => update('askPayoutYears', v)}
            min={5}
            max={40}
            step={1}
          />
          <SliderField
            id="otpRateHigh"
            label={t.otpHoy}
            value={Math.round(inputs.otpRateHigh * 1000) / 10}
            onChange={(v) => update('otpRateHigh', v / 100)}
            min={0}
            max={18.1}
            step={0.1}
            formatValue={sliderFormatters.percent}
            help={
              salaryAbove71G
                ? t.otpHoyOver(formatKr(Math.max(0, inputs.salaryGross - cap71G)))
                : t.otpHoyUnder(formatKr(cap71G))
            }
          />
          <SliderField
            id="targetReplacementRatio"
            label={t.maaldekning}
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
