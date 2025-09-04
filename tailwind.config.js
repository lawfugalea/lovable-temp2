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
        display: ['Inter', 'system-ui', 'ui-sans-serif'],
      },
      colors: {
        cozy: {
          // Backgrounds
          bg: 'hsl(35, 25%, 97%)',
          surface: 'hsl(35, 15%, 99%)',
          
          // Text
          text: 'hsl(25, 15%, 15%)',
          'text-muted': 'hsl(25, 8%, 45%)',
          'text-soft': 'hsl(25, 5%, 65%)',
          
          // Primary warm coral
          primary: 'hsl(18, 75%, 65%)',
          'primary-soft': 'hsl(18, 85%, 85%)',
          'primary-deep': 'hsl(18, 65%, 45%)',
          
          // Secondary warm tones
          sage: 'hsl(95, 20%, 65%)',
          'sage-soft': 'hsl(95, 25%, 85%)',
          terracotta: 'hsl(15, 60%, 60%)',
          cream: 'hsl(45, 40%, 92%)',
          sand: 'hsl(35, 30%, 85%)',
          
          // Warm grays
          gray: {
            100: 'hsl(25, 8%, 95%)',
            200: 'hsl(25, 6%, 88%)',
            300: 'hsl(25, 5%, 75%)',
            400: 'hsl(25, 4%, 60%)',
          },
        },
      },
      backgroundImage: {
        'cozy-warm': 'linear-gradient(135deg, hsl(35, 40%, 95%) 0%, hsl(25, 35%, 92%) 50%, hsl(18, 30%, 90%) 100%)',
        'cozy-header': 'linear-gradient(90deg, hsl(18, 85%, 90%) 0%, hsl(35, 60%, 88%) 30%, hsl(95, 30%, 88%) 70%, hsl(45, 50%, 90%) 100%)',
      },
      boxShadow: {
        'cozy-sm': '0 2px 8px hsla(25, 15%, 15%, 0.08)',
        'cozy-md': '0 4px 16px hsla(25, 15%, 15%, 0.12)',
        'cozy-lg': '0 8px 32px hsla(25, 15%, 15%, 0.16)',
        'cozy-glow': '0 0 20px hsla(18, 75%, 65%, 0.15)',
      },
      borderRadius: {
        'cozy': '1.25rem',
        'cozy-lg': '1.75rem',
        'cozy-xl': '2rem',
      },
      animation: {
        'cozy-fade-in': 'fade-in 0.4s ease-out',
        'cozy-bounce': 'bounce 0.3s ease-out',
        'cozy-pulse': 'pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
