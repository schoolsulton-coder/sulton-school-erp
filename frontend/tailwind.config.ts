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
          DEFAULT: '#2563eb', // taklif PDF dagi ko'k
          dark: '#1e3a8a',
          accent: '#f59e0b', // sariq urg'u
        },
      },
    },
  },
  plugins: [],
};

export default config;
