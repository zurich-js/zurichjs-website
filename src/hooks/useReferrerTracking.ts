import { useEffect } from 'react';

import useEvents from './useEvents';

interface ReferrerOptions {
  eventName?: string;
  trackOnlyExternal?: boolean;
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
  ignoreDomains = [],
  onTrack = null,
}: ReferrerOptions = {}) {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const { track } = useEvents();

  const referrerInfo: ReferrerInfo = {
    referrer: '',
    isExternal: false,
    currentPath: '',
  };

  const shouldIgnoreDomain = (url: string): boolean => {
    if (!url) return false;
    return ignoreDomains.some((domain) => {
      try {
        return new URL(url).hostname.includes(domain);
      } catch {
        return url.includes(domain);
      }
    });
  };

  const trackReferrer = (): void => {
    if (typeof window === 'undefined') return;

    const referrer = document.referrer;
    const currentPath = window.location.pathname;

    const isExternal = referrer && !referrer.includes(hostname);

    if (trackOnlyExternal && !isExternal) return;
    if (isExternal && shouldIgnoreDomain(referrer)) return;

    referrerInfo.referrer = referrer;
    referrerInfo.isExternal = !!isExternal;
    referrerInfo.currentPath = currentPath;

    track(eventName, {
      referrer: referrer || '(direct)',
      isExternal: !!isExternal,
      page: currentPath,
      timestamp: new Date().toISOString(),
    });

    if (onTrack && typeof onTrack === 'function') {
      onTrack(referrerInfo);
    }
  };

  useEffect(() => {
    trackReferrer();
  }, []);

  return referrerInfo;
}
