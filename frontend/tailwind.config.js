/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Flat Dark Theme
        'neu-bg': '#141414',
        'neu-accent': '#8b7ec8',
        'neu-accent-light': '#a89be0',
        'neu-dark': '#f0f0f4',
        'neu-text': '#e5e5e5',
        'neu-text-muted': '#888888',
        'neu-shadow-dark': '#0a0a0a',
        'neu-shadow-light': '#333333',
        'neu-teal': '#2d8a7b',
        'neu-orange': '#e85a2c',
        'neu-green': '#22c55e',
        'neu-coral': '#ef4444',
        // Additional tokens for flat card system
        'neu-card': '#232323',
        'neu-card-hover': '#2a2a2a',
        'neu-card-inner': '#1c1c1c',
        'neu-sidebar': '#1a1a1a',
        'neu-border': '#333333',
        'neu-purple-bg': '#3d3556',
        'neu-yellow': '#eab308',
        'neu-blue': '#3b82f6',
        'neu-red': '#ef4444',
      },
      fontFamily: {
        'display': ['Instrument Sans', 'sans-serif'],
        'body': ['DM Sans', 'sans-serif'],
        'sans': ['DM Sans', 'sans-serif'], // Default
      },
      boxShadow: {
        // Flat theme shadows (subtle, non-neumorphic)
        'neu-raised': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'neu-raised-sm': '0 1px 4px rgba(0, 0, 0, 0.2)',
        'neu-raised-lg': '0 8px 25px rgba(0, 0, 0, 0.3)',
        'neu-inset': 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
        'neu-flat': '0 1px 3px rgba(0, 0, 0, 0.2)',
      },
      borderRadius: {
        'neu-sm': '8px',
        'neu': '12px',
        'neu-md': '16px',
        'neu-lg': '20px',
        'neu-xl': '24px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.5s ease-out forwards',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideInLeft: {
          'from': {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
