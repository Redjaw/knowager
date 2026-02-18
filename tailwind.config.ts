import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#dbeafe',
          500: '#2e80e6',
          700: '#1f5ea8'
        }
      }
    }
  },
  plugins: []
};

export default config;
