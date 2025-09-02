import { useUser } from '@clerk/nextjs';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Star, CheckCircle, Calendar, Send, Sparkles, TrendingUp, Heart, Settings, LogIn, Gift } from 'lucide-react';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import { Workshop } from '@/components/sections/UpcomingWorkshops';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import { getWorkshops } from '@/data/workshops';
import useEvents from '@/hooks/useEvents';
import { useReferrals } from '@/hooks/useReferrals';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import { getTestModeConfig, getCurrentDate, formatTestDate, TEST_SCENARIOS } from '@/lib/testMode';
import { getRecentPastEventsForFeedback, getUpcomingEventsForTestScenarios, Event } from '@/sanity/queries';

interface FeedbackFormState {
  selectedEventId: string;
  overallRating: number;
  foodOptions: {
    rating: number;
    comments: string;
  };
  drinks: {
    rating: number;
    comments: string;
  };
  talks: {
    rating: number;
    comments: string;
  };
  timing: {
    rating: number;
    comments: string;
  };
  execution: {
    rating: number;
    comments: string;
  };
  improvements: string;
  futureTopics: string;
  worthTime: 'definitely' | 'mostly' | 'somewhat' | 'not_really' | '';
  wouldRecommend: 'definitely' | 'probably' | 'maybe' | 'unlikely' | '';
  dealOfDay: {
    rating: number;
    comments: string;
  };
  additionalComments: string;
  submitted: boolean;
  isSubmitting: boolean;
  error: string;
}

interface ValidationErrors {
  selectedEvent?: string;
  overallRating?: string;
  worthTime?: string;
  wouldRecommend?: string;
}

interface FeedbackProps {
  recentEvents: Event[];
  upcomingEvents: Event[];
  testDate?: string;
}

// Helper function to get recent workshops within the 30-day window
function getRecentWorkshops(testDate?: string): (Workshop & { type: 'workshop' })[] {
  const currentDate = testDate ? new Date(testDate) : new Date();
  const thirtyDaysAgo = new Date(currentDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return getWorkshops()
    .filter(workshop => {
      // Parse dateInfo (e.g., "September 9th, 2025" or "July 23, 2025")
      try {
        const workshopDate = new Date(workshop.dateInfo);
        return workshopDate >= thirtyDaysAgo && workshopDate <= currentDate && workshop.state === 'confirmed';
      } catch {
        return false; // Skip workshops with unparseable dates
      }
    })
    .map(workshop => ({ ...workshop, type: 'workshop' as const }));
}

export default function EventFeedback({ recentEvents, upcomingEvents, testDate }: FeedbackProps) {
  useReferrerTracking();
  const { track } = useEvents();
  const { user, isLoaded } = useUser();
  const { addCredits } = useReferrals();

  // Combine events and workshops for selection
  const recentWorkshops = getRecentWorkshops(testDate);
  const allSelectableEvents = [
    ...recentEvents.map(event => ({ ...event, type: 'event' as const })),
    ...recentWorkshops
  ].sort((a, b) => {
    const aDate = a.type === 'event' ? new Date(a.datetime) : new Date(a.dateInfo);
    const bDate = b.type === 'event' ? new Date(b.datetime) : new Date(b.dateInfo);
    return bDate.getTime() - aDate.getTime();
  });

  const [formState, setFormState] = useState<FeedbackFormState>({
    selectedEventId: '',
    overallRating: 0,
    foodOptions: { rating: 0, comments: '' },
    drinks: { rating: 0, comments: '' },
    talks: { rating: 0, comments: '' },
    timing: { rating: 0, comments: '' },
    execution: { rating: 0, comments: '' },
    improvements: '',
    futureTopics: '',
    worthTime: '',
    wouldRecommend: '',
    dealOfDay: { rating: 0, comments: '' },
    additionalComments: '',
    submitted: false,
    isSubmitting: false,
    error: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [testModeOpen, setTestModeOpen] = useState(false);
  const [testCurrentDate, setTestCurrentDate] = useState<string>(testDate || '');
  const [isApplying, setIsApplying] = useState(false);
  const [creditsAwarded, setCreditsAwarded] = useState(false);
  const testModeConfig = getTestModeConfig(testDate);

  // Auto-select the most recent event/workshop if available
  useEffect(() => {
    if (allSelectableEvents.length > 0 && !formState.selectedEventId) {
      const mostRecent = allSelectableEvents[0];
      setFormState(prev => ({ ...prev, selectedEventId: mostRecent.id }));
      track('feedback_auto_event_selected', {
        eventId: mostRecent.id,
        eventTitle: mostRecent.title,
        eventType: mostRecent.type
      });
    }
  }, [allSelectableEvents, formState.selectedEventId, track]);

  const selectedEvent = allSelectableEvents.find(item => item.id === formState.selectedEventId);

  const handleEventChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const itemId = e.target.value;
    setFormState(prev => ({ ...prev, selectedEventId: itemId }));
    
    if (itemId) {
      const item = allSelectableEvents.find(e => e.id === itemId);
      track('feedback_event_selected', {
        eventId: itemId,
        eventTitle: item?.title || 'Unknown',
        eventType: item?.type || 'unknown'
      });
    }

    if (validationErrors.selectedEvent) {
      setValidationErrors(prev => ({ ...prev, selectedEvent: undefined }));
    }
  };

  const handleOverallRatingClick = (rating: number) => {
    setFormState(prev => ({ ...prev, overallRating: rating }));
    track('feedback_overall_rating_selected', {
      rating: rating,
      eventId: formState.selectedEventId
    });

    if (validationErrors.overallRating) {
      setValidationErrors(prev => ({ ...prev, overallRating: undefined }));
    }
  };

  const handleAspectRatingClick = (aspect: keyof Pick<FeedbackFormState, 'foodOptions' | 'drinks' | 'talks' | 'timing' | 'execution'>, rating: number) => {
    setFormState(prev => ({
      ...prev,
      [aspect]: { ...prev[aspect], rating: rating }
    }));
    
    track('feedback_aspect_rating_selected', {
      aspect: aspect,
      rating: rating,
      eventId: formState.selectedEventId
    });
  };

  const handleAspectCommentChange = (aspect: keyof Pick<FeedbackFormState, 'foodOptions' | 'drinks' | 'talks' | 'timing' | 'execution'>, comments: string) => {
    setFormState(prev => ({
      ...prev,
      [aspect]: { ...prev[aspect], comments: comments }
    }));
  };

  const handleSelectChange = (field: 'worthTime' | 'wouldRecommend', value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleTextChange = (field: 'improvements' | 'futureTopics' | 'additionalComments', value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!formState.selectedEventId) {
      errors.selectedEvent = 'Please select an event';
    }
    
    if (!formState.overallRating || formState.overallRating < 1) {
      errors.overallRating = 'Please provide an overall rating';
    }
    
    if (!formState.worthTime) {
      errors.worthTime = 'Please let us know if the event was worth your time';
    }
    
    if (!formState.wouldRecommend) {
      errors.wouldRecommend = 'Please let us know if you would recommend this event';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isHelpfulFeedback = (): boolean => {
    // Consider feedback helpful if user provides:
    // 1. At least 3 aspect ratings
    // 2. Some meaningful text feedback (improvements or future topics)
    // 3. Rating of at least 2 stars overall
    
    const aspectRatings = [
      formState.foodOptions.rating,
      formState.drinks.rating,
      formState.talks.rating,
      formState.timing.rating,
      formState.execution.rating
    ];
    
    const ratedAspects = aspectRatings.filter(rating => rating > 0).length;
    const hasMeaningfulText = formState.improvements.trim().length > 10 || 
                              formState.futureTopics.trim().length > 10 ||
                              formState.additionalComments.trim().length > 20;
    
    return ratedAspects >= 3 && hasMeaningfulText && formState.overallRating >= 2;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      track('feedback_validation_failed', {
        errors: Object.keys(validationErrors).join(', ')
      });
      setFormState(prev => ({ ...prev, error: 'Please fix the highlighted errors below' }));
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true, error: '' }));

    try {
      const response = await fetch('/api/event-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: formState.selectedEventId,
          overallRating: formState.overallRating,
          foodOptions: formState.foodOptions,
          drinks: formState.drinks,
          talks: formState.talks,
          timing: formState.timing,
          execution: formState.execution,
          improvements: formState.improvements,
          futureTopics: formState.futureTopics,
          worthTime: formState.worthTime,
          wouldRecommend: formState.wouldRecommend,
          dealOfDay: formState.dealOfDay,
          additionalComments: formState.additionalComments,
          submittedAt: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An error occurred while submitting your feedback');
      }

      track('event_feedback_submitted_successfully', {
        eventId: formState.selectedEventId,
        overallRating: formState.overallRating,
        worthTime: formState.worthTime,
        wouldRecommend: formState.wouldRecommend
      });

      // Award credits for helpful feedback if user is logged in
      if (user && isHelpfulFeedback()) {
        try {
          await addCredits(20);
          setCreditsAwarded(true);
          track('feedback_credits_awarded', {
            eventId: formState.selectedEventId,
            creditsAwarded: 20
          });
        } catch (error) {
          console.error('Error awarding credits:', error);
        }
      }

      setFormState(prev => ({
        ...prev,
        submitted: true,
        isSubmitting: false,
        error: ''
      }));

    } catch (error: unknown) {
      console.error('Feedback submission error:', error);

      track('event_feedback_submission_error', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'An error occurred while submitting your feedback'
      }));
    }
  };

  const RatingStars = ({ 
    rating, 
    onRatingClick, 
    hoveredRating, 
    onHover, 
    onLeave,
    size = 32 
  }: { 
    rating: number; 
    onRatingClick: (rating: number) => void; 
    hoveredRating?: number;
    onHover?: (rating: number) => void;
    onLeave?: () => void;
    size?: number;
  }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingClick(star)}
          onMouseEnter={() => onHover?.(star)}
          onMouseLeave={() => onLeave?.()}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={size}
            className={`${
              star <= (hoveredRating || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );

  const getRatingText = (rating: number) => {
    const ratings = {
      1: "Poor",
      2: "Fair", 
      3: "Good",
      4: "Very Good",
      5: "Excellent"
    };
    return ratings[rating as keyof typeof ratings] || "";
  };

  return (
    <Layout>
      <SEO
        title="Share Your Event Feedback | ZurichJS"
        description="Help us improve by sharing your thoughts on our recent workshops and meetups. Your feedback makes our community better!"
        openGraph={{
          title: "Share Your Event Feedback | ZurichJS",
          description: "Help us improve by sharing your thoughts on our recent workshops and meetups. Your feedback makes our community better!",
          image: "/api/og/contact",
          type: "website"
        }}
      />

      {/* Hero Section */}
      <Section variant="gradient" padding="lg">
        <div className="flex flex-col md:flex-row items-center lg:mt-20">
          <div className="md:w-1/2 mb-10 md:mb-0 mr-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-3 md:mb-4">
                Share Your Event Feedback 💭
              </h1>
              <p className="text-lg md:text-xl mb-4 md:mb-6 font-medium">
                Help us make ZurichJS events even better for our amazing community!
              </p>
              <p className="text-base md:text-lg mb-4 md:mb-6">
                Your comprehensive feedback helps us improve everything from talks and timing 
                to food and drinks. Whether it&apos;s suggestions for future topics or improvements 
                to event execution - we want to hear from you!
              </p>

              <div className="bg-js/20 backdrop-blur rounded-lg p-4 mb-6 md:mb-8 border border-js/30">
                <p className="text-sm md:text-base font-medium text-black">
                  ✨ <strong>Your voice shapes our events!</strong> We use this feedback to plan better 
                  venues, improve catering, adjust timing, and curate content that matters to you.
                </p>
              </div>

              {/* Login/Credits Information */}
              {!user && isLoaded && (
                <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg p-4 mb-6 md:mb-8 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <Gift className="w-5 h-5 text-purple-600 mr-2" />
                    <h3 className="font-bold text-gray-900">Earn Rewards for Your Feedback!</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    Login with your account and get rewarded <strong>20 credits</strong> for providing helpful feedback. 
                    Use credits for workshop discounts, free event tickets, ZurichJS merch, and more!
                  </p>
                  <Button
                    href="/profile"
                    variant="outline"
                    className="text-purple-700 border-purple-300 hover:bg-purple-50 text-sm"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Login to Earn Credits
                  </Button>
                </div>
              )}

              {user && (
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-4 mb-6 md:mb-8 border border-green-200">
                  <div className="flex items-center mb-2">
                    <Gift className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="font-bold text-gray-900">Welcome back, {user.firstName || user.username}!</h3>
                  </div>
                  <p className="text-sm text-gray-700">
                    Provide helpful feedback and earn <strong>20 credits</strong> that you can redeem for workshop discounts, 
                    free event tickets, and exclusive ZurichJS merchandise.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Button
                  href="#form"
                  variant="primary"
                  size="lg"
                  className="bg-black hover:bg-gray-800 text-white font-bold cursor-pointer transition-all duration-200"
                  onClick={() => {
                    document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' });
                    track('skip_to_form_hero', {});
                  }}
                >
                  Share Feedback 🌟
                </Button>
              </div>
            </motion.div>
          </div>
          <div className="md:w-1/2">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white p-8 rounded-lg shadow-lg"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-start">
                  <Heart className="text-yellow-500 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold">Shape Future Events</h3>
                    <p className="text-gray-600 text-sm">Your feedback directly influences our venue choices, catering, and content</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <TrendingUp className="text-yellow-500 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold">Continuous Improvement</h3>
                    <p className="text-gray-600 text-sm">Help us understand what works and what could be better</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Sparkles className="text-yellow-500 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold">Community-Driven</h3>
                    <p className="text-gray-600 text-sm">Be part of making ZurichJS the best developer community in Zurich</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* Test Mode Controls (Development Only) */}
      {testModeConfig.enabled && (
        <Section variant="white" padding="sm">
          <div className="max-w-4xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Settings className="text-yellow-600 mr-2" size={20} />
                  <span className="font-semibold text-yellow-800">🧪 Test Mode (Development)</span>
                </div>
                <button
                  onClick={() => setTestModeOpen(!testModeOpen)}
                  className="text-sm text-yellow-700 hover:text-yellow-800 underline"
                >
                  {testModeOpen ? 'Hide Controls' : 'Show Controls'}
                </button>
              </div>
              
              {testModeOpen && (
                <div className="space-y-4">
                  <div className="text-sm text-yellow-700">
                    <div className="mb-3 p-3 bg-yellow-100 rounded-md border border-yellow-300">
                      <p className="font-semibold mb-1">
                        📅 Current Test Date: {formatTestDate(getCurrentDate())} 
                        {testModeConfig.currentDate ? ' (Simulated)' : ' (Real/Live)'}
                      </p>
                      <div className="text-xs space-y-1">
                        <p>• <strong>Events shown for feedback:</strong> {recentEvents.length}</p>
                        <p>• <strong>Available upcoming events:</strong> {upcomingEvents.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-yellow-800 mb-2">
                        Set Custom Date:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={testCurrentDate}
                          onChange={(e) => setTestCurrentDate(e.target.value)}
                          className="flex-1 px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                        />
                        <button
                          onClick={async () => {
                            if (testCurrentDate) {
                              setIsApplying(true);
                              const url = new URL(window.location.href);
                              url.searchParams.set('testDate', testCurrentDate);
                              window.location.href = url.toString();
                            }
                          }}
                          disabled={!testCurrentDate || isApplying}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm transition-colors"
                        >
                          {isApplying ? 'Applying...' : 'Apply'}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-yellow-800 mb-2">
                        Quick Scenarios:
                      </label>
                      <div className="space-y-1">
                        {upcomingEvents.length > 0 ? (
                          <>
                            {Object.entries(TEST_SCENARIOS).map(([key, scenario]) => {
                              const nearestEvent = upcomingEvents[0];
                              const eventDate = new Date(nearestEvent.datetime);
                              const testDate = scenario.getDaysOffset(eventDate);
                              
                              return (
                                <button
                                  key={key}
                                  onClick={async () => {
                                    setIsApplying(true);
                                    const url = new URL(window.location.href);
                                    url.searchParams.set('testDate', formatTestDate(testDate));
                                    window.location.href = url.toString();
                                  }}
                                  disabled={isApplying}
                                  className="block w-full text-left px-3 py-2 text-sm bg-white border border-yellow-300 rounded hover:bg-yellow-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {scenario.name}
                                </button>
                              );
                            })}
                          </>
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50 rounded border border-gray-200">
                            No upcoming events found.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Feedback Form */}
      <Section variant="gray" id="form">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Your Event Experience Matters</h2>
            <p className="text-gray-600">
              {allSelectableEvents.length > 0 
                ? `We found ${allSelectableEvents.length} recent event${allSelectableEvents.length === 1 ? '' : 's'} and workshop${allSelectableEvents.filter(e => e.type === 'workshop').length !== 1 ? 's' : ''} you can provide feedback on!`
                : "We'll help you find a recent event or workshop to provide feedback on."
              }
            </p>
          </div>

          {allSelectableEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-8 rounded-lg text-center"
            >
              <Calendar size={48} className="mx-auto mb-4 text-yellow-500" />
              <h3 className="text-xl font-bold mb-2">No Recent Events or Workshops Found</h3>
              <p className="mb-4">
                It looks like there haven&apos;t been any events or workshops in the last 30 days that you can provide feedback on.
              </p>
              <p className="text-sm mb-6">
                Check back after our next meetup or workshop, or contact us directly if you&apos;d like to share feedback about an older event.
              </p>
              <Button href="/contact" variant="secondary">
                Contact Us Directly
              </Button>
            </motion.div>
          ) : formState.submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 border border-green-200 text-green-700 p-8 rounded-lg text-center"
            >
              <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
              <h3 className="text-2xl font-bold mb-2">Thank You for Your Comprehensive Feedback!</h3>
              <p className="mb-4">
                Your detailed feedback has been submitted successfully and will help us improve future events.
                We really appreciate you taking the time to share your thoughts on all aspects of our event!
              </p>
              
              {/* Credits Reward Message */}
              {user && creditsAwarded && (
                <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-4 mb-6 border border-yellow-200">
                  <div className="flex items-center justify-center mb-2">
                    <Gift className="w-6 h-6 text-yellow-600 mr-2" />
                    <h4 className="font-bold text-gray-900">🎉 Credits Earned!</h4>
                  </div>
                  <p className="text-sm text-gray-700">
                    You&apos;ve earned <strong>20 credits</strong> for providing helpful feedback! 
                    Visit your <Link href="/profile/rewards" className="text-yellow-700 underline hover:text-yellow-800">rewards page</Link> to redeem them for workshop discounts, free event tickets, and ZurichJS merchandise.
                  </p>
                </div>
              )}

              {user && !creditsAwarded && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> Provide more detailed ratings and feedback next time to earn 20 credits!
                    Credits can be redeemed for workshop discounts and exclusive merchandise.
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button href="/" variant="secondary">
                  Return to Homepage
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormState({
                      selectedEventId: '',
                      overallRating: 0,
                      foodOptions: { rating: 0, comments: '' },
                      drinks: { rating: 0, comments: '' },
                      talks: { rating: 0, comments: '' },
                      timing: { rating: 0, comments: '' },
                      execution: { rating: 0, comments: '' },
                      improvements: '',
                      futureTopics: '',
                      worthTime: '',
                      wouldRecommend: '',
                      dealOfDay: { rating: 0, comments: '' },
                      additionalComments: '',
                      submitted: false,
                      isSubmitting: false,
                      error: '',
                    });
                    setValidationErrors({});
                    track('event_feedback_form_reset', {});
                  }}
                >
                  Submit More Feedback
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onSubmit={handleSubmit}
              className="bg-white p-8 rounded-lg shadow-md"
            >
              {formState.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">{formState.error}</p>
                </div>
              )}

              {/* Event Selection */}
              <div className="mb-8">
                <label htmlFor="event" className="block text-gray-700 mb-2 font-semibold">
                  Which event would you like to provide feedback on? *
                </label>
                <select
                  id="event"
                  value={formState.selectedEventId}
                  onChange={handleEventChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                    validationErrors.selectedEvent 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-js'
                  }`}
                  required
                >
                  <option value="">Select an event or workshop...</option>
                  {allSelectableEvents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.type === 'workshop' ? '🎓 ' : '🎯 '}{item.title} - {
                        item.type === 'event' 
                          ? format(new Date(item.datetime), 'MMM d, yyyy')
                          : format(new Date(item.dateInfo), 'MMM d, yyyy')
                      }
                    </option>
                  ))}
                </select>
                {validationErrors.selectedEvent && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.selectedEvent}</p>
                )}
              </div>

              {/* Overall Rating */}
              {selectedEvent && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="bg-js text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
                    Overall Event Rating *
                  </h3>
                  <p className="text-gray-600 mb-4">How would you rate your overall experience at this event?</p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <RatingStars
                      rating={formState.overallRating}
                      onRatingClick={handleOverallRatingClick}
                      hoveredRating={hoveredStar}
                      onHover={setHoveredStar}
                      onLeave={() => setHoveredStar(0)}
                    />
                    {(hoveredStar > 0 || formState.overallRating > 0) && (
                      <span className="text-sm text-gray-600 font-medium">
                        {getRatingText(hoveredStar || formState.overallRating)}
                      </span>
                    )}
                  </div>
                  {validationErrors.overallRating && (
                    <p className="mt-2 text-sm text-red-600">{validationErrors.overallRating}</p>
                  )}
                </div>
              )}

              {/* Aspect Ratings */}
              {selectedEvent && formState.overallRating > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="bg-js text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
                    Event Aspects
                  </h3>
                  <p className="text-gray-600 mb-6">Please rate different aspects of the event (optional comments welcome!)</p>
                  
                  <div className="space-y-6">
                    {/* Food Options */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-gray-700 mb-3 font-semibold">🍕 Food Options</label>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex flex-col items-start gap-2">
                          <RatingStars
                            rating={formState.foodOptions.rating}
                            onRatingClick={(rating) => handleAspectRatingClick('foodOptions', rating)}
                            size={24}
                          />
                          {formState.foodOptions.rating > 0 && (
                            <span className="text-xs text-gray-600">
                              {getRatingText(formState.foodOptions.rating)}
                            </span>
                          )}
                        </div>
                        <textarea
                          placeholder="Any comments about the food options? (optional)"
                          value={formState.foodOptions.comments}
                          onChange={(e) => handleAspectCommentChange('foodOptions', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js text-sm"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Drinks */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-gray-700 mb-3 font-semibold">🍻 Drinks</label>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex flex-col items-start gap-2">
                          <RatingStars
                            rating={formState.drinks.rating}
                            onRatingClick={(rating) => handleAspectRatingClick('drinks', rating)}
                            size={24}
                          />
                          {formState.drinks.rating > 0 && (
                            <span className="text-xs text-gray-600">
                              {getRatingText(formState.drinks.rating)}
                            </span>
                          )}
                        </div>
                        <textarea
                          placeholder="Any comments about the drink selection? (optional)"
                          value={formState.drinks.comments}
                          onChange={(e) => handleAspectCommentChange('drinks', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js text-sm"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Talks */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-gray-700 mb-3 font-semibold">🎤 Talks & Content</label>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex flex-col items-start gap-2">
                          <RatingStars
                            rating={formState.talks.rating}
                            onRatingClick={(rating) => handleAspectRatingClick('talks', rating)}
                            size={24}
                          />
                          {formState.talks.rating > 0 && (
                            <span className="text-xs text-gray-600">
                              {getRatingText(formState.talks.rating)}
                            </span>
                          )}
                        </div>
                        <textarea
                          placeholder="How were the talks? Quality, relevance, speakers... (optional)"
                          value={formState.talks.comments}
                          onChange={(e) => handleAspectCommentChange('talks', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js text-sm"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Timing */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-gray-700 mb-3 font-semibold">⏰ Timing & Schedule</label>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex flex-col items-start gap-2">
                          <RatingStars
                            rating={formState.timing.rating}
                            onRatingClick={(rating) => handleAspectRatingClick('timing', rating)}
                            size={24}
                          />
                          {formState.timing.rating > 0 && (
                            <span className="text-xs text-gray-600">
                              {getRatingText(formState.timing.rating)}
                            </span>
                          )}
                        </div>
                        <textarea
                          placeholder="How was the event timing? Duration, breaks, schedule... (optional)"
                          value={formState.timing.comments}
                          onChange={(e) => handleAspectCommentChange('timing', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js text-sm"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Execution */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-gray-700 mb-3 font-semibold">🎯 Overall Execution</label>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex flex-col items-start gap-2">
                          <RatingStars
                            rating={formState.execution.rating}
                            onRatingClick={(rating) => handleAspectRatingClick('execution', rating)}
                            size={24}
                          />
                          {formState.execution.rating > 0 && (
                            <span className="text-xs text-gray-600">
                              {getRatingText(formState.execution.rating)}
                            </span>
                          )}
                        </div>
                        <textarea
                          placeholder="How was the event organization? Venue, flow, logistics... (optional)"
                          value={formState.execution.comments}
                          onChange={(e) => handleAspectCommentChange('execution', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js text-sm"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Value & Recommendations */}
              {selectedEvent && formState.overallRating > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="bg-js text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</span>
                    Value & Recommendation
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-700 mb-2 font-semibold">
                        Was this event worth your time? *
                      </label>
                      <select
                        value={formState.worthTime}
                        onChange={(e) => handleSelectChange('worthTime', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          validationErrors.worthTime 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-js'
                        }`}
                        required
                      >
                        <option value="">Select an option...</option>
                        <option value="definitely">Definitely - Great use of my time!</option>
                        <option value="mostly">Mostly - I learned something valuable</option>
                        <option value="somewhat">Somewhat - It was okay</option>
                        <option value="not_really">Not really - Could have been better</option>
                      </select>
                      {validationErrors.worthTime && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.worthTime}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-semibold">
                        Would you recommend this type of event to a friend? *
                      </label>
                      <select
                        value={formState.wouldRecommend}
                        onChange={(e) => handleSelectChange('wouldRecommend', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                          validationErrors.wouldRecommend 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-js'
                        }`}
                        required
                      >
                        <option value="">Select an option...</option>
                        <option value="definitely">Definitely - I&apos;d actively recommend it</option>
                        <option value="probably">Probably - If they&apos;re interested in the topic</option>
                        <option value="maybe">Maybe - It depends on their interests</option>
                        <option value="unlikely">Unlikely - It wasn&apos;t for me</option>
                      </select>
                      {validationErrors.wouldRecommend && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.wouldRecommend}</p>
                      )}
                    </div>

                    {/* Deal of the Day Feedback */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                      <h4 className="text-lg font-bold mb-3 text-gray-900 flex items-center">
                        💰 Deal of the Day Feedback
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        We often provide discount codes for upcoming paid events. How satisfied were you with our promotional offers?
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-700 mb-2 font-semibold">
                            Rate our promotional offers/discounts:
                          </label>
                          <div className="flex items-center space-x-1 mb-2">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                onClick={() => setFormState(prev => ({
                                  ...prev,
                                  dealOfDay: { ...prev.dealOfDay, rating }
                                }))}
                                className="focus:outline-none transition-colors duration-150"
                              >
                                <Star
                                  size={32}
                                  className={`${
                                    rating <= formState.dealOfDay.rating
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  } hover:text-yellow-400`}
                                />
                              </button>
                            ))}
                            <span className="ml-2 text-gray-600 text-sm">
                              {formState.dealOfDay.rating > 0 ? `${formState.dealOfDay.rating}/5` : '0/5'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="dealOfDayComments" className="block text-gray-700 mb-2 font-semibold">
                            Comments about our deals/discounts (optional):
                          </label>
                          <textarea
                            id="dealOfDayComments"
                            value={formState.dealOfDay.comments}
                            onChange={(e) => setFormState(prev => ({
                              ...prev,
                              dealOfDay: { ...prev.dealOfDay, comments: e.target.value }
                            }))}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Tell us about our discount offers, promotion timing, value for money, etc."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Improvements & Future Topics */}
              {selectedEvent && formState.worthTime && formState.wouldRecommend && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="bg-js text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">4</span>
                    Help Us Improve
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="improvements" className="block text-gray-700 mb-2 font-semibold">
                        What could we improve for future events?
                      </label>
                      <textarea
                        id="improvements"
                        value={formState.improvements}
                        onChange={(e) => handleTextChange('improvements', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-js"
                        placeholder="Share your suggestions for improvements - venue, catering, format, content, networking opportunities, etc."
                      />
                    </div>

                    <div>
                      <label htmlFor="futureTopics" className="block text-gray-700 mb-2 font-semibold">
                        What topics would you like to see in future events?
                      </label>
                      <textarea
                        id="futureTopics"
                        value={formState.futureTopics}
                        onChange={(e) => handleTextChange('futureTopics', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-js"
                        placeholder="What technologies, frameworks, practices, or industry topics would you like to hear about? Any specific speakers you'd love to see?"
                      />
                    </div>

                    <div>
                      <label htmlFor="additionalComments" className="block text-gray-700 mb-2 font-semibold">
                        Additional Comments
                      </label>
                      <textarea
                        id="additionalComments"
                        value={formState.additionalComments}
                        onChange={(e) => handleTextChange('additionalComments', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-js"
                        placeholder="Anything else you'd like to share about your experience?"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {selectedEvent && formState.worthTime && formState.wouldRecommend && (
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={formState.isSubmitting}
                    className="min-w-[200px]"
                  >
                    {formState.isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2" size={18} />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.form>
          )}
        </motion.div>
      </Section>
    </Layout>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    // Handle test mode date override
    let testCurrentDate: Date | undefined;
    const testDateParam = context.query.testDate;
    const testDateString = Array.isArray(testDateParam) ? testDateParam[0] : testDateParam;
    
    if (process.env.NODE_ENV === 'development' && testDateString) {
      try {
        testCurrentDate = new Date(testDateString);
        if (isNaN(testCurrentDate.getTime())) {
          console.warn('Invalid test date provided in URL, falling back to current date');
          testCurrentDate = undefined;
        }
      } catch (error) {
        console.warn('Failed to parse test date from URL, falling back to current date:', error);
        testCurrentDate = undefined;
      }
    }
    
    // Fetch both recent events (for feedback) and upcoming events (for test scenarios)
    const [recentEvents, upcomingEvents] = await Promise.all([
      getRecentPastEventsForFeedback(testCurrentDate),
      process.env.NODE_ENV === 'development' ? getUpcomingEventsForTestScenarios() : Promise.resolve([])
    ]);

    return {
      props: {
        recentEvents,
        upcomingEvents,
        testDate: testDateString || null,
      },
    };
  } catch (error) {
    console.error('Error fetching events:', error);
    
    return {
      props: {
        recentEvents: [],
        upcomingEvents: [],
        testDate: null,
      },
    };
  }
}