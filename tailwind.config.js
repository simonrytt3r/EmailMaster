/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── TTE.ai brand palette ──────────────────────────────────────────
        'tt-green':    '#8CCB3F',   // Primary accent — Turf Tank Green
        'tt-green-2':  '#2FAA4A',   // Secondary green
        'tt-green-3':  '#214729',   // Dark green
        'tt-black':    '#1B1B1B',   // Body background
        'tt-card':     '#242424',   // Card surface
        'tt-card-2':   '#2A2A2A',   // Secondary card / input bg
        'tt-card-3':   '#1F1F1F',   // Elevated card hover
        'tt-sep':      '#333333',   // Separator
        'tt-grey':     '#58595B',   // Space grey
        'tt-grey-2':   '#888B8B',   // Subdued text
        'tt-teal':     '#0FACC1',   // Info / Pro accent
        'tt-orange':   '#EFB434',   // Warning / new-info
        'tt-white':    '#FFFFFF',   // Pure white

        // ── iOS system colors (kept for legacy components) ────────────────
        'ios-bg': '#F2F2F7',
        'ios-card': '#FFFFFF',
        'ios-secondary': '#E5E5EA',
        'ios-blue': '#007AFF',
        'ios-green': '#34C759',
        'ios-yellow': '#FF9500',
        'ios-red': '#FF3B30',
        'ios-text': '#000000',
        'ios-text-2': '#8E8E93',
        'ios-text-3': '#C7C7CC',
        'ios-sep': '#C6C6C8',
        // iOS dark mode (mapped to TTE.ai values)
        'ios-dark-bg': '#1B1B1B',
        'ios-dark-card': '#242424',
        'ios-dark-secondary': '#2A2A2A',
        'ios-dark-sep': '#333333',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      boxShadow: {
        'ios': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'ios-md': '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        'ios-blue': '0 2px 8px rgba(0, 122, 255, 0.30)',
        'ios-seg': '0 1px 3px rgba(0,0,0,0.12)',
        // TTE.ai shadows
        'tt': '0 1px 3px rgba(0,0,0,0.24), 0 1px 2px rgba(0,0,0,0.16)',
        'tt-md': '0 4px 16px rgba(0,0,0,0.32), 0 2px 6px rgba(0,0,0,0.20)',
        'tt-green': '0 2px 12px rgba(140, 203, 63, 0.28)',
        'tt-green-glow': '0 0 24px rgba(140, 203, 63, 0.18)',
        'tt-card': '0 2px 8px rgba(0,0,0,0.32)',
      },
      borderRadius: {
        'ios': '12px',
        'ios-sm': '8px',
        'ios-lg': '16px',
        'tt': '10px',
        'tt-sm': '6px',
        'tt-lg': '14px',
        'tt-xl': '20px',
      },
      maxWidth: {
        'ios': '720px',
        'tt': '860px',
      },
      transitionTimingFunction: {
        'ios': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'tt': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
