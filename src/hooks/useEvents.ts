import { sendGTMEvent } from '@next/third-parties/google';
import posthog from 'posthog-js';

type EventProperties = {
  [key: string]: string | number | boolean;
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
  const track = (eventName: string, properties: EventProperties = {}) => {
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
  };

  return { track };
} 