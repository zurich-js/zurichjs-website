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

        /* ── New design tokens (source of truth) ── */
        "zjs-yellow": "var(--zjs-yellow)",
        "zjs-yellow-soft": "var(--zjs-yellow-soft)",
        "zjs-yellow-mute": "var(--zjs-yellow-mute)",
        "zjs-blue": "var(--zjs-blue)",
        "zjs-blue-deep": "var(--zjs-blue-deep)",
        "zjs-blue-soft": "var(--zjs-blue-soft)",
        "zjs-black": "var(--zjs-black)",
        "zjs-white": "var(--zjs-white)",
        "zjs-gray": {
          50: "var(--zjs-gray-50)",
          100: "var(--zjs-gray-100)",
          200: "var(--zjs-gray-200)",
          300: "var(--zjs-gray-300)",
          400: "var(--zjs-gray-400)",
          500: "var(--zjs-gray-500)",
          600: "var(--zjs-gray-600)",
          700: "var(--zjs-gray-700)",
          800: "var(--zjs-gray-800)",
          900: "var(--zjs-gray-900)",
        },
        "zjs-slate": {
          700: "var(--zjs-slate-700)",
          800: "var(--zjs-slate-800)",
          900: "var(--zjs-slate-900)",
        },
        "zjs-pink": "var(--zjs-pink)",
        "zjs-rose": "var(--zjs-rose)",
        "zjs-green": "var(--zjs-green)",
        "zjs-amber": "var(--zjs-amber)",
        "zjs-cyan": "var(--zjs-cyan)",

        /* ── Legacy aliases (backward compat — remove in Phase 8) ── */
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
      fontFamily: {
        sans: [
          "'Inter'",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "'JetBrains Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "'SF Mono'",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        "zjs-xs": "var(--zjs-radius-xs)",
        "zjs-sm": "var(--zjs-radius-sm)",
        "zjs-md": "var(--zjs-radius-md)",
        "zjs-lg": "var(--zjs-radius-lg)",
        "zjs-xl": "var(--zjs-radius-xl)",
        "zjs-2xl": "var(--zjs-radius-2xl)",
        "zjs-pill": "var(--zjs-radius-pill)",
      },
      boxShadow: {
        "zjs-xs": "var(--zjs-shadow-xs)",
        "zjs-sm": "var(--zjs-shadow-sm)",
        "zjs-md": "var(--zjs-shadow-md)",
        "zjs-lg": "var(--zjs-shadow-lg)",
        "zjs-xl": "var(--zjs-shadow-xl)",
        "zjs-card": "var(--zjs-shadow-card)",
      },
      maxWidth: {
        zjs: "var(--zjs-container)",
        "zjs-narrow": "var(--zjs-container-narrow)",
      },
    },
  },
  plugins: [],
};
export default config;
