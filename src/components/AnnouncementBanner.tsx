import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

import useEvents from '@/hooks/useEvents';
import { Announcement } from '@/sanity/queries';

const ANNOUNCEMENT_STORAGE_KEY = 'zurichjs_announcements';
const DISMISSED_ANNOUNCEMENTS_KEY = 'zurichjs_dismissed_announcements';

type AnnouncementState = {
  isVisible: boolean;
  viewCount: number;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  hasInitialized: boolean;
};

export default function AnnouncementBanner() {
  const { isSignedIn } = useAuth();
  const { track } = useEvents();
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [state, setState] = useState<AnnouncementState>({
    isVisible: false,
    viewCount: 0,
    isLoggedIn: false,
    isLoading: true,
    error: null,
    hasInitialized: false,
  });

  useEffect(() => {
    // Load announcement state from localStorage
    const storedState = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
    if (storedState) {
      setState(prev => ({ ...prev, ...JSON.parse(storedState) }));
    }

    // Update login status based on Clerk
    setState(prev => ({ ...prev, isLoggedIn: isSignedIn ?? false }));

    // Fetch current announcement from API
    const fetchCurrentAnnouncement = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await fetch(`/api/announcements/current?isLoggedIn=${isSignedIn ?? false}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch announcement');
        }

        const announcement = await response.json();

        // Check if this announcement has been dismissed
        const dismissedAnnouncements = JSON.parse(
          localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY) || '[]'
        ) as string[];

        if (announcement && !dismissedAnnouncements.includes(announcement.id)) {
          setCurrentAnnouncement(announcement);
        }
      } catch (error) {
        console.error('Error fetching announcement:', error);
        setState(prev => ({ ...prev, error: 'Failed to load announcement' }));
      } finally {
        setState(prev => ({ ...prev, isLoading: false, hasInitialized: true }));
      }
    };

    fetchCurrentAnnouncement();
  }, [isSignedIn]);

  useEffect(() => {
    if (currentAnnouncement) {
      const now = new Date();
      const { startDate, endDate, requiresLogin } = currentAnnouncement.conditions || {};

      const isWithinDateRange = (!startDate || now >= new Date(startDate)) && 
                               (!endDate || now <= new Date(endDate));
      const meetsLoginRequirement = !requiresLogin || (requiresLogin && state.isLoggedIn);

      setState(prev => ({
        ...prev,
        isVisible: isWithinDateRange && meetsLoginRequirement,
      }));

      // Increment view count when announcement becomes visible
      if (isWithinDateRange && meetsLoginRequirement) {
        setState(prev => ({
          ...prev,
          viewCount: prev.viewCount + 1,
        }));
        
        // Track announcement view
        track('announcement_viewed', {
          announcementId: currentAnnouncement.id,
          announcementType: currentAnnouncement.type,
          title: currentAnnouncement.title,
          isLoggedIn: state.isLoggedIn
        });
      }
    }
  }, [currentAnnouncement, state.isLoggedIn]);

  useEffect(() => {
    // Save state to localStorage whenever it changes
    localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const handleDismiss = () => {
    if (currentAnnouncement) {
      // Add the announcement ID to the dismissed list
      const dismissedAnnouncements = JSON.parse(
        localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY) || '[]'
      ) as string[];
      
      if (!dismissedAnnouncements.includes(currentAnnouncement.id)) {
        dismissedAnnouncements.push(currentAnnouncement.id);
        localStorage.setItem(
          DISMISSED_ANNOUNCEMENTS_KEY,
          JSON.stringify(dismissedAnnouncements)
        );
      }

      // Track announcement dismissal
      track('announcement_dismissed', {
        announcementId: currentAnnouncement.id,
        announcementType: currentAnnouncement.type,
        title: currentAnnouncement.title,
        isLoggedIn: state.isLoggedIn,
        viewCount: state.viewCount,
        wasPreviouslyDismissed: dismissedAnnouncements.includes(currentAnnouncement.id)
      });

      // Hide the announcement
      setState(prev => ({
        ...prev,
        isVisible: false,
      }));
    }
  };

  const handleCTAClick = () => {
    if (currentAnnouncement && currentAnnouncement.cta) {
      // Track CTA click
      track('announcement_cta_clicked', {
        announcementId: currentAnnouncement.id,
        announcementType: currentAnnouncement.type,
        title: currentAnnouncement.title,
        ctaText: currentAnnouncement.cta.text,
        ctaUrl: currentAnnouncement.cta.href,
        isLoggedIn: state.isLoggedIn,
        viewCount: state.viewCount
      });

      // Dismiss the announcement
      handleDismiss();
    }
  };

  // Don't render anything until we've fully initialized
  if (!state.hasInitialized) {
    return null;
  }

  // Only render the banner when we have a valid announcement to display
  if (state.error || !currentAnnouncement || !state.isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full bg-gradient-to-r from-black to-gray-900 text-white border-b border-js/20 shadow-lg"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <motion.div 
                className="flex-shrink-0 text-2xl"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 5
                }}
              >
                {currentAnnouncement.type === 'event' && '🎉'}
                {currentAnnouncement.type === 'promotion' && '🎁'}
                {currentAnnouncement.type === 'workshop' && '🎓'}
                {currentAnnouncement.type === 'general' && '📢'}
              </motion.div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base sm:text-lg leading-tight text-js">
                  {currentAnnouncement.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed mt-1">
                  {currentAnnouncement.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              {currentAnnouncement.cta && (
                <motion.a
                  href={currentAnnouncement.cta.href}
                  onClick={handleCTAClick}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-js text-black rounded-lg text-sm font-semibold hover:bg-js-dark transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap flex items-center gap-2"
                >
                  {currentAnnouncement.cta.text}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.a>
              )}
              <motion.button
                onClick={handleDismiss}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800"
                aria-label="Dismiss announcement"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 