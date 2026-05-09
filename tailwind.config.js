/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FBF7EC', 100: '#F5ECD1', 200: '#EBD89B', 300: '#DEC374',
          400: '#D0AC52', 500: '#C9A961', 600: '#A8873D', 700: '#846831',
          800: '#5F4B24', 900: '#3D3017'
        },
        ivory: '#FDFAF2',
        cream: '#F7F1E3',
        ink: '#1A1A1A',
        charcoal: '#2B2B2B',
        stone: '#6B6B63'
      },
      fontFamily: {
        display: ['Jua', 'system-ui', 'sans-serif'],
        body:    ['"Gowun Dodum"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        soft: '0 1px 2px rgba(26,26,26,0.04), 0 4px 16px rgba(26,26,26,0.06)',
        gold: '0 4px 20px rgba(201,169,97,0.25)'
      }
    }
  },
  plugins: []
}
