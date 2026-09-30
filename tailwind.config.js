/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#132A3A',
          light: '#1F3E52',
        },
        clinical: {
          DEFAULT: '#3B6E8F',
          50: '#EEF4F7',
          100: '#D8E6EC',
          400: '#5E8CA8',
          500: '#3B6E8F',
          600: '#2E5876',
        },
        mint: {
          DEFAULT: '#4F9D82',
          50: '#EBF6F1',
          500: '#4F9D82',
          600: '#3E7F69',
        },
        signal: {
          DEFAULT: '#C1483D',
          50: '#FBEBE9',
          500: '#C1483D',
          600: '#A23A31',
        },
        paper: '#F7F8F6',
        line: '#E1E4E1',
      },
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(19, 42, 58, 0.06), 0 1px 0 rgba(19, 42, 58, 0.04)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
