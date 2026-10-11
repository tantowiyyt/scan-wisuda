/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        // Plus Jakarta Sans dipasang lokal (@fontsource) agar tetap tampil saat offline
        sans: ['"Plus Jakarta Sans Variable"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Navy logo Politeknik Negeri Indramayu (#010080 = brand-900)
        brand: {
          50: '#eef0fb',
          100: '#dde1f7',
          200: '#bcc3ef',
          300: '#8f99e2',
          400: '#5d69cf',
          500: '#3541b8',
          600: '#1d28a0',
          700: '#10198f',
          800: '#070f85',
          900: '#010080',
          950: '#000052',
        },
        // Emas dari kuning logo (#FEF400), dibuat lebih hangat agar nyaman di layar
        gold: {
          50: '#fffce6',
          100: '#fff7bf',
          200: '#ffee80',
          300: '#fde447',
          400: '#fad61c',
          500: '#e8be0b',
          600: '#c99a06',
          700: '#a07209',
          800: '#84590f',
          900: '#704912',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(1, 0, 128, 0.04), 0 4px 16px -4px rgba(1, 0, 128, 0.08)',
      },
    }
  },
  plugins: []
}
