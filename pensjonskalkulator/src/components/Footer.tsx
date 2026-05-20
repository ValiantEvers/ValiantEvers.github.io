export function Footer() {
  return (
    <footer className="mt-12 sm:mt-16 pb-12 sm:pb-16 max-w-3xl mx-auto px-1">
      <div className="border-t border-ink/10 pt-8">
        <p className="text-xs text-muted leading-relaxed">
          Forenklet estimat for illustrasjonsformål. Bruker faste antakelser om avkastning,
          inflasjon, delingstall og folketrygdregler — faktisk pensjon kan avvike vesentlig.
          Tall vises brutto, før skatt; ulike pensjonskilder (folketrygd, IPS,
          tjenestepensjon, ASK) beskattes ulikt ved uttak. Uføretrygd og offentlig sektor
          AFP er ikke modellert. Privat AFP er sterkt forenklet. Ikke finansiell rådgivning.
        </p>
        <p className="text-xs text-muted/70 mt-5">
          <a
            href="/"
            className="underline underline-offset-4 hover:text-ink transition-colors"
          >
            ← Tilbake til evers.no
          </a>
        </p>
      </div>
    </footer>
  )
}
