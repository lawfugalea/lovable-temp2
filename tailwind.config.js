/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        cozy: {
          bg: 'hsl(var(--background) / <alpha-value>)',
          surface: 'hsl(var(--card) / <alpha-value>)',
          text: 'hsl(var(--foreground) / <alpha-value>)',
          'text-muted': 'hsl(var(--muted-foreground) / <alpha-value>)',
          'text-soft': 'hsl(var(--muted-foreground) / 0.72)',
          primary: 'hsl(var(--primary) / <alpha-value>)',
          'primary-soft': 'hsl(var(--primary-soft) / <alpha-value>)',
          'primary-deep': 'hsl(var(--primary-deep) / <alpha-value>)',
          'primary-dark': 'hsl(var(--primary-deep) / <alpha-value>)',
          border: 'hsl(var(--border) / <alpha-value>)',
          sage: 'hsl(var(--sage) / <alpha-value>)',
          'sage-soft': 'hsl(var(--sage-soft) / <alpha-value>)',
          terracotta: 'hsl(var(--primary) / <alpha-value>)',
          cream: 'hsl(var(--secondary) / <alpha-value>)',
          sand: 'hsl(var(--accent) / <alpha-value>)',
          gray: {
            50: 'hsl(var(--background) / <alpha-value>)',
            100: 'hsl(var(--muted) / <alpha-value>)',
            200: 'hsl(var(--border) / <alpha-value>)',
            300: 'hsl(var(--input) / <alpha-value>)',
            400: 'hsl(var(--muted-foreground) / <alpha-value>)',
            hover: 'hsl(var(--secondary) / <alpha-value>)',
            active: 'hsl(var(--accent) / <alpha-value>)',
          },
        },
      },
      backgroundImage: {
        'cozy-warm': 'radial-gradient(circle at top left, hsl(var(--primary-soft) / .55), transparent 34%), linear-gradient(180deg, hsl(var(--background)), hsl(var(--secondary) / .65))',
        'cozy-header': 'linear-gradient(135deg, hsl(var(--primary-soft) / .75), hsl(var(--secondary)), hsl(var(--sage-soft) / .7))',
      },
      boxShadow: {
        'cozy-sm': '0 1px 2px hsl(var(--foreground) / .05), 0 1px 8px hsl(var(--foreground) / .035)',
        'cozy-md': '0 12px 30px -16px hsl(var(--foreground) / .24)',
        'cozy-lg': '0 24px 60px -24px hsl(var(--foreground) / .32)',
        'cozy-glow': '0 10px 28px -12px hsl(var(--primary) / .45)',
        soft: '0 16px 40px -24px hsl(var(--foreground) / .28)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        cozy: 'var(--radius)',
        'cozy-lg': 'calc(var(--radius) + 4px)',
        'cozy-xl': 'calc(var(--radius) + 10px)',
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
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
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
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
