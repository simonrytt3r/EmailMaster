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
        // iOS system colors
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
        // iOS dark mode
        'ios-dark-bg': '#000000',
        'ios-dark-card': '#1C1C1E',
        'ios-dark-secondary': '#2C2C2E',
        'ios-dark-sep': '#38383A',
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
      },
      borderRadius: {
        'ios': '12px',
        'ios-sm': '8px',
        'ios-lg': '16px',
      },
      maxWidth: {
        'ios': '720px',
      },
      transitionTimingFunction: {
        'ios': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
};
