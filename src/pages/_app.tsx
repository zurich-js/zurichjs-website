import "@/styles/globals.css";
import {
  ClerkProvider,
  useUser,
} from '@clerk/nextjs'
import { GoogleAnalytics } from '@next/third-parties/google'
import type { AppProps } from "next/app";
import { Router, useRouter } from 'next/router'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

import { useCheckUserSurvey } from '@/hooks/useCheckUserSurvey';
const AuthCheck = ({ children }: { children: React.ReactNode }) => {
  
  const { user } = useUser();
  const { isValid } = useCheckUserSurvey();

  const router = useRouter();
  useEffect(() => {
    if (user && !isValid && router.pathname !== '/profile/survey') {
      router.push('/profile/survey')
    }
  }, [user, isValid])

  return <>{children}</>
}

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
      <ClerkProvider>
        <AuthCheck>
          <Component {...pageProps} />
        </AuthCheck>
      </ClerkProvider>
    </PostHogProvider>
  );
}