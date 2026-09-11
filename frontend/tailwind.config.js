/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        refinery: {
          950: '#0a0b0e',
          900: '#111215',
          850: '#16181d',
          800: '#1c1e24',
          700: '#282c35',
          red: '#c5161d',
          'red-hover': '#a51016',
          'red-dark': '#880d12',
          'red-light': '#f87171',
        },
        oil: {
          950: '#061325',
          900: '#0B2545',
          800: '#134074',
          700: '#1D4E89',
          600: '#2E6F95',
          500: '#4091A5',
          100: '#EEF4F8',
          50: '#F7FAFC',
        },
        brand: {
          red: '#c5161d',
          redDark: '#991b1b',
          green: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
