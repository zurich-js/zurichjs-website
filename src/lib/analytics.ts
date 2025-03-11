import { useRouter } from 'next/router';
import { useEffect } from 'react';

// Google Analytics Measurement ID (replace with your actual GA ID)
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

// Initialize Google Analytics
export const initGA = () => {
    if (typeof window === 'undefined' || window.GA_INITIALIZED) return;

    // Add Google Analytics script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize Google Analytics
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        window.dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', GA_TRACKING_ID, {
        page_path: window.location.pathname,
    });

    window.GA_INITIALIZED = true;
};

// Log page views
export const logPageView = () => {
    // if (typeof window === 'undefined' || !window.GA_INITIALIZED) return;

    // window.gtag('config', GA_TRACKING_ID, {
    //     page_path: window.location.pathname,
    //     page_title: document.title,
    // });
};

// Log events
export const logEvent = ({ action, category, label, value }) => {
    // if (typeof window === 'undefined' || !window.GA_INITIALIZED) return;

    // window.gtag('event', action, {
    //     event_category: category,
    //     event_label: label,
    //     value: value,
    // });
};

// Custom hook to track page views
export const useAnalytics = () => {
    const router = useRouter();

    useEffect(() => {
        // Initialize Google Analytics
        if (!window.GA_INITIALIZED) {
            initGA();
        }

        // Track page views on route change
        const handleRouteChange = (url) => {
            logPageView();
        };

        router.events.on('routeChangeComplete', handleRouteChange);
        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [router.events]);

    return {
        logEvent,
    };
};

// Helper functions for common event tracking
export const trackEvents = {
    // Track clicking on event registration
    trackEventRegistration: (eventTitle, eventId) => {
        logEvent({
            action: 'register_for_event',
            category: 'Events',
            label: eventTitle,
            value: eventId,
        });
    },

    // Track CFP submissions
    trackCFPSubmission: (talkTitle, speakerName) => {
        logEvent({
            action: 'cfp_submission',
            category: 'Call for Papers',
            label: talkTitle,
            value: speakerName,
        });
    },

    // Track newsletter signups
    trackNewsletterSignup: (source) => {
        logEvent({
            action: 'newsletter_signup',
            category: 'Engagement',
            label: source || 'website',
        });
    },

    // Track social media clicks
    trackSocialClick: (platform) => {
        logEvent({
            action: 'social_click',
            category: 'Social',
            label: platform,
        });
    },

    // Track partnership inquiry
    trackPartnershipInquiry: (companyName) => {
        logEvent({
            action: 'partnership_inquiry',
            category: 'Partnerships',
            label: companyName,
        });
    },

    // Track content engagement
    trackContentEngagement: (contentType, contentId, action = 'view') => {
        logEvent({
            action: `content_${action}`,
            category: 'Content',
            label: contentType,
            value: contentId,
        });
    },

    // Track speaker profile views
    trackSpeakerView: (speakerName, speakerId) => {
        logEvent({
            action: 'speaker_view',
            category: 'Speakers',
            label: speakerName,
            value: speakerId,
        });
    },

    // Track talk views
    trackTalkView: (talkTitle, talkId) => {
        logEvent({
            action: 'talk_view',
            category: 'Talks',
            label: talkTitle,
            value: talkId,
        });
    },

    // Track file downloads (slides, etc.)
    trackDownload: (fileType, fileName) => {
        logEvent({
            action: 'download',
            category: 'Downloads',
            label: fileType,
            value: fileName,
        });
    },

    // Track search queries
    trackSearch: (query) => {
        logEvent({
            action: 'search',
            category: 'Search',
            label: query,
        });
    },
};

// Enhanced Link Attribution for better click tracking
export const enhanceLinks = () => {
    if (typeof window === 'undefined' || !window.GA_INITIALIZED) return;

    // window.gtag('config', GA_TRACKING_ID, {
    //     link_attribution: {
    //         cookie_name: '_gaLinkAttribution',
    //         cookie_expires: 60,
    //         cookie_domain: window.location.hostname,
    //     },
    // });
};

// Initialize full analytics system
export const initializeAnalytics = () => {
    if (typeof window === 'undefined' || window.ANALYTICS_INITIALIZED) return;

    // Initialize GA
    initGA();

    // Enable enhanced link attribution
    enhanceLinks();

    // Track initial page view
    logPageView();

    // Mark analytics as initialized
    window.ANALYTICS_INITIALIZED = true;
};


/**
 * Track partnership inquiries in Google Analytics
 * Helps us understand which companies are interested in supporting our JS community! 🚀
 * 
 * @param {string} companyName - The name of the company making the inquiry
 * @param {object} additionalData - Optional additional data about the inquiry
 */
export const trackPartnershipInquiry = (companyName, additionalData = {}) => {
  if (typeof window === 'undefined' || !window.GA_INITIALIZED) return;
  
  // Log the partnership inquiry event to Google Analytics
  window.gtag('event', 'partnership_inquiry', {
    event_category: 'Partnerships',
    event_label: companyName,
    company_name: companyName,
    partnership_page: window.location.pathname,
    timestamp: new Date().toISOString(),
    ...additionalData
  });
  
  // Log to console in development environment
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Tracked partnership inquiry from: ${companyName}`);
  }
  
  // If you're using other analytics platforms like Mixpanel, add them here
  if (window.mixpanel) {
    window.mixpanel.track('Partnership Inquiry', {
      company: companyName,
      source: 'Partnership Page',
      ...additionalData
    });
  }
};

/**
 * Track partnership tier view events
 * See which partnership tiers get the most attention! 💰
 * 
 * @param {string} tierName - The partnership tier being viewed
 */
export const trackPartnershipTierView = (tierName) => {
  if (typeof window === 'undefined' || !window.GA_INITIALIZED) return;
  
  window.gtag('event', 'partnership_tier_view', {
    event_category: 'Partnerships',
    event_label: tierName,
    tier_name: tierName
  });
};

/**
 * Track form submissions for partnership inquiries
 * 
 * @param {string} companyName - The name of the company
 * @param {string} tierInterest - The partnership tier they're interested in
 * @param {boolean} success - Whether the submission was successful
 */
export const trackPartnershipFormSubmission = (companyName, tierInterest, success = true) => {
  if (typeof window === 'undefined' || !window.GA_INITIALIZED) return;
  
  window.gtag('event', 'partnership_form_submission', {
    event_category: 'Forms',
    event_label: companyName,
    tier_interest: tierInterest,
    success: success
  });
  
  // If you have conversion tracking set up, you can trigger that here
  if (success) {
    window.gtag('event', 'conversion', {
      'send_to': process.env.NEXT_PUBLIC_GA_CONVERSION_ID,
      'event_callback': function() {
        console.log('Partnership inquiry conversion tracked! 🎉');
      }
    });
  }
};

/**
 * Track clicking on existing partner logos
 * 
 * @param {string} partnerName - The name of the partner clicked
 */
export const trackPartnerLogoClick = (partnerName) => {
  if (typeof window === 'undefined' || !window.GA_INITIALIZED) return;
  
//   window.gtag('event', 'partner_logo_click', {
//     event_category: 'Engagement',
//     event_label: partnerName,
//     partner_name: partnerName,
//     outbound: true
//   });
};

// Connect these tracking functions to your partnerships page with these hooks:

// In your partnership card component:
const handlePartnerTierClick = (tierName) => {
  trackPartnershipTierView(tierName);
  // Rest of your click handler...
};

// In your form submission handler:
const handleSubmit = (e) => {
  e.preventDefault();
  
  // Form validation...
  
  // Track the inquiry
  trackPartnershipInquiry(formState.companyName, {
    tier_interest: formState.tierInterest,
    has_message: formState.message.length > 0
  });
  
  // Track the form submission
  trackPartnershipFormSubmission(
    formState.companyName, 
    formState.tierInterest, 
    true
  );
  
  // Rest of your form submission logic...
};

// For partner logo clicks:
const handlePartnerLogoClick = (partnerName) => {
  trackPartnerLogoClick(partnerName);
  // Continue with navigation...
};