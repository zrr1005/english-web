/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        paper: {
          50: '#fefdfb',
          100: '#faf8f5',
          200: '#f3efe8',
          300: '#e8e3db',
          400: '#d5cfc5',
        },
        ink: {
          50: '#f0f0f4',
          100: '#d9d9e2',
          200: '#b0b0c0',
          300: '#78788a',
          400: '#4e4e5e',
          500: '#2d2d3f',
          600: '#1e1e2e',
          700: '#161625',
          800: '#0f0f1c',
          900: '#0a0a14',
        },
        amber: {
          50: '#fdf8f0',
          100: '#f9edda',
          200: '#f2d9ab',
          300: '#e8bf6e',
          400: '#d99e38',
          500: '#c8842c',
          600: '#a86822',
          700: '#8a5020',
        },
        sage: {
          400: '#7aad7a',
          500: '#5a8f5a',
          600: '#4a7a4a',
        },
        rust: {
          400: '#d4756a',
          500: '#c4554d',
          600: '#a3443d',
        },
      },
    },
  },
  plugins: [],
}
