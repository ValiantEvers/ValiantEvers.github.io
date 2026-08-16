# docs/ — innhold og status

`docs/` er i praksis en **vedleggsmappe, ikke en dokumentasjonsmappe**: åtte av ti filer er
PDF-er som lenkes fra `index.html`, `cv.html` og `prosjekter/masteroppgave/`. Mappa er derfor
ikke et sted å legge intern dokumentasjon — den er en del av det som serveres.

**Ingen av PDF-ene kan flyttes eller omdøpes uten å oppdatere lenkene.** Flere av dem er
referert fra i18n-ordbøkene i `cv.html` (`downloadCVHref`), som er lett å overse: en flytting
som «bare» retter `<a href>` etterlater fire døde ordbok-oppføringer.

## Vedlegg (lenket fra produksjon)

| Fil | Lenket fra |
|---|---|
| `Valiant Evers - CV (Norsk).pdf` | `cv.html` — knapp + `downloadCVHref` (no) |
| `Valiant Evers - CV (English).pdf` | `cv.html` — `downloadCVHref` i en/fr/de/ja (fire steder) |
| `Master Thesis.pdf` | `index.html`, `cv.html`, `prosjekter/masteroppgave/index.html` (sistnevnte med `../../`) |
| `BMC_certificate_of_completion.pdf` | `index.html`, `cv.html` |
| `Bloomberg_BFF_Certificate.pdf` | `cv.html` — **eneste referanse i hele repoet** |
| `ESG_certificate_of_completion.pdf` | `index.html`, `cv.html` |
| `Transcript from Aarhus Summer School.pdf` | `index.html`, `cv.html` |
| `Attest (Fratredelse).pdf` | `index.html` — `href` finnes, men lenken er bevisst nøytralisert med `pointer-events:none` |

## Research-notater (ikke lenket fra noen side)

| Fil | Status |
|---|---|
| `inspirasjon-designsider-2026-08-13.md` | **Aktiv.** Elleve designsider gjennomgått; punktlista har fortsatt åpne poster. |
| `inspirasjon-research.md` | **Stale, men ikke ferdig.** Backloggen fra juni er i hovedsak lukket, men Astro-island-vurderingen for pensjonskalkulatoren står eksplisitt som «ikke avskrevet». Refereres også fra prosjektnotatene. |

Begge er markdown uten front matter og blir derfor servert som rå filer, ikke bygget om.
De er «ikke lenket fra siten», men de er **ikke private** — repoet er offentlig.

## Arkivering

`docs/arkiv/` er bevisst ikke opprettet. Ingen av filene her kvalifiserer: PDF-ene er levende
vedlegg, og de to notatene har begge åpne punkter. Datert rapport på repo-rot
(`HEALTHCHECK-2026-05-28.md`) er heller ikke flyttet — den er en bevisst publisert
health-baseline med egen live-URL.

*Sist gjennomgått: 2026-08-16.*
