/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
      fontFamily: {
        // R-07: Changed from literal font name strings to CSS variable references.
        // next/font/google injects --font-cormorant, --font-jakarta, --font-jetbrains
        // into the <html> element. This allows Tailwind to use the self-hosted fonts.
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-jakarta)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // D-01/M-02: Added 'foreground' color — was used as dark:text-foreground
        // across 3 files (account/page, JoinPrivateStreamClient, WhatsAppShareModal)
        // but was undefined in Tailwind, making those dark-mode text classes no-ops
        // (invisible text). stone-50 matches the dark-theme text color used elsewhere.
        foreground: '#fafaf9',
        obsidian: {
          DEFAULT: '#0c0a09',
          deep: '#070606',
          soft: '#171210',
        },
        gold: {
          DEFAULT: '#f59e0b',
          deep: '#d97706',
          soft: '#fbbf24',
          pale: '#fef3c7',
        },
        vermillion: {
          DEFAULT: '#ea580c',
          deep: '#dc2626',
        },
        saffron: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
    },
  },
  plugins: [],
};
