/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'var(--font-body)',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'sans-serif'
  			],
  			display: [
  				'var(--font-display)',
  				'var(--font-body)',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		colors: {
  			brand: {
  				blue: 'hsl(var(--brand-blue) / <alpha-value>)',
  				purple: 'hsl(var(--brand-purple) / <alpha-value>)',
  				teal: 'hsl(var(--brand-teal) / <alpha-value>)',
  				coral: 'hsl(var(--brand-coral) / <alpha-value>)',
  				amber: 'hsl(var(--brand-amber) / <alpha-value>)',
  				green: 'hsl(var(--brand-green) / <alpha-value>)',
  				dark: '#0F172A',
  				heading: '#111827',
  				body: '#4B5563',
  				muted: '#94A3B8',
  				success: '#22C55E',
  				warning: '#F59E0B',
  				error: '#EF4444'
  			},
  			border: 'hsl(var(--border) / <alpha-value>)',
  			input: 'hsl(var(--input) / <alpha-value>)',
  			ring: 'hsl(var(--ring) / <alpha-value>)',
  			background: 'hsl(var(--background) / <alpha-value>)',
  			foreground: 'hsl(var(--foreground) / <alpha-value>)',
  			primary: {
  				DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
  				foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
  				foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
  				foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
  				foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
  				foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
  				foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card) / <alpha-value>)',
  				foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
  			},
  			module: {
  				shopping: 'hsl(var(--module-shopping) / <alpha-value>)',
  				finances: 'hsl(var(--module-finances) / <alpha-value>)',
  				medicine: 'hsl(var(--module-medicine) / <alpha-value>)',
  				notes: 'hsl(var(--module-notes) / <alpha-value>)',
  				meals: 'hsl(var(--module-meals) / <alpha-value>)',
  				chores: 'hsl(var(--module-chores) / <alpha-value>)'
  			}
  		},
  		backgroundImage: {
  			'brand-primary': 'linear-gradient(135deg, #4D6BFF, #7B61FF)',
  			'brand-secondary': 'linear-gradient(135deg, #20C5C8, #4D6BFF)',
  			'brand-accent': 'linear-gradient(135deg, #FF6B6B, #7B61FF)'
  		},
  		boxShadow: {
  			'soft-sm': '0 1px 2px hsl(var(--shadow-color) / .05), 0 1px 8px hsl(var(--shadow-color) / .035)',
  			soft: '0 12px 30px -16px hsl(var(--shadow-color) / .24)',
  			'soft-lg': '0 24px 60px -24px hsl(var(--shadow-color) / .32)',
  			glow: '0 10px 28px -12px hsl(var(--primary) / .45)',
  			'glow-primary': '0 0 var(--glow-spread) hsl(var(--primary) / var(--glow-opacity))',
  			'glow-module': '0 0 var(--glow-spread) hsl(var(--module-finances) / var(--glow-opacity))',
  			'glow-inset': 'inset 0 1px 0 hsl(0 0% 100% / .08), 0 0 var(--glow-spread) -6px hsl(var(--primary) / var(--glow-opacity))'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		animation: {
  			'fade-in': 'fade-in 0.4s ease-out',
  			rise: 'rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
  			'scale-in': 'scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'draw-line': 'draw-line 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
  			'grow-bar': 'grow-bar 0.5s cubic-bezier(0.22, 1, 0.36, 1) both'
  		},
  		// Glow is measured in the theme so light mode can hold back; see
  		// --glow-opacity and --glow-spread in globals.css.
  		keyframes: {
  			'aurora-drift': {
  				'0%': { transform: 'translate3d(0, 0, 0) scale(1)' },
  				'100%': { transform: 'translate3d(12%, -8%, 0) scale(1.18)' }
  			},
  			sheen: {
  				'0%': { transform: 'translateX(-120%)' },
  				'100%': { transform: 'translateX(120%)' }
  			},
  			shimmer: {
  				'0%': { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(100%)' }
  			},
  			'pulse-ring': {
  				'0%': { transform: 'scale(0.6)', opacity: '0.55' },
  				'70%': { transform: 'scale(1.6)', opacity: '0' },
  				'100%': { transform: 'scale(1.6)', opacity: '0' }
  			},
  			// Bars grow from their own base; `rise` translates, which reads wrong
  			// on a bar anchored to an axis.
  			'grow-bar': {
  				'0%': {
  					transform: 'scaleY(0)'
  				},
  				'100%': {
  					transform: 'scaleY(1)'
  				}
  			},
  			'draw-line': {
  				'0%': {
  					strokeDashoffset: '1'
  				},
  				'100%': {
  					strokeDashoffset: '0'
  				}
  			},
  			rise: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(16px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'scale-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.96)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(4px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		typography: {
  			DEFAULT: {
  				css: {
  					'code::before': {
  						content: ''
  					},
  					'code::after': {
  						content: ''
  					},
  					code: {
  						background: '#f3f3f3',
  						wordWrap: 'break-word',
  						padding: '.1rem .2rem',
  						borderRadius: '.2rem'
  					}
  				}
  			}
  		}
  	}
  },
  plugins: [require('tailwindcss-animate'), require("@tailwindcss/typography")],
};
