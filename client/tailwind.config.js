/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4fa',
          100: '#dbe5f3',
          200: '#b7cae7',
          300: '#8fadd9',
          400: '#5c87c4',
          500: '#3a65a8',
          600: '#2a4f8a',
          700: '#213f6f',
          800: '#1a2f53',
          900: '#101d35',
          950: '#0a1324',
        },
        brand: {
          50: '#eef1fd',
          100: '#dde2fb',
          200: '#b9c4f6',
          300: '#94a5f1',
          400: '#6f87ec',
          500: '#4c64dc',
          600: '#3c4fb5',
          700: '#2f3e8e',
          800: '#242f6b',
          900: '#1a2250',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 23 41 / 0.04), 0 1px 3px 1px rgb(16 23 41 / 0.06)',
      },
    },
  },
  plugins: [],
};
