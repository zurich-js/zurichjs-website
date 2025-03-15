import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { GoogleAnalytics } from '@next/third-parties/google'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <GoogleAnalytics gaId="G-GWWBJT7QS5" />
      <Component {...pageProps} />
    </>
  );
}
