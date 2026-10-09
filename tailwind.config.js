/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        vazir: ['Vazirmatn', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Vazirmatn', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        rahgozar: {
          bg: '#080b12',
          surface: '#0f1422',
          card: '#141c30',
          hover: '#1b2640',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-highlight': 'rgba(255, 255, 255, 0.16)',
          accent: '#38bdf8',
          'accent-glow': 'rgba(56, 189, 248, 0.25)',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          muted: '#94a3b8',
        }
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      transitionTimingFunction: {
        'fluid': 'cubic-bezier(0.32, 0.72, 0, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      boxShadow: {
        'inner-bezel': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
        'glow-cyan': '0 0 35px -5px rgba(56, 189, 248, 0.3)',
        'glow-emerald': '0 0 35px -5px rgba(16, 185, 129, 0.3)',
        'glow-rose': '0 0 35px -5px rgba(239, 68, 68, 0.3)',
      },
      keyframes: {
        pulseSlow: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.8, transform: 'scale(1.03)' },
        },
        wave: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      },
      animation: {
        'pulse-slow': 'pulseSlow 3s ease-in-out infinite',
        'wave-flow': 'wave 15s linear infinite',
      }
    },
  },
  plugins: [],
}
