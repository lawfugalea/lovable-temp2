// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'ui-sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji'],
      },
      colors: {
        hf: {
          bg: '#FAF9FB',
          surface: '#FFFFFF',
          text: '#0F172A',
          // accents
          brand: '#FB7185',   // soft coral for CTAs
          brandDark: '#DB5870',
          ink: '#0F172A',
        },
      },
      boxShadow: {
        card: '0 1px 0 rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)',
        soft: '0 1px 1px rgba(16,24,40,.04), 0 4px 12px rgba(16,24,40,.08)',
      },
      borderRadius: {
        xl2: '1.25rem', // a smidge rounder than 2xl
      },
    },
  },
  plugins: [],
};
