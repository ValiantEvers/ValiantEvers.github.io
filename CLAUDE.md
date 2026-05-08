# evers.no

## What this is
Single-file vanilla HTML personal website for Valiant Evers. Deployed via GitHub Pages, custom domain `evers.no`. No build step, no frameworks, no bundler.

## Structure
- `index.html` — main page with everything (CSS in `<style>`, JS at bottom)
- `profile.jpg`, `og-image.png`, `favicon.svg` — assets in root
- `CNAME` — points to evers.no (do not delete or modify)
- `portfolio/index.html` — dark luxury editorial portfolio for recruiters
- `cv/index.html` — CV page
- `osebx/` — separate sub-app (mirrored from osebx repo)
- `personligokonomi/` — separate sub-app (built from personligokonomi repo)
- `fra-null-til-investor/`, `fra-null-til-investor2/`, `fra-null-til-investor3/` — FNTI iterations
- `examprep/` — mock exam tool with question models + timeline data (JSX-based, no build step — loaded via CDN?)
- `garmin/` — ? Garmin fitness/activity data page
- `jobs/` — ? job search or applications tracker
- `travel/` — compressed travel photos used in Leaflet map
- `.github/workflows/` — Strava + Letterboxd integrations

## Conventions
- ALL CSS, JS, HTML stays in single file per page (no extracted .css/.js — this is intentional, not a bug)
- Custom-property-driven theming (CSS vars at `:root`)
- 6-language support: nb-NO, en, fr, de, es, nl. Strings driven by `data-i` attributes + JS dictionary
- Email is JS-rendered from character codes after page load. The HTML source must contain only an empty `<a>` element with an empty `<span>` inside — no plain mailto: href and no visible email text. This pattern bypasses Cloudflare email obfuscation entirely. Apply to every page that exposes the email.

## Easter eggs (DO NOT BREAK)
- Type "prins" anywhere → Prins Valiant medieval mode (CSS theme switch + APNG transitions)
- Triple-click profile photo → same medieval mode
- Type "run", "waffle", "thesis", "viking", "mjød" → respective effects
- These are personality features, not bugs. If a refactor risks breaking them, ASK before proceeding.

## Live integrations
- Strava + Letterboxd via GitHub Actions (separate workflow files)
- Live finance bar: S&P 500 (Yahoo `^GSPC`), OSEBX (`OSEBX.OL` — NOT `^OSEAX`), EUR/NOK
- Leaflet travel map with markers from compressed `/travel/` images

## Deploy
- Push to main → auto-deployed by GitHub Pages
- Manual: `git push` (no build step)
- Pre-flight: review diff, verify Easter eggs, check all 6 language variants if i18n was touched

## Hands off
- Do not extract CSS/JS to separate files
- Do not introduce a build step / bundler / framework
- Do not change Easter eggs without explicit ask
- Do not modify `CNAME`, `og-image.png`, `favicon.svg` without ask
