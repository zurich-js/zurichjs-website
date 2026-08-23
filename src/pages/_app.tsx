import "@/styles/globals.css";

import { ClerkProvider, useUser, useClerk } from "@clerk/nextjs";
import type { AppProps } from "next/app";
import { Router, useRouter } from "next/router";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";

// Strip traceparent headers from all fetch requests to prevent CORS issues
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.delete("traceparent");
        init.headers.delete("tracestate");
      } else if (Array.isArray(init.headers)) {
        init.headers = init.headers.filter(
          ([key]) => key.toLowerCase() !== "traceparent" && key.toLowerCase() !== "tracestate",
        );
      } else if (typeof init.headers === "object") {
        const headers = { ...init.headers } as Record<string, string>;
        delete headers["traceparent"];
        delete headers["tracestate"];
        init.headers = headers;
      }
    }
    return originalFetch.call(this, input, init);
  };
}

import { useCheckUserSurvey } from "@/hooks/useCheckUserSurvey";
const AuthCheck = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const { isValid } = useCheckUserSurvey();
  const clerk = useClerk();

  const router = useRouter();
  useEffect(() => {
    if (user && !isValid && router.pathname !== "/profile/survey") {
      const returnTo = encodeURIComponent(router.asPath);
      router.push(`/profile/survey?returnTo=${returnTo}`);
    }
  }, [user, isValid, router]);

  // Identify the user with PostHog when they log in
  useEffect(() => {
    if (user) {
      // PostHog identification
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        clerk_id: user.id,
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

  return <>{children}</>;
};

export default function App({ Component, pageProps }: AppProps) {
  const posthogInitialized = useRef(false);

  useEffect(() => {
    if (posthogInitialized.current) return;

    const initPostHog = () => {
      posthogInitialized.current = true;
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        person_profiles: "always" as const,
        loaded: (posthog) => {
          if (process.env.NODE_ENV === "development") posthog.debug();
        },
      });

      const handleRouteChange = () => posthog?.capture("$pageview");
      Router.events.on("routeChangeComplete", handleRouteChange);
    };

    if ("requestIdleCallback" in window) {
      requestIdleCallback(initPostHog, { timeout: 3000 });
    } else {
      setTimeout(initPostHog, 2000);
    }
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <ClerkProvider>
        <AuthCheck>
          <Component {...pageProps} />
        </AuthCheck>
      </ClerkProvider>
    </PostHogProvider>
  );
}
