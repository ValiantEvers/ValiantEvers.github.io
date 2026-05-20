/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Sober, Our-World-in-Data-aktig palett.
        paper: '#FAFAF7',
        ink: '#1A1A1A',
        muted: '#5A5A55',
        line: '#E5E2DA',
        // Norges Bank-rød (sparsomt brukt).
        nbred: '#C8102E',
        // Dark mode.
        'paper-dark': '#0F0F0E',
        'ink-dark': '#E8E6E0',
        'muted-dark': '#9A958A',
        'line-dark': '#27261F',
      },
      fontFamily: {
        // Systemfonter — ingen Google Fonts.
        serif: ['ui-serif', 'Charter', 'Cambria', 'Georgia', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      maxWidth: {
        prose: '768px',
        chart: '1100px',
      },
    },
  },
  plugins: [],
}
