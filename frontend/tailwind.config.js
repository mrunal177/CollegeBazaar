/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian:  { DEFAULT: '#050A14', 2: '#080F1C', 3: '#0C1526', 4: '#111E35', 5: '#172440' },
        cyan:      { DEFAULT: '#00D4FF', dim: '#00A8CC', glow: 'rgba(0,212,255,0.15)' },
        acid:      { DEFAULT: '#39FF14', dim: '#2DD10F', glow: 'rgba(57,255,20,0.15)' },
        gold:      { DEFAULT: '#FFD166', dim: '#E6B84E', glow: 'rgba(255,209,102,0.15)' },
        rose:      { DEFAULT: '#FF6B9D', glow: 'rgba(255,107,157,0.15)' },
        ink:       { 1: '#E8F0FF', 2: '#8899BB', 3: '#445577' },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['Outfit', 'sans-serif'],
        mono:    ['Fira Code', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
        `,
        'glow-cyan':  'radial-gradient(ellipse at center, rgba(0,212,255,0.15) 0%, transparent 70%)',
        'glow-acid':  'radial-gradient(ellipse at center, rgba(57,255,20,0.12) 0%, transparent 70%)',
        'glow-gold':  'radial-gradient(ellipse at center, rgba(255,209,102,0.12) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'glow-cyan': '0 0 30px rgba(0,212,255,0.25), 0 0 60px rgba(0,212,255,0.1)',
        'glow-acid': '0 0 30px rgba(57,255,20,0.2), 0 0 60px rgba(57,255,20,0.08)',
        'glow-gold': '0 0 30px rgba(255,209,102,0.2)',
        'card':      '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card-hover':'0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      animation: {
        'float':      'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'scan':       'scan 3s linear infinite',
        'shimmer':    'shimmer 2s linear infinite',
        'count-up':   'countUp 1s ease-out forwards',
        'slide-up':   'slideUp 0.5s ease forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        scan:      { '0%': { backgroundPosition: '0 -100%' }, '100%': { backgroundPosition: '0 200%' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        countUp:   { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glowPulse: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}