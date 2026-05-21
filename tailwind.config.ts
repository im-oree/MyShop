import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0F172A',
        secondary: '#16A34A',
        accent: '#F59E0B',
        danger: '#DC2626',
        background: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E5E7EB',
        'muted-text': '#64748B',
        text: '#0F172A',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
      },
      boxShadow: {
        soft: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'soft-md': '0 4px 6px 0 rgba(0, 0, 0, 0.05)',
      },
      spacing: {
        'touch': '44px',
      },
      breakpoints: {
        'mobile': '0px',
        'tablet': '641px',
        'desktop': '1025px',
      },
    },
  },
  plugins: [],
} satisfies Config
