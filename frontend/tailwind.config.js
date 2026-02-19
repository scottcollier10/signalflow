/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neumorphic Dark Theme
        'neu-bg': '#1e2028',
        'neu-accent': '#a89be0',
        'neu-accent-light': '#c4b8f0',
        'neu-dark': '#f0f0f4',
        'neu-text': '#d8d8e0',
        'neu-text-muted': '#9a9eb0',
        'neu-shadow-dark': '#14161c',
        'neu-shadow-light': '#282c38',
        'neu-teal': '#4dc9b0',
        'neu-orange': '#f0956a',
        'neu-green': '#5ed4a0',
        'neu-coral': '#f08b7a',
      },
      fontFamily: {
        'display': ['Outfit', 'sans-serif'],
        'body': ['DM Sans', 'sans-serif'],
        'sans': ['DM Sans', 'sans-serif'], // Default
      },
      boxShadow: {
        // Neumorphic Shadows
        'neu-raised': '8px 8px 16px #14161c, -8px -8px 16px #282c38',
        'neu-raised-sm': '5px 5px 10px #14161c, -5px -5px 10px #282c38',
        'neu-raised-lg': '12px 12px 24px #14161c, -12px -12px 24px #282c38',
        'neu-inset': 'inset 5px 5px 10px #14161c, inset -5px -5px 10px #282c38',
        'neu-flat': '6px 6px 12px #14161c, -6px -6px 12px #282c38',
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
