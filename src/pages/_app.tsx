import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { GoogleAnalytics } from '@next/third-parties/google'
import { useEffect } from 'react'
import { Router } from 'next/router'
import { PostHogProvider } from 'posthog-js/react'
import posthog from 'posthog-js'

export default function App({ Component, pageProps }: AppProps) {

  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'always' as const, // or 'always' to create profiles for anonymous users as well
      // Enable debug mode in development
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug()
      }
    })

    const handleRouteChange = () => posthog?.capture('$pageview')

    Router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      Router.events.off('routeChangeComplete', handleRouteChange);
    }
  }, [])

  return (
    <PostHogProvider client={posthog}>
      <GoogleAnalytics gaId="G-GWWBJT7QS5" />
      <Component {...pageProps} />
    </PostHogProvider>
  );
}
