/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAF6EF',
        ink: '#1A1A1A',
        accent: '#FF5436',
        ghost: '#2D5BFF',
        sand: '#E8E0D0',
        sun: '#FFD93D',
        muted: '#7A7268',
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        hero: ['clamp(3rem, 12vw, 7rem)', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
        bignum: ['clamp(2.5rem, 9vw, 5rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
      },
      boxShadow: {
        card: '0 1px 0 rgba(26,26,26,.04), 0 12px 40px -16px rgba(26,26,26,.18)',
        pop: '0 18px 60px -20px rgba(255,84,54,.45)',
      },
    },
  },
  plugins: [],
}
