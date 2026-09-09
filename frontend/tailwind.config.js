/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
