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
        // Morning Light & Golden Apricot Theme
        apricot: {
          50: '#fffbf5',
          100: '#fef3e2',
          200: '#fce5c3',
          300: '#fad19a',
          400: '#f6b262',
          500: '#f19331',  // Golden Apricot Core
          600: '#e2771d',
          700: '#bb5b16',
          800: '#954919',
          900: '#793e18',
          950: '#421d0a',
        },
        morning: {
          50: '#fcfbf8',   // Morning cream base
          100: '#f8f4ec',  // Warm dawn tint
          200: '#f3ebd9',  // Sunlit paper
          300: '#ebdcc0',  // Golden sand
          400: '#dfc79e',
          500: '#cbb07e',
          600: '#b49563',
          700: '#92764b',
          800: '#765e3e',
          900: '#614d34',
          950: '#231b10',  // Deep warm coffee
        },
        brand: {
          50: '#fffbf5',
          100: '#fef3e2',
          200: '#fce5c3',
          300: '#fad19a',
          400: '#f6b262',
          500: '#f19331',
          600: '#e2771d',
          700: '#bb5b16',
          800: '#954919',
          900: '#793e18',
          950: '#421d0a',
        },
        warm: {
          amber: {
            50: '#fffbf5',
            100: '#fef3e2',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f',
          },
          teal: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
