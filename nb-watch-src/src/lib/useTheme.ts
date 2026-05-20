import { useEffect, useState } from 'react'

export type Palette = {
  ink: string
  muted: string
  line: string
  red: string            // KUN styringsrente + KPI-JAE + heading-underline
  blue: string           // sekundær aksent — USD/NOK
  neutralStrong: string  // primær datalinje uten aksent
  neutralMid: string     // sekundær datalinje
  neutralLight: string   // tertiær / bakgrunns-serie (NOWA 3M)
}

const LIGHT: Palette = {
  ink: '#1A1A1A',
  muted: '#5A5A55',
  line: '#E5E2DA',
  red: '#C8102E',
  blue: '#1E40AF',
  neutralStrong: '#374151',
  neutralMid: '#6B7280',
  neutralLight: '#9CA3AF',
}

const DARK: Palette = {
  ink: '#E8E6E0',
  muted: '#9A958A',
  line: '#27261F',
  red: '#FF4D5E',
  blue: '#60A5FA',
  neutralStrong: '#D1D5DB',
  neutralMid: '#9CA3AF',
  neutralLight: '#6B7280',
}

export function useTheme(): { isDark: boolean; palette: Palette } {
  const get = () =>
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches

  const [isDark, setIsDark] = useState<boolean>(get())

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return { isDark, palette: isDark ? DARK : LIGHT }
}
