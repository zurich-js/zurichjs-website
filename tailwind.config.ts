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
      },
    },
  },
  plugins: [],
};
export default config;
