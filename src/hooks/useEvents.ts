import posthog from 'posthog-js';
import { useCallback } from 'react';

type EventProperties = {
  [key: string]: string | number | boolean | undefined;
};

/**
 * Custom hook for tracking events in both Google Tag Manager and PostHog
 */
export default function useEvents() {
  const track = useCallback((eventName: string, properties: EventProperties = {}) => {
    // Send to Google Tag Manager (if loaded)
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: eventName,
        ...properties,
      });
    }

    // Send to PostHog
    try {
      posthog.capture(eventName, properties);
    } catch (error) {
      console.error('PostHog tracking error:', error);
    }
  }, []);

  const captureError = useCallback((error: Error, context: Record<string, string | number | boolean> = {}) => {
    try {
      posthog.capture('$exception', {
        $exception_message: error.message,
        $exception_type: error.name,
        $exception_stack_trace_raw: error.stack,
        ...context,
      });
    } catch (err) {
      console.error('PostHog error capture failed:', err);
    }
  }, []);

  return { track, captureError };
}

// Extend Window interface for dataLayer
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    posthog?: typeof posthog;
    gtag?: (...args: unknown[]) => void;
  }
}
