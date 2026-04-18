import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2E7D32',
          light: '#E8F5E9',
        },
        warn: '#F57C00',
        danger: '#C62828',
        ink: '#111111',
        muted: '#666666',
        surface: '#FAFAFA',
      },
      borderRadius: {
        card: '16px',
      },
      fontFamily: {
        thai: ['var(--font-noto-thai)', 'Sarabun', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
