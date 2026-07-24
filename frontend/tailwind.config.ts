import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#D51A20', // Sulton School qizil
          dark: '#9E1318', // to'q qizil (sidebar, hover)
          accent: '#f59e0b', // sariq urg'u
        },
      },
    },
  },
  plugins: [],
};

export default config;
