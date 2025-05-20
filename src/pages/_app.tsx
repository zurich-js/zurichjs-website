import "@/styles/globals.css";
import {
  ClerkProvider,
  useUser,
  useClerk
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
  const clerk = useClerk();
  
  const router = useRouter();
  useEffect(() => {
    if (user && !isValid && router.pathname !== '/profile/survey') {
      router.push('/profile/survey')
    }
  }, [user, isValid])

  // Identify the user with PostHog when they log in
  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        clerk_id: user.id
      });
    }
  }, [user]);
  
  // Set up a listener for Clerk's beforeSignOut event
  useEffect(() => {
    // Register an event listener for signing out
    const unsubscribe = clerk.addListener(({ session }) => {
      // If session changes to null (user signs out), reset PostHog
      if (!session && clerk.session === null) {
        posthog.reset();
      }
    });
    
    // Cleanup function to remove the listener
    return () => {
      unsubscribe();
    };
  }, [clerk]);

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