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
        brand: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        dark: {
          950: '#070a13',
          900: '#0b0f19',
          800: '#111827',
          700: '#1f2937',
          600: '#374151'
        }
      }
    },
  },
  plugins: [],
}
