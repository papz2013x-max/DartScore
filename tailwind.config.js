/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dart: {
          bg: '#0f172a',
          panel: '#1e293b',
          card: '#334155',
          accent: '#f97316',
          accent2: '#eab308',
          success: '#22c55e',
          danger: '#ef4444',
          info: '#3b82f6',
          text: '#f8fafc',
          muted: '#94a3b8',
          border: '#475569',
        }
      },
      fontSize: {
        'score': '8rem',
        'score-sm': '5rem',
        'score-md': '6rem',
      }
    },
  },
  plugins: [],
}
