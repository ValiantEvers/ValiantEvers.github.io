// Sanity-test for pension-engine. Kjør med: node src/sanity-test.mjs
//
// Forventet (default inputs, realkroner): månedlig brutto pensjon mellom 24 000 og 34 000 kr.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Transpiler pension-engine.ts (+ lib/tax.ts) med repoets egen installerte
// typescript (devDependency) — hermetisk: ingen npx, ingen nettverk.
// CommonJS-output slik at Node kan følge den extension-løse './lib/tax'-importen.
const require = createRequire(import.meta.url)
const tscJs = require.resolve('typescript/lib/tsc.js')
const tsFile = resolve(__dirname, 'pension-engine.ts')
const outDir = mkdtempSync(join(tmpdir(), 'pensjonskalkulator-sanity-'))

let calculatePension, DEFAULT_INPUTS
try {
  execFileSync(
    process.execPath,
    [tscJs, tsFile, '--outDir', outDir, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'],
    { stdio: 'inherit' },
  )
  ;({ calculatePension, DEFAULT_INPUTS } = require(join(outDir, 'pension-engine.js')))
} finally {
  rmSync(outDir, { recursive: true, force: true })
}

const result = calculatePension(DEFAULT_INPUTS)

const fmt = (x) =>
  new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(x)

console.log('\n=== SANITY-TEST: standardinput ===')
console.log('Inputs:', DEFAULT_INPUTS)
console.log('\nNominell avkastning:', (result.nominalReturn * 100).toFixed(2), '%')
console.log('År til pensjon:', result.yearsToRetirement)

console.log('\nTopp-balanser ved pensjon (nominell):')
console.log('  Folketrygd:', fmt(result.peakBalances.folketrygd), 'kr')
console.log('  Tjenestepensjon:', fmt(result.peakBalances.otp), 'kr')
console.log('  IPS:', fmt(result.peakBalances.ips), 'kr')
console.log('  ASK:', fmt(result.peakBalances.ask), 'kr')

console.log('\nMånedlig pensjon (NOMINELL kr ved 67):')
const n = result.monthlyAtRetirementNominal
console.log('  Folketrygd:', fmt(n.folketrygd), 'kr')
console.log('  Tjenestepensjon:', fmt(n.otp), 'kr')
console.log('  IPS:', fmt(n.ips), 'kr')
console.log('  ASK:', fmt(n.ask), 'kr')
console.log('  AFP:', fmt(n.afp), 'kr')
console.log('  TOTAL:', fmt(n.total), 'kr')

console.log('\nMånedlig pensjon (REAL kr — dagens kr):')
const r = result.monthlyAtRetirementReal
console.log('  Folketrygd:', fmt(r.folketrygd), 'kr')
console.log('  Tjenestepensjon:', fmt(r.otp), 'kr')
console.log('  IPS:', fmt(r.ips), 'kr')
console.log('  ASK:', fmt(r.ask), 'kr')
console.log('  AFP:', fmt(r.afp), 'kr')
console.log('  TOTAL:', fmt(r.total), 'kr')

console.log('\nDekningsgrad:', (result.replacementRatio * 100).toFixed(1), '%')
console.log('Sluttlønn real (dagens kr):', fmt(result.finalSalaryReal), 'kr')
console.log('Sluttlønn nominell ved pensjon:', fmt(result.finalSalaryNominal), 'kr')

console.log('\nNetto månedlig (real kr):', fmt(r.net))
console.log('Skatt månedlig (real kr):', fmt(r.tax))
console.log('Effektiv skattesats:', (result.effectiveTaxRate * 100).toFixed(1), '%')
console.log('ASK gevinstandel:', (result.askGevinstAndel * 100).toFixed(1), '%')
console.log('Garantipensjon-floor aktiv:', result.folketrygdAtGarantipensjonFloor)

const inRange = r.total >= 24_000 && r.total <= 34_000
console.log('\nFORVENTET BRUTTO INTERVALL: 24 000–34 000 kr (real)')
console.log('OBSERVERT BRUTTO (real):', fmt(r.total), 'kr')
console.log(inRange ? '✓ BRUTTO INNENFOR' : '✗ BRUTTO UTENFOR — DEBUG')

const netInRange = r.net >= 22_000 && r.net <= 30_000
console.log('\nFORVENTET NETTO INTERVALL: 22 000–30 000 kr (real)')
console.log('OBSERVERT NETTO (real):', fmt(r.net), 'kr')
console.log(netInRange ? '✓ NETTO INNENFOR' : '✗ NETTO UTENFOR — DEBUG')

process.exit(inRange && netInRange ? 0 : 1)
