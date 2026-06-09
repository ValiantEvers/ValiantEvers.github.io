// ESLint flat config — validation only for the main site's hand-authored vanilla JS.
// Catches syntax errors, no-undef, no-unused-vars, no-dupe-keys, etc. NEVER reformats,
// NEVER --fix. The site is static single-file HTML; ESLint is dev/CI tooling only.
//
// Scope: hand-authored vanilla-JS pages (inline <script> linted via eslint-plugin-html).
// Excluded: vendored libs, sub-apps with their own build, generated output, and the
// React/JSX pages (fra-null-til-investor*, examprep) — those are not vanilla JS.

import js from "@eslint/js";
import html from "eslint-plugin-html";
import globals from "globals";

// Hand-authored vanilla-JS pages to lint (inline <script> extracted by eslint-plugin-html).
const VANILLA_PAGES = [
  "index.html",
  "cv.html",
  "strategi.html",
  "rekrutterer/index.html",
  "garmin/index.html",
  "leie-eller-eie/index.html",
  "prosjekter/index.html",
  "prosjekter/finansielle-maler/index.html",
  "prosjekter/forretningsenhet-dashboard/index.html",
  "prosjekter/masteroppgave/index.html",
];

export default [
  {
    // Never lint these: vendored libs, generated output, sub-apps with own build,
    // non-code assets, and React/JSX pages (not vanilla JS).
    ignores: [
      "node_modules/**",
      "vendor/**",
      "fonts/**",
      "docs/**",
      "covers/**",
      "scripts/**",
      "travel/**",
      "**/*.min.js",
      // strategi.html: private/noindex internal tracker that INLINES vendored minified
      // DOMPurify and is onclick-handler architecture (31 functions referenced only from
      // HTML attributes the per-<script> linter can't see). Excluded to avoid vendored-code
      // noise + onclick false-positives. (See plan; revisit if it gets refactored.)
      "strategi.html",
      "osebx/**",
      "personligokonomi/**",
      "pensjonskalkulator/**",
      "pensjonskalkulator-src/**",
      "nb-watch/**",
      "nb-watch-src/**",
      "finance-proxy/**",
      "fra-null-til-investor/**",
      "fra-null-til-investor2/**",
      "fra-null-til-investor3/**",
      "examprep/**",
    ],
  },
  {
    files: VANILLA_PAGES,
    plugins: { html },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script", // classic IIFE scripts, not ES modules
      globals: {
        ...globals.browser,
        // Third-party libraries loaded via <script> tags (read-only).
        RoughNotation: "readonly",
        L: "readonly", // Leaflet (travel map)
        twemoji: "readonly",
        Chart: "readonly", // Chart.js (forretningsenhet-dashboard)
        // Site-defined globals declared in one inline <script> and used in another in the
        // same file. eslint-plugin-html lints each <script> separately, so these must be
        // whitelisted to avoid false no-undef / no-unused-vars across blocks.
        T: "writable",
        setLang: "writable",
        toggleMedieval: "writable",
        deactivateMedieval: "writable",
        rideAcrossScreen: "writable",
      },
    },
    rules: {
      // eslint:recommended = error-catching base.
      ...js.configs.recommended.rules,
      // Keep no-unused-vars as an error (catches dead/leftover code) but ignore unused function
      // args and intentional `_`-prefixed names. Never weakened to a warning.
      "no-unused-vars": ["error", { args: "none", varsIgnorePattern: "^_", caughtErrors: "none" }],
      // no-redeclare must not flag a page legitimately defining its own `T`/`setLang` locally
      // just because those are whitelisted as cross-block globals for index.html. Still catches
      // genuine same-scope double-declarations.
      "no-redeclare": ["error", { builtinGlobals: false }],
      // Empty blocks (mostly intentional defensive `catch(e){}`) are a code-smell, not the
      // error-catching this check targets. Off per "stylistic rules off".
      "no-empty": "off",
      // no-useless-assignment only fired on intentional defensive patterns here (easter-egg flag
      // symmetry, defensive `=0` initializers) — a smell, not a bug. Off per "stylistic rules off".
      "no-useless-assignment": "off",
    },
  },
  {
    // index.html contains a <script type="module"> (web-vitals RUM, P-9), so its inline
    // scripts must be parsed as ES modules. Override sourceType for this one file only —
    // the other vanilla pages above stay sourceType:"script".
    files: ["index.html"],
    languageOptions: { sourceType: "module" },
  },
];
