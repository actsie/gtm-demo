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
        primary: {
          50: '#f5f3f7',
          100: '#ebe7f0',
          200: '#d7cfe1',
          300: '#bfb1cf',
          400: '#9d88b8',
          500: '#7866CC',
          600: '#5E50A0',
          700: '#4a3d7f',
          800: '#3a2f64',
          900: '#2d2450',
        }
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(to right, #fdf6ef, #fcf3fa, #f9f1fc, #f4eefc)',
      }
    },
  },
  plugins: [],
}
