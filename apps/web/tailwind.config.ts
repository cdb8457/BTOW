/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Glass Console Spatial palette ───
        primary: '#f65af6',
        'primary-glow': 'rgba(246,90,246,0.25)',
        'violet-accent': '#8b5cf6',
        'deep-violet': '#7b4bf7',
        'lime-accent': '#d9f99d',
        'lime-glow': 'rgba(217,249,157,0.3)',
        'bg-dark': '#08080a',
        'bg-surface': 'rgba(255,255,255,0.04)',
        'border-glass': 'rgba(255,255,255,0.08)',

        // ─── Legacy discord aliases (keeps existing components working) ───
        discord: {
          bg: '#1a1a2e',
          bgSecondary: '#12121e',
          bgTertiary: '#0d0d18',
          text: '#c4c4d4',
          textMuted: '#6b6b80',
          textBright: '#f8f8ff',
          accent: '#f65af6',
          accentHover: '#e040e0',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      boxShadow: {
        'speaking': '0 0 0 3px #d9f99d, 0 0 20px rgba(217,249,157,0.3)',
        'input': '0 0 0 1px rgba(255,255,255,0.06) inset',
        'input-focus': '0 0 0 2px #8b5cf6',
        'cta-lime': '0 0 24px rgba(217,249,157,0.3), 0 4px 12px rgba(0,0,0,0.4)',
        'lime-sm': '0 0 8px rgba(217,249,157,0.3)',
        'lime-md': '0 0 16px rgba(217,249,157,0.4)',
        'lime-lg': '0 0 32px rgba(217,249,157,0.5)',
        'card-active': '0 0 0 2px #8b5cf6, 0 8px 32px rgba(0,0,0,0.5)',
        'glass': '0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset',
        'modal': '0 24px 64px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.08) inset',
        'violet': '0 0 16px rgba(139,92,246,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.4,0,0.2,1)',
        'slide-down': 'slideDown 0.25s cubic-bezier(0.4,0,0.2,1)',
        'float': 'float 4s ease-in-out infinite',
        'speaker-pulse': 'speakerPulse 1.5s ease-in-out infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        speakerPulse: {
          '0%,100%': { boxShadow: '0 0 0 3px #d9f99d, 0 0 20px rgba(217,249,157,0.3)' },
          '50%': { boxShadow: '0 0 0 4px #d9f99d, 0 0 30px rgba(217,249,157,0.5)' },
        },
        blink: { '50%': { opacity: '0' } },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
