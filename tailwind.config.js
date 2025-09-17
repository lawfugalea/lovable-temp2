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
        // Google Keep-style colors
        'keep': {
          'yellow': '#FFFDE7',
          'sage': '#F1F8E9',
          'coral': '#FFF8E1',
          'terracotta': '#FBE9E7',
          'cream': '#FFF3E0',
          'sand': '#ECEFF1',
          'warm-gray': '#FAFAFA',
          'soft-blue': '#E3F2FD',
          'lavender': '#EDE7F6',
          'pink': '#F3E5F5',
          'emerald': '#E0F7FA',
          'indigo': '#F9FBE7',
        },
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
        'cozy-wiggle': 'wiggle 0.5s ease-in-out',
        'cozy-bounce-in': 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'cozy-shake': 'shake 0.5s ease-in-out',
        'cozy-glow': 'glow 2s ease-in-out infinite alternate',
        'cozy-float': 'float 3s ease-in-out infinite',
        'cozy-loading-dance': 'loadingDance 1.5s ease-in-out infinite',
        'cozy-confetti': 'confetti 1s ease-out forwards',
        'cozy-slide-up': 'slideUp 0.6s ease-out',
        'cozy-slide-in-left': 'slideInLeft 0.6s ease-out',
        'cozy-slide-in-right': 'slideInRight 0.6s ease-out',
        'cozy-scale-in': 'scaleIn 0.5s ease-out',
        'cozy-rotate-in': 'rotateIn 0.8s ease-out',
        'cozy-morph': 'morph 2s ease-in-out infinite',
        'cozy-twinkle': 'twinkle 1.5s ease-in-out infinite',
        'cozy-wave': 'wave 2s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(5deg)' },
          '75%': { transform: 'rotate(-5deg)' },
        },
        bounceIn: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.3) rotate(-10deg)',
          },
          '50%': { 
            opacity: '1',
            transform: 'scale(1.05) rotate(2deg)',
          },
          '70%': { 
            transform: 'scale(0.95) rotate(-1deg)',
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1) rotate(0deg)',
          },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-3px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(3px)' },
        },
        glow: {
          'from': { boxShadow: '0 0 20px hsla(18, 75%, 65%, 0.3)' },
          'to': { boxShadow: '0 0 30px hsla(18, 75%, 65%, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        loadingDance: {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '25%': { transform: 'rotate(10deg) scale(1.1)' },
          '50%': { transform: 'rotate(0deg) scale(0.9)' },
          '75%': { transform: 'rotate(-10deg) scale(1.1)' },
        },
        confetti: {
          '0%': { 
            transform: 'translateY(0) rotate(0deg)',
            opacity: '1',
          },
          '100%': { 
            transform: 'translateY(-100px) rotate(360deg)',
            opacity: '0',
          },
        },
        slideUp: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideInLeft: {
          '0%': { 
            opacity: '0',
            transform: 'translateX(-30px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        slideInRight: {
          '0%': { 
            opacity: '0',
            transform: 'translateX(30px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        scaleIn: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.8)',
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        rotateIn: {
          '0%': { 
            opacity: '0',
            transform: 'rotate(-180deg) scale(0.5)',
          },
          '100%': { 
            opacity: '1',
            transform: 'rotate(0deg) scale(1)',
          },
        },
        morph: {
          '0%, 100%': { 
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          },
          '50%': { 
            borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%',
          },
        },
        twinkle: {
          '0%, 100%': { 
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': { 
            opacity: '0.5',
            transform: 'scale(1.1)',
          },
        },
        wave: {
          '0%, 100%': { 
            transform: 'rotate(0deg)',
          },
          '25%': { 
            transform: 'rotate(5deg)',
          },
          '75%': { 
            transform: 'rotate(-5deg)',
          },
        },
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.break-inside-avoid': {
          'break-inside': 'avoid',
        },
        '.line-clamp-1': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '1',
        },
        '.line-clamp-2': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '2',
        },
        '.line-clamp-3': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '3',
        },
        '.line-clamp-4': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '4',
        },
        '.line-clamp-5': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '5',
        },
        '.line-clamp-6': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '6',
        },
      }
      addUtilities(newUtilities)
    }
  ],
};