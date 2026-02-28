/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fredoka One', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
      colors: {
        zap: {
          yellow: '#FFD600',
          purple: '#1A0533',
          electric: '#7B2FFF',
          pink: '#FF2D78',
          cyan: '#00E5FF',
        },
        answer: {
          red: '#E53935',
          blue: '#1E88E5',
          yellow: '#F9A825',
          green: '#43A047',
        },
      },
      animation: {
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'zap-flash': 'zapFlash 0.3s ease-in-out',
        'count-up': 'countUp 0.6s ease-out',
        'timer-shrink': 'timerShrink linear forwards',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        zapFlash: {
          '0%': { opacity: '1' },
          '50%': { opacity: '0.5', transform: 'scale(1.1)' },
          '100%': { opacity: '1' },
        },
        timerShrink: {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
        },
      },
    },
  },
  plugins: [],
}
