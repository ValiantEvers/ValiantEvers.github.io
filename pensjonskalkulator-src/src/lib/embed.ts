// Innbygging på andre nettsteder: ?embed=1 gir en slank utgave for <iframe>.
//
// - Toppen (ingress) og tilbakelenken skjules; ansvarsteksten står alltid.
// - En lenke til fullversjonen på evers.no vises øverst (det er «lenken tilbake»).
// - Høyden meldes til forelder-siden med postMessage, så iframen kan vokse med innholdet.
//   Meldingen inneholder bare et tall; mottakeren skal sjekke e.origin (se kodesnutten
//   i Footer). Vi kjenner ikke mottakerens origin, derfor targetOrigin '*'.

export const HOYDE_MELDING = 'evers-pensjonskalkulator-hoyde'
export const FULL_URL = 'https://www.evers.no/pensjonskalkulator/'

export function erInnebygd(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('embed') === '1'
}

/** Starter høydemeldinger til forelder-vinduet. Returnerer en funksjon som stopper dem. */
export function meldHoyde(): () => void {
  if (typeof window === 'undefined' || window.parent === window) return () => {}
  let sist = 0
  const send = () => {
    const h = Math.ceil(document.documentElement.scrollHeight)
    if (h === sist) return
    sist = h
    window.parent.postMessage({ type: HOYDE_MELDING, hoyde: h }, '*')
  }
  const ro = new ResizeObserver(send)
  ro.observe(document.body)
  send()
  return () => ro.disconnect()
}

/** Kodesnutten en annen side limer inn. `lang` = 'en' gir engelsk utgave. */
export function kodesnutt(lang: 'no' | 'en'): string {
  const src = FULL_URL + '?embed=1' + (lang === 'en' ? '&lang=en' : '')
  const tittel = lang === 'en' ? 'Pension calculator from evers.no' : 'Pensjonskalkulator fra evers.no'
  return [
    `<iframe src="${src}" title="${tittel}" loading="lazy" style="width:100%;height:1600px;border:0"></iframe>`,
    `<p><a href="${FULL_URL}${lang === 'en' ? '?lang=en' : ''}">${tittel}</a></p>`,
    `<script>`,
    `addEventListener('message', function (e) {`,
    `  if (e.origin !== 'https://www.evers.no' || !e.data || e.data.type !== '${HOYDE_MELDING}') return;`,
    `  document.querySelectorAll('iframe[src^="${FULL_URL}"]').forEach(function (f) {`,
    `    if (f.contentWindow === e.source) f.style.height = e.data.hoyde + 'px';`,
    `  });`,
    `});`,
    `</script>`,
  ].join('\n')
}
