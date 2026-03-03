import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A3C6E',
        accent: '#F97316',
        secondary: '#0EA5E9',
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
        'bg-light': '#F8FAFC',
        'text-dark': '#1E293B',
        'text-muted': '#64748B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
