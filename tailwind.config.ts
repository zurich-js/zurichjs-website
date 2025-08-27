import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        js: {
          DEFAULT: "#F1E271",
          dark: "#EDC936",
          darker: "#c5a301",
        },
        zurich: "#258BCC",
        'kit-orange': "#FF5400",
        'kit-green': "#34A853",
        'kit-gray-light':'#f2f2f2',
        'kit-gray-medium': '#E5E5E5',
        'kit-gray-dark': '#4D4D4D',
      },
      fontSize: {
        'kit-xs': "0.75rem", // 12px
        'kit-sm': ["0.875rem", '130%'], // 14px
        'kit-base': ["1rem", '130%'], // 16px
        'kit-md': ["1.125rem", '110%'], // 18px
        'kit-lg': ["1.5rem", '110%'], // 24px
        'kit-xl': ["2rem", '110%'], // 32px
        'kit-huge': ["4.5rem", '110%'], // 72px
      },
      screens: {
        xs: "400px",
      },
      minWidth: {
        'screen-xs': "400px",
      }
    },
  },
  plugins: [],
};
export default config;
