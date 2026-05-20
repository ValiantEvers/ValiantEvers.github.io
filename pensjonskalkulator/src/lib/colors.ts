// Farger for de fire pensjonskildene + AFP. Tunet for kontrast mot cream-bg.

export const SOURCE_COLORS = {
  folketrygd: '#1A1A1A', // ink
  otp: '#FF5436', // accent (coral)
  ips: '#2D5BFF', // ghost (blue)
  ask: '#FFD93D', // sun (yellow)
  afp: '#7A7268', // muted
} as const

export const SOURCE_LABELS = {
  folketrygd: 'Folketrygd',
  otp: 'Tjenestepensjon',
  ips: 'IPS',
  ask: 'Annen sparing (ASK)',
  afp: 'AFP',
} as const

export type SourceKey = keyof typeof SOURCE_COLORS
