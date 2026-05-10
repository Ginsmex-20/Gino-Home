/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          card:    '#161618',
          hover:   '#1d1d20',
          sidebar: '#0e0e10',
          deep:    '#070708',
        },
        primary: {
          DEFAULT: '#f97316',
          light:   '#fb923c',
          dark:    '#ea580c',
          glow:    'rgba(249,115,22,0.35)',
        },
        border: '#222226',
        glass:  'rgba(255,255,255,0.04)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-orange': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        'gradient-text-brand':
          'linear-gradient(135deg, #fff 0%, #fb923c 60%, #f97316 100%)',
      },
      boxShadow: {
        'glow-orange': '0 8px 32px -8px rgba(249,115,22,0.45)',
        'glass':       '0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      keyframes: {
        blob: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%':     { transform: 'translate(40px,-50px) scale(1.1)' },
          '66%':     { transform: 'translate(-30px,30px) scale(0.95)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        blob:  'blob 14s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
