module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      /* ═══ COLORS ═══ */
      colors: {
        koine: {
          gold: {
            50: '#faf6e8',
            100: '#f0e4c0',
            200: '#e8d5a3',
            300: '#d4c18a',
            400: '#c9a84c',
            500: '#daa540',
            600: '#c97a20',
            700: '#a06218',
            800: '#8a5a10',
            900: '#6b5020',
          },
          cream: {
            50: '#fdf9f0',
            100: '#f4efe4',
            200: '#e8dbb0',
            300: '#d4c5a0',
            400: '#c4b68a',
            500: '#a09070',
          },
          dark: {
            50: '#1a1810',
            100: '#151210',
            200: '#111118',
            300: '#0f0e0a',
            400: '#0d0b08',
            500: '#0a0a12',
            600: '#08080e',
          },
          red: {
            900: '#2a0808',
            800: '#3a0e0e',
            700: '#5a0e0e',
            600: '#6a1010',
            500: '#8b1a1a',
            400: '#a52020',
            300: '#c53030',
          },
          flame: {
            light: '#f0e0a0',
            medium: '#daa540',
            deep: '#c97a20',
            ember: '#8a5a10',
          },
        },
        /* Semantic aliases for quick use */
        surface: {
          base: 'var(--koine-surface-base)',
          primary: 'var(--koine-surface-primary)',
          elevated: 'var(--koine-surface-elevated)',
        },
        accent: 'var(--koine-text-accent)',
        muted: 'var(--koine-text-muted)',
        interactive: 'var(--koine-interactive)',
      },

      /* ═══ TYPOGRAPHY ═══ */
      fontFamily: {
        display: ["'Cormorant Garamond'", 'Georgia', "'Times New Roman'", 'serif'],
        body: ["'DM Sans'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
        accent: ["'Libre Baskerville'", 'Georgia', 'serif'],
        mono: ["'JetBrains Mono'", "'Fira Code'", 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1.5' }],
      },
      letterSpacing: {
        'wordmark': '0.30em',
        'display': '0.20em',
        'heading': '0.08em',
        'overline': '0.35em',
        'label': '0.15em',
      },
      lineHeight: {
        'tight': '1.15',
        'snug': '1.3',
        'relaxed': '1.65',
      },

      /* ═══ SPACING ═══ */
      borderRadius: {
        'koine-sm': '6px',
        'koine-md': '10px',
        'koine-lg': '14px',
        'koine-xl': '16px',
        'koine-2xl': '20px',
      },

      /* ═══ SHADOWS ═══ */
      boxShadow: {
        'koine-sm': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'koine-md': '0 4px 12px rgba(0,0,0,0.4)',
        'koine-lg': '0 8px 24px rgba(0,0,0,0.5)',
        'koine-glow-sm': '0 0 8px rgba(201,168,76,0.15)',
        'koine-glow-md': '0 0 16px rgba(201,168,76,0.2)',
        'koine-glow-lg': '0 0 32px rgba(201,168,76,0.12)',
        'koine-glow-neon': '0 0 10px rgba(218,165,64,0.4), 0 0 30px rgba(218,165,64,0.15)',
      },

      /* ═══ MOTION ═══ */
      transitionDuration: {
        'instant': '100ms',
        'fast': '150ms',
        'normal': '250ms',
        'slow': '400ms',
        'gentle': '600ms',
        'meditative': '1000ms',
        'breath': '2000ms',
      },
      transitionTimingFunction: {
        'koine': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'gentle': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'flame': 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
      },
      keyframes: {
        'koine-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'koine-fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'koine-glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'koine-flame-flicker': {
          '0%, 100%': { opacity: '0.8', transform: 'scaleY(1)' },
          '25%': { opacity: '0.9', transform: 'scaleY(1.03)' },
          '50%': { opacity: '1', transform: 'scaleY(0.97)' },
          '75%': { opacity: '0.85', transform: 'scaleY(1.01)' },
        },
      },
      animation: {
        'koine-fade-in': 'koine-fade-in 600ms cubic-bezier(0.25,0.1,0.25,1) both',
        'koine-fade-in-up': 'koine-fade-in-up 600ms cubic-bezier(0,0,0.2,1) both',
        'koine-glow': 'koine-glow-pulse 2000ms cubic-bezier(0.25,0.1,0.25,1) infinite',
        'koine-flame': 'koine-flame-flicker 3s cubic-bezier(0.45,0.05,0.55,0.95) infinite',
      },

      /* ═══ LAYOUT ═══ */
      maxWidth: {
        'koine-content': '68.75rem',
        'koine-wide': '80rem',
      },
    },
  },
  plugins: [],
};
