import { sendGTMEvent } from '@next/third-parties/google';
import posthog from 'posthog-js';
import { useCallback } from 'react';

type EventProperties = {
  [key: string]: string | number | boolean | undefined;
};

/**
 * Custom hook for tracking events in both Google Tag Manager and PostHog
 * @returns Object with track function to send events to both platforms
 */
export default function useEvents() {
  /**
   * Tracks an event in both GTM and PostHog
   * @param eventName - The name of the event
   * @param properties - Additional properties for the event
   */
  const track = useCallback((eventName: string, properties: EventProperties = {}) => {
    // Send to Google Tag Manager
    sendGTMEvent({
      event: eventName,
      ...properties
    });

    // Send to PostHog
    try {
      posthog.capture(eventName, properties);
    } catch (error) {
      console.error('PostHog tracking error:', error);
    }
  }, []);

  /**
   * Captures an error to PostHog for monitoring
   * @param error - The error object
   * @param context - Additional context about where the error occurred
   */
  const captureError = useCallback((error: Error, context: Record<string, string | number | boolean> = {}) => {
    try {
      posthog.capture('$exception', {
        $exception_message: error.message,
        $exception_type: error.name,
        $exception_stack_trace_raw: error.stack,
        ...context
      });
    } catch (err) {
      console.error('PostHog error capture failed:', err);
    }
  }, []);

  return { track, captureError };
} 