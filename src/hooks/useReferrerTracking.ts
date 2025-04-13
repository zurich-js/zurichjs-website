// useReferrerTracking.js
import { useRouter } from 'next/router';
import { useEffect } from 'react';

import useEvents from './useEvents';

/**
 * A custom hook to track referrer information using Google Tag Manager
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.eventName - The GTM event name (default: 'referral_visit')
 * @param {boolean} options.trackOnlyExternal - Track only external referrers (default: true)
 * @param {boolean} options.trackPathChange - Track on path changes (default: true)
 * @param {Array<string>} options.ignoreDomains - Domains to ignore (default: [])
 * @param {Function} options.onTrack - Callback when tracking occurs (default: null)
 * @returns {Object} - An object containing tracked referrer information
 */

interface ReferrerOptions {
  eventName?: string;
  trackOnlyExternal?: boolean;
  trackPathChange?: boolean;
  ignoreDomains?: string[];
  onTrack?: ((info: ReferrerInfo) => void) | null;
}

interface ReferrerInfo {
  referrer: string;
  isExternal: boolean;
  currentPath: string;
}

export default function useReferrerTracking({
  eventName = 'referral_visit',
  trackOnlyExternal = true,
  trackPathChange = true,
  ignoreDomains = [],
  onTrack = null,
}: ReferrerOptions = {}) {
  const router = useRouter();
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const { track } = useEvents();
  
  // Store the referrer information
  const referrerInfo: ReferrerInfo = {
    referrer: '',
    isExternal: false,
    currentPath: ''
  };
  
  // Function to check if a domain should be ignored
  const shouldIgnoreDomain = (url: string): boolean => {
    if (!url) return false;
    
    return ignoreDomains.some(domain => {
      try {
        return new URL(url).hostname.includes(domain);
      } catch {
        return url.includes(domain);
      }
    });
  };
  
  // Function to track the referrer
  const trackReferrer = (): void => {
    if (typeof window === 'undefined') return;
    
    const referrer = document.referrer;
    const currentPath = window.location.pathname;
    
    // Check if referrer is from the same site
    const isExternal = referrer && !referrer.includes(hostname);
    
    // Skip if tracking only external and this is internal
    if (trackOnlyExternal && !isExternal) return;
    
    // Skip if domain is in ignore list
    if (isExternal && shouldIgnoreDomain(referrer)) return;
    
    // Update referrer info
    referrerInfo.referrer = referrer;
    referrerInfo.isExternal = !!isExternal;
    referrerInfo.currentPath = currentPath;
    
    // Send event using useEvents hook
    track(eventName, {
      referrer: referrer || '(direct)',
      isExternal: isExternal,
      page: currentPath,
      timestamp: new Date().toISOString()
    });
    
    // Call callback if provided
    if (onTrack && typeof onTrack === 'function') {
      onTrack(referrerInfo);
    }
  };
  
  // Track on initial page load
  useEffect(() => {
    trackReferrer();
  }, []);
  
  // Track on path changes if enabled
  useEffect(() => {
    if (!trackPathChange) return;
    
    const handleRouteChange = () => {
      trackReferrer();
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, trackPathChange]);
  
  return referrerInfo;
}