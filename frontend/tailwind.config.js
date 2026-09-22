/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vyoma: {
          dark: '#070B12',
          panel: '#101722',
          panelLight: '#151D2A',
          primary: '#06b6d4', // cyan-500
          success: '#22c55e', // green-500
          warning: '#f59e0b', // amber-500
          critical: '#ef4444', // red-500
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
