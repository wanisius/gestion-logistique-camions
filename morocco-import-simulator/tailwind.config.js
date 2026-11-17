/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      colors: {
        ink: { 900: '#0b1220', 800: '#111a2e', 700: '#18233d', 600: '#22304f', 500: '#33456b' },
        sea: { 500: '#1f7ab8', 400: '#3b9ad6', 300: '#7cc0ea' },
        sand: { 400: '#e9c46a', 500: '#d9a23a' },
        brick: { 500: '#c1440e' },
      },
    },
  },
  plugins: [],
};
