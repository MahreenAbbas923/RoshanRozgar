/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#082B28',
          900: '#0C3B37',
          800: '#0F4A44',
          700: '#13665D',
          600: '#167A6E',
          500: '#1F9483',
          200: '#BFE1D9',
          100: '#DDEFEA',
          50: '#EEF7F4',
        },
        amber: {
          600: '#D9850B',
          500: '#F29A1F',
          400: '#F6B44A',
          100: '#FDEFD3',
        },
        cream: {
          50: '#FFFBF4',
          100: '#FFF6E8',
          200: '#F7EAD3',
        },
        ink: {
          900: '#10241F',
          700: '#3A4B47',
          500: '#66756F',
          300: '#A9B3AF',
        },
      },
      fontFamily: {
        display: ['Poppins', 'Noto Nastaliq Urdu', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Noto Nastaliq Urdu', 'system-ui', 'sans-serif'],
        urdu: ['Noto Nastaliq Urdu', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,36,31,0.04), 0 4px 16px rgba(16,36,31,0.05)',
        lift: '0 8px 30px rgba(16,36,31,0.12)',
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        bar: {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulseRing: 'pulseRing 1.4s ease-out infinite',
        bar: 'bar 0.9s ease-in-out infinite',
        fadeUp: 'fadeUp 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
