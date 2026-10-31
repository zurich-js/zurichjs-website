import type { AppProps } from 'next/app';
import localFont from 'next/font/local';
import '@/styles/globals.css';

// Figtree variable font from the conference repo, weights 300–900. No synthetic bold.
const figtree = localFont({
  src: '../../public/fonts/Figtree-VariableFont_wght.ttf',
  variable: '--font-figtree',
  weight: '300 900',
  display: 'swap',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* Define the font variable on :root so <body> (and anything portalled into it) resolves Figtree too. */}
      <style>{`:root { --font-figtree: ${figtree.style.fontFamily}; }`}</style>
      <div className={`${figtree.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
