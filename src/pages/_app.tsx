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
  }, [user, isValid, router])

  // Identify the user with PostHog and SessionRecorder when they log in
  useEffect(() => {
    if (user) {
      // PostHog identification
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        clerk_id: user.id
      });

      // DISABLED: SessionRecorder session attributes
      // if (process.env.NEXT_PUBLIC_MULTIPLAYER_OTLP_KEY && typeof window !== 'undefined') {
      //   import('@multiplayer-app/session-recorder-browser')
      //     .then((module) => {
      //       const SessionRecorder = module.default;
      //
      //       try {
      //         SessionRecorder.setSessionAttributes({
      //           userId: user.id,
      //           userName: user.fullName || 'Unknown',
      //           userEmail: user.primaryEmailAddress?.emailAddress || '',
      //           clerkId: user.id,
      //           // Add any additional user attributes you want to track
      //           hasProfileImage: !!user.imageUrl,
      //           createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : '',
      //         });
      //       } catch (error) {
      //         console.warn('Failed to set SessionRecorder session attributes:', error);
      //       }
      //     })
      //     .catch((error) => {
      //       console.warn('Failed to load SessionRecorder for user attributes:', error);
      //     });
      // }
    }
  }, [user]);
  
  // Set up a listener for Clerk's beforeSignOut event
  useEffect(() => {
    // Register an event listener for signing out
    const unsubscribe = clerk.addListener(({ session }) => {
      // If session changes to null (user signs out), reset PostHog and clear SessionRecorder attributes
      if (!session && clerk.session === null) {
        posthog.reset();

        // DISABLED: Clear SessionRecorder session attributes
        // if (process.env.NEXT_PUBLIC_MULTIPLAYER_OTLP_KEY && typeof window !== 'undefined') {
        //   import('@multiplayer-app/session-recorder-browser')
        //     .then((module) => {
        //       const SessionRecorder = module.default;
        //
        //       try {
        //         SessionRecorder.setSessionAttributes({});
        //       } catch (error) {
        //         console.warn('Failed to clear SessionRecorder session attributes:', error);
        //       }
        //     })
        //     .catch((error) => {
        //       console.warn('Failed to load SessionRecorder for logout:', error);
        //     });
        // }
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
    // DISABLED: Initialize SessionRecorder only if API key is available
    // if (process.env.NEXT_PUBLIC_MULTIPLAYER_OTLP_KEY) {
    //   // Dynamically import SessionRecorder only in the browser
    //   import('@multiplayer-app/session-recorder-browser')
    //     .then((module) => {
    //       const SessionRecorder = module.default;
    //
    //       try {
    //         // Get the current domain for API route propagation
    //         const currentDomain = window.location.origin;
    //
    //         SessionRecorder.init({
    //           application: 'zurichjs-website',
    //           version: '1.0.0',
    //           environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    //           apiKey: process.env.NEXT_PUBLIC_MULTIPLAYER_OTLP_KEY as string,
    //           // Propagate trace headers to API routes for full-stack correlation
    //           propagateTraceHeaderCorsUrls: [
    //             // Local API routes
    //             new RegExp(`${currentDomain}/api/.*`, 'i'),
    //             // Production domain (update with your production domain if different)
    //             new RegExp('https://.*\\.vercel\\.app/api/.*', 'i'),
    //             // Custom domain (if you have one)
    //             // new RegExp('https://zurichjs\\.com/api/.*', 'i'),
    //           ],
    //         });
    //
    //         console.log('✅ Multiplayer session recorder initialized');
    //       } catch (error) {
    //         console.warn('Failed to initialize SessionRecorder:', error);
    //       }
    //     })
    //     .catch((error) => {
    //       console.warn('Failed to load SessionRecorder:', error);
    //     });
    // } else {
    //   console.warn('NEXT_PUBLIC_MULTIPLAYER_OTLP_KEY is not set. SessionRecorder will not be initialized.');
    // }

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