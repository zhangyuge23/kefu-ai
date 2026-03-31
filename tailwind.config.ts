import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8ecdff',
          400: '#59b0ff',
          500: '#338dff',
          600: '#1a6ef5',
          700: '#1358e1',
          800: '#1647b6',
          900: '#183f8f',
          950: '#142857',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
