# Inspirasjons-research 2: 11 designsider → evers.no

> Intern research, ikke lenket fra siten. Utarbeidet 2026-08-13 på bestilling fra
> Valiant: «sjekk ut disse nettsidene for å se om det er noe vi kan bruke».
> Alle 11 besøkt (web-fetch + nettleser der innholdet var klientrendret).
> Vurdert mot DESIGN.md: buildfri hovedside, frekvensrammeverket (ingen
> dekorativ motion), selvhostet alt, én funksjonell blåfarge, FT-redaksjonell stil.
> Søsterdokument: `inspirasjon-research.md` (2026-06-04, GitHub-stjerner).

## Dommen i én tabell

| Side | Hva det er | Verdi for evers.no | Dom |
|---|---|---|---|
| designspells.com | Kuratert galleri av «design details that feel like magic» (easter eggs, 404-er, mikrodetaljer) | Filosofisk treff: dette ER sitens «Personal warmth»-prinsipp. To konkrete hull funnet | **Bruk** |
| undraw.co | Åpne SVG-illustrasjoner, rekolorerbare on-the-fly, ingen attribusjon | Passer cream-guidene (FNTI 1–3), ikke den redaksjonelle kjernen | **Bruk (avgrenset)** |
| animos.app | 25 motion-maler: slipp inn skjermbilder, eksporter MP4/WebM i nettleseren | Ikke til siten, men til LinkedIn-innhold i jobbsøket | **Bruk (utenfor siten)** |
| godly.design | Håndplukket inspirasjonsfeed: sites, sections, logoer, OG-bilder | Referansebibliotek, særlig OG Images + Sections | Sveip ved behov |
| uiverse.io | 7 411 MIT-lisensierte CSS/Tailwind-elementer | Estetikken (glass/neon/gradients) kolliderer med tokens; idébank, aldri copy-paste | Lav |
| shapes.gallery | 70+ SVG-former, klikk-for-å-kopiere, zip-nedlasting | Mulig krydder i og-bilder; ingenting hovedsidene mangler | Lav |
| ui.live | Design-delingsfeed fra UI8 («design drops», leaderboard) | Overlapper godly; velg én feed | Nei |
| figcomponents.com | Kuraterte Figma-komponenter (Landingfolio-økosystemet) | Du designer i kode, ikke Figma; mye promo | Nei |
| shadergradient.co | Animerte WebGL-gradienter for Framer/Figma/React | Forbudt dekorasjon per DESIGN.md (bevegelig bakgrunn, tung, tredjepart) | Nei |
| jitter.video | Kollaborativt motion-designverktøy (AI, Lottie/4K-eksport) | Motion på siten strider mot frekvensrammeverket; ev. produksjonsverktøy for sosiale medier senere | Nei (for siten) |
| 10x.app | Prompt-til-native-app-produkt; landingssiden er kun et promptfelt | Studie i reduksjon, men gir ikke noe siten mangler | Nei |

## Verdt å gjøre (prioritert, alle i DESIGN.md-ånden)

1. **To nye «spells» (designspells-inspirert), begge bittesmå:**
   - ✅ **Dynamisk `theme-color`. Gjort 2026-08-13 (`1704b49`):**
     MutationObserver på `data-theme` speiler bakgrunnen inn i
     `meta[name=theme-color]` på forside, CV og prosjekter – lys beholder
     `#004eaa`, dark `#0a0a0a`, medieval `#2a1a0e`. Frekvens: passiv,
     ingen animasjon.
   - ✅ **Dark-mode-aware favicon – viste seg allerede gjort.** Oppdaget
     ved implementering samme kveld: `favicon.svg` har allerede
     `prefers-color-scheme: dark`-regel innebygd (`.pl`/`.ink`/`.acc`
     bytter til mørk plate + lys e). Rapportens funn var stale; ingen
     endring nødvendig.
   - (Dagens waffle-avsløring er forresten ren designspells-materie:
     Easter Egg-taggen der er full av nettopp slike detaljer. Siten står
     seg godt i det selskapet: konami, prins, mjød, run, thesis, viking,
     jobb, konsollhilsen, kursor-dot, grain.)
2. **undraw-illustrasjoner i cream-guidene:** 2–3 SVG-er rekolorert til
   cream-aksenten `#FF5436`, selvhostet i repoet (passer
   ingen-tredjepartskall-regelen), som seksjonsåpnere i
   `fra-null-til-investor{,2,3}`. IKKE på forsiden/CV: der er ekte
   skjermbilder og emoji det bevisste valget, og undraw-stilen er for
   startup-generisk for den redaksjonelle kjernen.
3. **animos til jobbsøket:** MP4-showcase av Formuessamtalen (og ev.
   Renteriket) for LinkedIn når WM/PB-søknader sendes. Nettleserbasert,
   maler for device-mockups. Kobling: pipeline-innhold, ikke site-kode.
4. **godly.design som referanse ved neste og-image-iterasjon** (egen
   OG Images-seksjon) og Sections-delen ved neste seksjonsbygging.
   10 minutter i måneden, ikke mer.

## Ikke verdt det, med begrunnelse

- **shadergradient:** bevegelige gradientbakgrunner er eksplisitt forbudt
  motion (DESIGN.md: ingen floating/pulserende dekorasjon), krever WebGL
  og tredjepartsressurser. Selv en statisk eksport tilfører ikke noe
  sitens egne to godkjente gradienter ikke allerede gjør.
- **jitter:** proft verktøy, men sitens prosjektkort bruker bevisst
  statiske ekte skjermbilder (jf. juni-researchen: iframe-demoer vurdert
  og forkastet). Lottie-avspilling ville lagt en runtime-avhengighet på
  en buildfri side.
- **figcomponents/ui.live:** ingen kodeverdi; inspirasjonsverdien dekkes
  bedre av godly + designspells.
- **uiverse/shapes:** MIT er fint, men komponentene ser ut som alle
  andres. Sitens verdi er at den IKKE ser ut som en template.

## Metode-note

web_fetch først på alle 11; designspells serverte en gammel interiørblogg
uten JS (feil innhold), 10x/shadergradient/animos var tomme skall. Disse
ble verifisert visuelt i nettleser. Dommene er kalibrert mot DESIGN.md
(frekvensrammeverk, forbudt motion, selvhosting) og juni-researchens
allerede-gjort-liste, så ingenting over duplikerer eksisterende arbeid.
