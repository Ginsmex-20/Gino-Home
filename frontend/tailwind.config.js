/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#161616', card: '#1e1e1e', hover: '#262626', sidebar: '#111111' },
        primary: { DEFAULT: '#f97316', light: '#fb923c', dark: '#ea580c' },
        border: '#2a2a2a',
      }
    }
  },
  plugins: []
};
