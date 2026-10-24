/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: {
            DEFAULT: '#0B2545',
            dark: '#07182C',
            light: '#133E68',
            hover: '#091F38',
            muted: '#1E3A8A',
          },
          saffron: {
            DEFAULT: '#D97706',
            light: '#F59E0B',
            dark: '#B45309',
            subtle: '#FEF3C7',
          },
          green: {
            DEFAULT: '#15803D',
            light: '#22C55E',
            subtle: '#DCFCE7',
          },
          slate: {
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
