import type { Config } from 'tailwindcss';

/**
 * Brand tokens come from the ZurichJS conference site and the V2 design:
 * black opening + footer, white content, yellow as the only accent.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      // The design has one breakpoint: below 800px is the mobile layout.
      md: '800px',
      lg: '1100px',
    },
    extend: {
      colors: {
        black: '#000000',
        white: '#FFFFFF',
        yellow: { DEFAULT: '#F1E271', hover: '#EDC936' },
        ink: { DEFAULT: '#19191B', 2: '#242528', 3: '#3A3B40' },
        grey: { DEFAULT: '#EDEDEF', soft: '#F6F6F4', mid: '#A9AAB1', text: '#5F626B', line: '#7C7F89', frame: '#D9D9DC' },
        blue: '#268BCC',
        danger: { DEFAULT: '#B3261E', soft: '#F6D8D3' },
      },
      fontFamily: {
        sans: ['var(--font-figtree)', 'Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '999px',
        card: '24px',
        block: 'clamp(24px, 3vw, 40px)',
      },
      maxWidth: {
        site: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
