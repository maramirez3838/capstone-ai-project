import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // Token-mapped neutrals (slate-based)
        neutral: {
          50:  'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
        },
        // Accent — interactive elements only
        accent: {
          50:  'var(--accent-50)',
          500: 'var(--accent-500)',
          700: 'var(--accent-700)',
          900: 'var(--accent-900)',
        },
        // Status — STR legality only; maps to bg-/text-/border- utilities
        'status-allowed': {
          bg:     'var(--status-allowed-bg)',
          border: 'var(--status-allowed-border)',
          text:   'var(--status-allowed-text)',
          icon:   'var(--status-allowed-icon)',
        },
        'status-conditional': {
          bg:     'var(--status-conditional-bg)',
          border: 'var(--status-conditional-border)',
          text:   'var(--status-conditional-text)',
          icon:   'var(--status-conditional-icon)',
        },
        'status-not-allowed': {
          bg:     'var(--status-not-allowed-bg)',
          border: 'var(--status-not-allowed-border)',
          text:   'var(--status-not-allowed-text)',
          icon:   'var(--status-not-allowed-icon)',
        },
        // Freshness — data age only; used only for the indicator dot
        'freshness-fresh':       { dot: 'var(--freshness-fresh-dot)' },
        'freshness-review-due':  { dot: 'var(--freshness-review-due-dot)' },
        'freshness-needs-review': { dot: 'var(--freshness-needs-review-dot)' },
      },
    },
  },
  plugins: [],
}

export default config
