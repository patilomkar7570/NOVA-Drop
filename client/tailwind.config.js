/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nova: {
          bg: '#0B0D13',
          card: '#12151F',
          cardHover: '#171B28',
          border: '#23283B',
          borderLight: '#303750',
          accent: '#7C3AED',
          accentHover: '#6D28D9',
          accentLight: '#8B5CF6',
          accentGlow: 'rgba(124, 58, 237, 0.25)',
          text: '#F3F4F6',
          muted: '#9CA3AF',
          darkMuted: '#6B7280',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      },
      boxShadow: {
        'glow-violet': '0 0 25px -5px rgba(124, 58, 237, 0.3)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}
