# evers.no — Design System

Living reference for the visual and interaction identity of evers.no. Attach this file to any prompt that builds a new page or updates an existing sub-page, so the look and feel stays coherent across the site.

---

## Voice

Half-Belgian, half-Norwegian MSc Finance student. Personal portfolio targeting client-facing roles in Wealth Management, Private Banking, and Fund Sales. The site should read as competent but warm — not corporate-fintech, not startup-template.

Three principles underpin the visual identity:

1. **Calm blue authority.** A single functional blue (`#0070ed`) used sparingly on actionable surfaces. Most of the page is near-black text on warm off-white.
2. **Refined motion.** Short durations, one strong easing curve, tactile press feedback. No decoration without purpose.
3. **Personal warmth.** Small persistent details that reward visitors who linger — cursor dot, scroll-hint chevron, grain texture, the medieval easter-egg. Refined ≠ sterile.

---

## Color tokens

Defined as CSS custom properties on `:root` and `[data-theme="dark"]`. Always reference tokens — never hardcode hex except inside theme-specific overrides.

### Light mode (`:root`)

| Token | Value | Used for |
| --- | --- | --- |
| `--bg` | `#fafaf9` | Page background |
| `--text` | `#0a0a0a` | Body text |
| `--muted` | `#737373` | Secondary text, captions |
| `--accent` | `#0070ed` | Primary blue. Links, label-gradient start, CTA gradient start. |
| `--accent2` | `#3b82f6` | Label-gradient end |
| `--accent3` | `#e7e5e4` | Subtle borders, tag backgrounds |
| `--accent4` | `#004eaa` | Deep blue. Banner cards, CTA gradient end. |
| `--card-bg` | `#ffffff` | Card surfaces |
| `--card-shadow` | `0 1px 2px rgba(0,0,0,0.04)` | Default card shadow |

### Dark mode (`[data-theme="dark"]`)

| Token | Value |
| --- | --- |
| `--bg` | `#0a0a0a` |
| `--text` | `#fafaf9` |
| `--muted` | `#a3a3a3` |
| `--accent` | `#5b9eff` |
| `--accent2` | `#3b82f6` |
| `--accent3` | `#262626` |
| `--accent4` | `#7ab0ff` |
| `--card-bg` | `#171717` |
| `--card-shadow` | `0 1px 2px rgba(0,0,0,0.4)` |

### Easing tokens

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
```

### Rules

- Blue is functional: it draws the eye to actions and identity surfaces. Never paint backgrounds blue.
- Two-stop gradients on `.btn-primary` (`135deg, --accent → --accent4`), on `.section-label` text (`90deg, --accent → --accent2`), and on `.cv-banner-read` (`135deg, --accent → --accent4`) are the only allowed gradient patterns.
- `.thesis-banner` uses near-black gradient `linear-gradient(135deg, #001233, #002f6c)` — keep as the academic-banner pattern.
- Tag color variants use hardcoded rgba in the `(0,112,237,…)` / `(105,150,255,…)` / `(0,78,170,…)` / `(170,190,255,…)` families to match `--accent` exactly. Don't introduce new tag colors.

---

## Typography

Loaded from Google Fonts:

```
Inter (400, 500, 600, 700, 800)
JetBrains Mono (400, 500)
MedievalSharp        — medieval theme only
UnifrakturMaguntia   — medieval theme only
Noto Sans JP (400, 700) — Japanese variant only
```

### Usage

| Element | Family | Weight | Notes |
| --- | --- | --- | --- |
| Body text | `Inter, system-ui, -apple-system, sans-serif` | 400 | `line-height: 1.6` |
| Headings (`h1`, `h2`, `.section-title`) | `Inter, system-ui, sans-serif` | 700–800 | `letter-spacing: -0.02em` |
| Small metadata labels (`.cv-lang`, `.thesis-sub`, `.cert-issuer`, `.lb-label`, `.section-label`) | `JetBrains Mono, ui-monospace, monospace` | 400–500 | `font-size: .7–.75rem`, `letter-spacing: 0` |
| Medieval theme headings | `UnifrakturMaguntia, MedievalSharp, cursive` | — | Scoped to `[data-theme="medieval"]` |
| Japanese mode body | `Noto Sans JP, Inter, sans-serif` | — | Scoped to `html[lang="ja"]` |

### Rules

- Inter at `-0.02em` letter-spacing on headings gives the geometric character without the startup-template feel.
- Don't introduce new display fonts. Inter does almost everything.
- JetBrains Mono is for short technical metadata only. Never for body or headings.
- **Two coexisting families (deliberate — not drift).** The editorial core above (Inter/blue, light + dark) is the default. Cream-skinned sub-pages — `personligokonomi/`, `pensjonskalkulator(-src)/`, `fra-null-til-investor{,2,3}/` and `formuessamtalen/` (2026-07-12) — deliberately run a warmer **calculator-cream** family instead: Fraunces (serif headings) + Manrope (sans) on `#FAF6EF`, accent `#FF5436`, text-accent `#B03418`. Each such page carries its own self-hosted `@font-face` (see `fonts/README.md`) and a self-contained cream token set. When building or editing one of these pages, match the cream family — don't force the Inter core onto it, and don't back-port cream tokens into the editorial core.

---

## Motion

### Duration table

| Element | Duration |
| --- | --- |
| Button press feedback (`:active`) | 100–160 ms |
| Hover state changes | 160 ms |
| Tooltips, small popovers | 125–200 ms |
| Card reveal, fade-in | 200–240 ms |
| Modal/drawer (none in use yet) | 200–300 ms |

**Hard rule:** every UI animation runs under 300 ms. If it needs to be longer, question whether it should animate at all.

### Frequency framework

Before adding an animation, ask: how often will a visitor see it?

| Frequency | Treatment |
| --- | --- |
| 100+ times/day (keyboard shortcuts, persistent UI) | No animation |
| 10s of times/day (hover, list nav) | Minimal or none |
| Occasional (modals, page transitions) | Standard motion |
| Rare (onboarding, celebration, easter-eggs) | Delight allowed |

This is why the homepage has no loader, no typewriter, no word-by-word fade, no floating blobs — those are seen on every page load.

### Allowed motion

- Card reveal on scroll: `opacity: 0; transform: translateY(8px)` → visible, 200 ms `var(--ease-out)`.
- Hover lift on cards: `translateY(-6px)` plus deeper shadow, **gated** inside `@media (hover:hover) and (pointer:fine)`.
- `:active` press: `transform: scale(0.97)` on buttons, `scale(0.98)` on cards.
- Scroll-hint chevron bounce: homepage hero only, fades in after load, infinite bounce.
- Cursor dot follow: desktop only, gated to fine-pointer devices.
- Grain texture overlay: static, no motion.
- Theme transitions: ~320 ms `ease` on the body morph.

### Forbidden motion

- Page-load loader screens
- Typewriter effects on copy
- Word-by-word title fade-ins
- Floating parallax decorations (blobs)
- Conic-gradient ring spins, glow pulses
- Scrolling marquee tickers as decoration
- Hover lifts without `(hover:hover)` gating
- Springy/overshoot easing (e.g. `cubic-bezier(.34,1.56,.64,1)`) on routine UI
- `transition: all`
- Animations on keyboard-initiated actions

---

## Components

### Button

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  padding: .8rem 1.6rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: .95rem;
  border: none;
  cursor: pointer;
  transition: transform 160ms var(--ease-out),
              box-shadow 160ms var(--ease-out),
              background-color 160ms ease,
              color 160ms ease;
}
.btn:active { transform: scale(0.97); }

.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent4));
  color: #fff;
}
.btn-secondary {
  background: transparent;
  color: var(--text);
  border: 2px solid rgba(0,18,51,.15);
}

@media (hover:hover) and (pointer:fine) {
  .btn-primary:hover {
    transform: translateY(-3px) scale(1.03);
    box-shadow: 0 10px 30px rgba(0,112,237,.35);
  }
  .btn-secondary:hover {
    border-color: var(--accent2);
    color: var(--accent2);
    transform: translateY(-3px);
  }
}
```

Dark mode: `[data-theme="dark"] .btn-primary { color: #fff; }` is explicit (to override any inherited dark text).

### Card (cv, cert, thesis, about, fact)

- Background: `var(--card-bg)`
- Border-radius: 16–20 px (16 for dense card grids, 20 for hero cards)
- Shadow: `var(--card-shadow)` default; deeper on hover (gated)
- Enter: `opacity: 0; transform: translateY(8px)` → visible, 200 ms `var(--ease-out)`
- `:active`: `transform: scale(0.98)`
- Hover (gated): `translateY(-6px)`, shadow `0 16–20px 40–50px rgba(0,18,51,0.12)`

### Tag (pill chip)

Four color variants. Same shape, different blue family. Don't add new variants.

```css
.tag { padding: .35rem .9rem; border-radius: 50px; font-size: .8rem; font-weight: 600; }
.tag.blue  { background: rgba(0,112,237,.08); border: 1.5px solid rgba(0,112,237,.2);  color: var(--accent); }
.tag.light { background: rgba(105,150,255,.1); border: 1.5px solid rgba(105,150,255,.2); color: var(--accent2); }
.tag.dark  { background: rgba(0,78,170,.08);   border: 1.5px solid rgba(0,78,170,.2);  color: var(--accent4); }
.tag.soft  { background: rgba(170,190,255,.2); border: 1.5px solid rgba(170,190,255,.3); color: #002f6c; }
```

### Section label

```css
.section-label {
  display: inline-block;
  font-size: .75rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  font-weight: 600;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

On the homepage, labels are numbered (`01 · Om meg`, `02 · Erfaring`, …) because the homepage walks the visitor through a sequence. On sub-pages, skip the number unless the page has its own ordered narrative.

### Banner card

Large emoji or icon centered in a colored panel, with a small text block beside it.

- Brand-blue banner (CV-read, "open me" feel): `linear-gradient(135deg, var(--accent), var(--accent4))`
- Academic / research banner: `linear-gradient(135deg, #001233, #002f6c)`

Banner emoji is `font-size: 2.5–4rem`, centered with flex. The text block uses small uppercase JetBrains Mono label + Inter heading + Inter body.

### Nav

Fixed top bar. Logo "V." in Inter weight 800 in `var(--accent)`. Right side: link list (Inter weight 500, `.9rem`), then theme toggle (sun/moon), then language switcher button.

Background appears on scroll via `nav.scrolled` rule: `rgba(225,231,255,.72)` with `backdrop-filter: blur(24px) saturate(1.4)`. Sub-pages inherit the same nav verbatim.

---

## Decorative layer

### Site-wide (every page, including sub-pages)

- Warm off-white background, near-black text, blue accents.
- Grain texture overlay (`body::after` with `feTurbulence` SVG, opacity .028 light / .04 dark).
- Custom cursor dot (`#cursorDot`, mix-blend-mode difference, gated to fine-pointer).
- Live finance ticker bar at very top (S&P, OSEBX, EUR/NOK, vinnere/tapere). Optional on sub-pages — drop if it competes for attention.
- Nav (logo, links, theme toggle, language switcher).

### Homepage only

- Hero with profile photo (160 × 160 circle, `box-shadow: 0 1px 3px rgba(0,0,0,.08)` only — no glow, no conic ring).
- Scroll-hint chevron beneath hero.
- Numbered section labels (`01 · `, `02 · `, …).
- Section order: Om meg → Erfaring → Anbefaling → CV → Sertifiseringer → Forskning → Prosjekter → Personlig → Kontakt.

### Sub-page baseline

A typical sub-page keeps: tokens, fonts, motion, button/card/tag/label/banner components, nav, grain, cursor dot.

A typical sub-page drops: hero with profile, scroll-hint, numbered section labels.

---

## Theme variants

Toggled via `data-theme` attribute on `<html>` or `<body>`.

| Theme | Trigger | Notes |
| --- | --- | --- |
| Light | default | Off-white bg, dark text |
| Dark | `data-theme="dark"`, via theme toggle | Near-black bg, off-white text, lighter blue accents |
| Medieval | `data-theme="medieval"`, easter-egg (type "prins") | Brown palette, Fraktur fonts, sword cursor, mjød pour animation. Has its own internal taste system — do not retrofit Emil's rules to it. |
| Japanese | `html[lang="ja"]`, via language switcher | Noto Sans JP fallback font, otherwise same palette |

When adding a new theme, define the full color token set under `[data-theme="newtheme"]`. Match the structure of existing variants. Don't introduce new tokens beyond what's in `:root`.

---

## Accessibility

- `@media (prefers-reduced-motion: reduce)` collapses entrance transforms to `opacity: 1; transform: none`, and removes constant-motion animations. The site already does this; extend the selector list when you add new animated elements.
- All hover transforms must be gated behind `@media (hover:hover) and (pointer:fine)` to prevent sticky states on touch devices.
- Color contrast: light-mode primary button is white on `#0070ed` = excellent (WCAG AAA). Dark-mode primary button is white on `#5b9eff` = ~3:1 (borderline AA-large). Acceptable for large CTAs; watch this on smaller text.

---

## Checklist for building a new page or sub-page

When you (or Claude Code) extend the site, work through this in order:

1. **Read this file.** Treat it as the source of truth.
2. **Inherit the nav and the live ticker bar** from `index.html`. Copy verbatim, including the language switcher and theme toggle wiring.
3. **Use the tokens.** Reference `var(--accent)`, never hardcode hex except in dark-mode-specific or medieval-theme overrides.
4. **Use Inter + JetBrains Mono.** Don't introduce a new heading font.
5. **Buttons get `:active` press states.** No exceptions.
6. **Hover transforms get `@media (hover:hover)` gating.** No exceptions.
7. **Transitions stay under 300 ms** and reference `var(--ease-out)` or `var(--ease-in-out)` tokens.
8. **No decorative motion** unless it serves a purpose (frequency framework). When in doubt, leave it out.
9. **No new gradients** unless they match the existing two-stop patterns.
10. **Verify the medieval theme still renders.** If your new page has interactive elements, ensure they look right under `data-theme="medieval"` too.
11. **Grain and cursor dot stay site-wide.** Include them.
12. **Extend `prefers-reduced-motion`.** Add new animated classes to the existing media query.

---

## How to use this file in prompts

When asking Claude Code to build or update a page, paste or attach this file with a line like:

> Read `DESIGN.md` at the project root. Apply the tokens, typography, motion, and component patterns when updating `cv.html` (or `prosjekter/index.html`, or wherever). Follow the sub-page checklist at the bottom.

That single instruction should be enough for the agent to stay coherent with the rest of the site.

---

## Changelog

- **2026-05-23** — Initial design system documented after the refined-minimal pass (replaced Outfit + Syne with Inter + JetBrains Mono, introduced easing tokens, tightened durations under 300 ms, added `:active` press states, gated hover transforms, removed decoration-without-purpose).
- **2026-05-26** — Sub-pages aligned. `cv.html` og `prosjekter/index.html` brakt i samsvar med designsystemet etter forsiden-redesignet: Outfit+Syne erstattet med Inter+JetBrains Mono, gamle lyseblå tokens (`--bg:#e1e7ff`) erstattet med varm off-white (`--bg:#fafaf9`), nav byttet til fixed med scrolled-state, cursor dot og medieval theme lagt til, springy easing og floating blobs fjernet fra `/prosjekter`. Ticker droppet på begge sub-pages — DESIGN.md-prinsippet om at den er valgfri og bør droppes hvis den konkurrerer om oppmerksomheten, gjelder begge. Cursor-dot, grain og medieval-tema arvet site-wide.
