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
        brand: {
          primary: "#F1E271",
          dark: "#E8D54E",
          light: "#F5EC9A",
          yellow: {
            main: "#F1E271",
            secondary: "#EDC936",
          },
          blue: {
              DEFAULT: "#258BCC",
              primary: "#258BCC",
              dark: "#1E6FA3",
              light: "#3BA0E0",
          },
          orange: {
              DEFAULT: "#EA561D",
              dark: "#cc4b18",
          },
          green: "#31A853",
          red: "#ea1d35",
          black: "#000000",
          white: "#FFFFFF",
          gray: {
            darkest: "#19191B",
            dark: "#242528",
            medium: "#7C7F89",
            light: "#A9AAB1",
            lightest: "#EDEDEF",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
