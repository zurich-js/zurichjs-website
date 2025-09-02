import { useUser, SignInButton } from '@clerk/nextjs';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Star, CheckCircle, Calendar, Send, Sparkles, TrendingUp, Heart, Settings, Gift } from 'lucide-react';
import { GetServerSidePropsContext } from 'next';
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
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
  dealOfDay: { rating: number; comments: string; };
  additionalComments: string;
  name: string;
  email: string;
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

export default function Feedback({ recentEvents, upcomingEvents, testDate }: FeedbackProps) {
  useReferrerTracking();
  const { track } = useEvents();
  const { user } = useUser();
  const { addCredits } = useReferrals();

  const [formState, setFormState] = useState<FeedbackFormState>({
    selectedEventId: '',
    overallRating: 0,
    foodOptions: {
      rating: 0,
      comments: ''
    },
    drinks: {
      rating: 0,
      comments: ''
    },
    talks: {
      rating: 0,
      comments: ''
    },
    timing: {
      rating: 0,
      comments: ''
    },
    execution: {
      rating: 0,
      comments: ''
    },
    improvements: '',
    futureTopics: '',
    worthTime: '',
    wouldRecommend: '',
    dealOfDay: { rating: 0, comments: '' },
    additionalComments: '',
    name: '',
    email: '',
    submitted: false,
    isSubmitting: false,
    error: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [hoveredStar, setHoveredStar] = useState<number>(0);

  // Test mode state
  const [testModeOpen, setTestModeOpen] = useState(false);
  const [testCurrentDate, setTestCurrentDate] = useState<string>(testDate || '');
  const [isApplying, setIsApplying] = useState(false);
  const testModeConfig = getTestModeConfig(testDate);

  // Auto-select the most recent event if available
  useEffect(() => {
    if (recentEvents.length > 0 && !formState.selectedEventId) {
      const mostRecentEvent = recentEvents[0];
      setFormState(prev => ({
        ...prev,
        selectedEventId: mostRecentEvent.id,
      }));
      
      track('feedback_auto_event_selected', {
        eventId: mostRecentEvent.id,
        eventTitle: mostRecentEvent.title
      });
    }
  }, [recentEvents, formState.selectedEventId, track]);


  const handleEventChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const eventId = e.target.value;
    setFormState(prev => ({
      ...prev,
      selectedEventId: eventId,
    }));
    
    if (eventId) {
      const event = recentEvents.find(e => e.id === eventId);
      track('feedback_event_selected', {
        eventId: eventId,
        eventTitle: event?.title || 'Unknown'
      });
    }

    if (validationErrors.selectedEvent) {
      setValidationErrors(prev => ({ ...prev, selectedEvent: undefined }));
    }
  };

  const handleRatingClick = (rating: number) => {
    setFormState(prev => ({ ...prev, overallRating: rating }));
    
    track('feedback_rating_selected', {
      rating: rating,
      eventId: formState.selectedEventId
    });

    if (validationErrors.overallRating) {
      setValidationErrors(prev => ({ ...prev, overallRating: undefined }));
    }
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
    
    // If there are errors, scroll to the first error after a short delay to allow state update
    if (Object.keys(errors).length > 0) {
      setTimeout(() => {
        // Determine scroll target based on error priority
        const errorOrder = ['selectedEvent', 'overallRating', 'worthTime', 'wouldRecommend'];
        
        for (const errorKey of errorOrder) {
          if (errors[errorKey as keyof ValidationErrors]) {
            let targetElement: HTMLElement | null = null;
            
            switch (errorKey) {
              case 'selectedEvent':
                targetElement = document.querySelector('select[id="event"]') as HTMLElement;
                break;
              case 'overallRating':
                targetElement = document.querySelector('[data-section="overall-rating"]') as HTMLElement;
                break;
              case 'worthTime':
                targetElement = document.querySelector('input[name="worthTime"]') as HTMLElement;
                break;
              case 'wouldRecommend':
                targetElement = document.querySelector('input[name="wouldRecommend"]') as HTMLElement;
                break;
            }
            
            if (targetElement) {
              // Scroll to the element with some offset for better visibility
              const elementTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
              const offset = 100; // Account for header/padding
              
              window.scrollTo({
                top: elementTop - offset,
                behavior: 'smooth'
              });
              
              // Focus the element if it's focusable
              if (targetElement.tagName === 'SELECT' || targetElement.tagName === 'INPUT') {
                targetElement.focus();
              }
              break;
            }
          }
        }
      }, 100);
    }
    
    return Object.keys(errors).length === 0;
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
      // Find the selected event to get its title
      const selectedEvent = recentEvents.find(event => event.id === formState.selectedEventId);
      const eventTitle = selectedEvent?.title || 'Unknown Event';
      
      // Get user information
      const userEmail = user?.primaryEmailAddress?.emailAddress || formState.email || 'Not provided';
      const userName = user?.fullName || formState.name || 'Not provided';
      const userId = user?.id || 'Anonymous';
      
      // Format the comprehensive feedback into a readable notification message
      const overallRating = '⭐'.repeat(formState.overallRating);
      
      // Build detailed message with all information
      let message = `📊 NEW FEEDBACK SUBMISSION\n\n`;
      message += `👤 USER INFO:\n`;
      message += `Name: ${userName}\n`;
      message += `Email: ${userEmail}\n`;
      message += `User ID: ${userId}\n`;
      message += `Logged In: ${user ? 'Yes' : 'No'}\n\n`;
      
      message += `🎯 EVENT:\n`;
      message += `Event: ${eventTitle}\n`;
      message += `Event ID: ${formState.selectedEventId}\n\n`;
      
      message += `⭐ OVERALL RATING: ${formState.overallRating}/5 ${overallRating}\n\n`;
      
      // Detailed ratings section
      const ratings = [
        formState.foodOptions.rating > 0 ? `🍕 Food & Drinks: ${formState.foodOptions.rating}/5` : '',
        formState.talks.rating > 0 ? `🎤 Talks/Content: ${formState.talks.rating}/5` : '',
        formState.timing.rating > 0 ? `⏰ Timing: ${formState.timing.rating}/5` : '',
        formState.execution.rating > 0 ? `🎯 Execution: ${formState.execution.rating}/5` : '',
        formState.dealOfDay.rating > 0 ? `💰 Deal of Day: ${formState.dealOfDay.rating}/5` : ''
      ].filter(Boolean);
      
      if (ratings.length > 0) {
        message += `📈 DETAILED RATINGS:\n${ratings.join('\n')}\n\n`;
      }
      
      // Value assessment
      if (formState.worthTime) {
        message += `💎 VALUE ASSESSMENT:\n`;
        message += `Worth time: ${formState.worthTime}\n`;
        message += `Would recommend: ${formState.wouldRecommend}\n\n`;
      }
      
      // Comments sections
      const comments = [];
      if (formState.foodOptions.comments.trim()) {
        comments.push(`🍕 Food Comments: ${formState.foodOptions.comments.trim()}`);
      }
      if (formState.drinks.comments.trim()) {
        comments.push(`🥤 Drinks Comments: ${formState.drinks.comments.trim()}`);
      }
      if (formState.talks.comments.trim()) {
        comments.push(`🎤 Talks Comments: ${formState.talks.comments.trim()}`);
      }
      if (formState.timing.comments.trim()) {
        comments.push(`⏰ Timing Comments: ${formState.timing.comments.trim()}`);
      }
      if (formState.execution.comments.trim()) {
        comments.push(`🎯 Execution Comments: ${formState.execution.comments.trim()}`);
      }
      if (formState.dealOfDay.comments.trim()) {
        comments.push(`💰 Deal Comments: ${formState.dealOfDay.comments.trim()}`);
      }
      if (formState.improvements.trim()) {
        comments.push(`🔧 Improvements: ${formState.improvements.trim()}`);
      }
      if (formState.futureTopics.trim()) {
        comments.push(`🚀 Future Topics: ${formState.futureTopics.trim()}`);
      }
      if (formState.additionalComments.trim()) {
        comments.push(`💬 Additional: ${formState.additionalComments.trim()}`);
      }
      
      if (comments.length > 0) {
        message += `💬 DETAILED FEEDBACK:\n${comments.join('\n\n')}\n\n`;
      }
      
      message += `📅 Submitted: ${new Date().toLocaleString()}`;

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `New Event Feedback ${overallRating} - ${userName}`,
          message: message,
          type: 'event',
          priority: formState.overallRating <= 2 ? 'high' : 'normal',
          userData: {
            name: userName,
            email: userEmail,
            userId: userId,
            isLoggedIn: !!user
          },
          eventData: {
            eventId: formState.selectedEventId,
            eventTitle: eventTitle
          },
          feedbackData: {
            overallRating: formState.overallRating,
            worthTime: formState.worthTime,
            wouldRecommend: formState.wouldRecommend,
            ratings: {
              food: formState.foodOptions.rating,
              drinks: formState.drinks.rating,
              talks: formState.talks.rating,
              timing: formState.timing.rating,
              execution: formState.execution.rating,
              dealOfDay: formState.dealOfDay.rating
            },
            comments: {
              food: formState.foodOptions.comments,
              drinks: formState.drinks.comments,
              talks: formState.talks.comments,
              timing: formState.timing.comments,
              execution: formState.execution.comments,
              dealOfDay: formState.dealOfDay.comments,
              improvements: formState.improvements,
              futureTopics: formState.futureTopics,
              additional: formState.additionalComments
            }
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An error occurred while submitting your feedback');
      }

      // Award 20 credits to logged-in users
      if (user) {
        try {
          await addCredits(20);
          console.log('Awarded 20 credits for feedback submission');
        } catch (creditError) {
          console.error('Error awarding credits:', creditError);
          // Don't fail the submission if credit awarding fails
        }
      }

      track('feedback_submitted_successfully', {
        eventId: formState.selectedEventId,
        overallRating: formState.overallRating,
        worthTime: formState.worthTime,
        wouldRecommend: formState.wouldRecommend,
        userLoggedIn: !!user,
        creditsAwarded: !!user
      });

      setFormState(prev => ({
        ...prev,
        submitted: true,
        isSubmitting: false,
        error: ''
      }));

    } catch (error: unknown) {
      console.error('Feedback submission error:', error);

      track('feedback_submission_error', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'An error occurred while submitting your feedback'
      }));
    }
  };

  const getRatingText = (rating: number) => {
    const ratings = {
      1: "Not great",
      2: "Could be better", 
      3: "It was okay",
      4: "Pretty good!",
      5: "Absolutely amazing!"
    };
    return ratings[rating as keyof typeof ratings] || "";
  };

  return (
    <Layout>
      <SEO
        title="Share Your Feedback | ZurichJS"
        description="Help us improve by sharing your thoughts on our recent workshops and meetups. Your feedback makes our community better!"
        openGraph={{
          title: "Share Your Feedback | ZurichJS",
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
                Share Your Feedback 💭
              </h1>
              <p className="text-lg md:text-xl mb-4 md:mb-6 font-medium">
                Help us make ZurichJS even better for our amazing community!
              </p>
              <p className="text-base md:text-lg mb-4 md:mb-6">
                Your thoughts and suggestions help us improve our workshops, events, and overall experience.
                Whether it&apos;s during an event, right after, or about a recent experience - we want to hear from you!
              </p>

              <div className="bg-js/20 backdrop-blur rounded-lg p-4 mb-6 md:mb-8 border border-js/30">
                <p className="text-sm md:text-base font-medium text-black">
                  ✨ <strong>Your voice matters!</strong> We read every piece of feedback and use it to shape future events. 
                  Your insights help us create better experiences for the entire community!
                </p>
              </div>

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
                <Button
                  href="/"
                  variant="outline"
                  size="lg"
                  className="border-2 border-black text-black hover:bg-black hover:text-white cursor-pointer transition-all duration-200"
                >
                  Back to Home
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
                    <h3 className="font-bold">Make an Impact</h3>
                    <p className="text-gray-600 text-sm">Your feedback directly influences future events and helps speakers grow</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <TrendingUp className="text-yellow-500 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold">Improve Together</h3>
                    <p className="text-gray-600 text-sm">Help us understand what works best for our community</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Sparkles className="text-yellow-500 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold">Shape the Future</h3>
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
                        {testModeConfig.currentDate && (
                          <p>• <strong>Test window:</strong> Shows events from {format(new Date(getCurrentDate().getTime() - 30 * 24 * 60 * 60 * 1000), 'MMM d')} to {format(getCurrentDate(), 'MMM d, yyyy')}</p>
                        )}
                      </div>
                    </div>
                    <p className="mb-4 text-xs">
                      Use this to simulate different scenarios and see how users will experience the feedback form at different times relative to events.
                    </p>
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
                      {testCurrentDate && testCurrentDate !== testDate && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Click Apply to simulate this date
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-yellow-800 mb-2">
                        Quick Scenarios:
                      </label>
                      <div className="space-y-1">
                        {upcomingEvents.length > 0 ? (
                          <>
                            {Object.entries(TEST_SCENARIOS).map(([key, scenario]) => {
                              const nearestEvent = upcomingEvents[0]; // Use the nearest upcoming event
                              const eventDate = new Date(nearestEvent.datetime);
                              const testDate = scenario.getDaysOffset(eventDate);
                              const eventTitle = nearestEvent.title.length > 25 
                                ? nearestEvent.title.substring(0, 25) + '...' 
                                : nearestEvent.title;
                              
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
                                  title={`${scenario.description} (using "${nearestEvent.title}" on ${format(eventDate, 'MMM d, yyyy')})`}
                                >
                                  <div className="font-medium">{scenario.name}</div>
                                  <div className="text-xs text-gray-600 truncate">
                                    vs &quot;{eventTitle}&quot; → {format(testDate, 'MMM d, yyyy')}
                                  </div>
                                </button>
                              );
                            })}
                            <div className="border-t border-yellow-200 pt-2 mt-2">
                              <button
                                onClick={async () => {
                                  setIsApplying(true);
                                  const url = new URL(window.location.href);
                                  url.searchParams.delete('testDate');
                                  window.location.href = url.toString();
                                }}
                                disabled={isApplying}
                                className="block w-full text-left px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                🔄 {isApplying ? 'Resetting...' : 'Reset to Real Date'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50 rounded border border-gray-200">
                            No upcoming events found to generate scenarios from.
                            <br />
                            <small>Add some future events in your CMS to enable scenario testing.</small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-yellow-600">
                    <p><strong>Note:</strong> This panel only appears in development mode to help you test different date scenarios.</p>
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
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Your Feedback Matters</h2>
            <p className="text-gray-600">
              {recentEvents.length > 0 
                ? `We found ${recentEvents.length} event${recentEvents.length === 1 ? '' : 's'} you can provide feedback on! (Including today's events)`
                : "We'll help you find an event to provide feedback on."
              }
            </p>
          </div>

          {recentEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-8 rounded-lg text-center"
            >
              <Calendar size={48} className="mx-auto mb-4 text-yellow-500" />
              <h3 className="text-xl font-bold mb-2">No Recent Events Found</h3>
              <p className="mb-4">
                It looks like there haven&apos;t been any events in the last 30 days that you can provide feedback on.
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
              <h3 className="text-2xl font-bold mb-2">Thank You for Your Feedback!</h3>
              <p className="mb-4">
                Your feedback has been submitted successfully and will help us improve future events.
                We really appreciate you taking the time to share your thoughts!
              </p>
              {user && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                  <p className="text-green-800 font-medium flex items-center justify-center">
                    <Gift className="mr-2" size={16} />
                    You&apos;ve earned 20 credits for providing feedback!
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
                      name: '',
                      email: '',
                      submitted: false,
                      isSubmitting: false,
                      error: '',
                    });
                    setValidationErrors({});
                    track('feedback_form_reset', {});
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

              {/* Login Incentive / User Status */}
              {!user ? (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Gift className="text-purple-600 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-semibold text-purple-900 mb-1">Earn 20 Credits for Your Feedback!</h4>
                      <p className="text-purple-700 text-sm mb-3">
                        Log in to earn 20 profile credits that you can use towards workshops, merchandise, and exclusive perks.
                      </p>
                      <SignInButton mode="modal">
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                        >
                          Sign In to Earn Credits
                        </button>
                      </SignInButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="text-green-600" size={20} />
                      <div>
                        <h4 className="font-semibold text-green-900">Welcome, {user.fullName || 'Member'}!</h4>
                        <p className="text-green-700 text-sm">
                          You&apos;ll earn 20 credits for submitting this feedback.
                        </p>
                      </div>
                    </div>
                    <Gift className="text-green-600" size={24} />
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {!user && (
                <div className="mb-6 p-5 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Contact Information (Optional)</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Help us follow up on your feedback or notify you about improvements.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-gray-700 mb-2 text-sm font-medium">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formState.name}
                        onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-gray-700 mb-2 text-sm font-medium">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formState.email}
                        onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Event Selection */}
              <div className="mb-6">
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
                  <option value="">Select an event...</option>
                  {recentEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {format(new Date(event.datetime), 'MMM d, yyyy')}
                    </option>
                  ))}
                </select>
                {validationErrors.selectedEvent && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.selectedEvent}</p>
                )}
              </div>


              {/* Rating */}
              {formState.selectedEventId && (
                <div className="mb-6" data-section="overall-rating">
                  <label className="block text-gray-700 mb-3 font-semibold">
                    How would you rate this event overall? *
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRatingClick(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={32}
                          className={`${
                            star <= (hoveredStar || formState.overallRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                  {(hoveredStar > 0 || formState.overallRating > 0) && (
                    <p className="text-sm text-gray-600 mb-2">
                      {getRatingText(hoveredStar || formState.overallRating)}
                    </p>
                  )}
                  {validationErrors.overallRating && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.overallRating}</p>
                  )}
                </div>
              )}

              {/* Food & Catering */}
              {formState.selectedEventId && formState.overallRating > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="bg-js text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
                    Food & Catering
                  </h3>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <div className="mr-3 text-blue-600">
                        💙
                      </div>
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">A note from the ZurichJS team:</p>
                        <p>
                          As a <strong>non-profit community</strong>, we&apos;re mostly self-funded and still building our sponsorship base. 
                          We provide the maximum we can with our current budget, and we&apos;re always grateful for your input on how 
                          we can improve within our means. Your feedback helps us prioritize and plan better! 🙏
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-2 font-semibold">
                      How was the food and catering?
                    </label>
                    <div className="flex items-center space-x-1 mb-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormState(prev => ({
                            ...prev,
                            foodOptions: { ...prev.foodOptions, rating }
                          }))}
                          className="focus:outline-none transition-colors duration-150"
                        >
                          <Star
                            size={28}
                            className={`${
                              rating <= formState.foodOptions.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            } hover:text-yellow-400`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-gray-600 text-sm">
                        {formState.foodOptions.rating > 0 ? `${formState.foodOptions.rating}/5` : '0/5'}
                      </span>
                    </div>
                    
                    <textarea
                      value={formState.foodOptions.comments}
                      onChange={(e) => setFormState(prev => ({
                        ...prev,
                        foodOptions: { ...prev.foodOptions, comments: e.target.value }
                      }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
                      placeholder="Any thoughts on the food, drinks, or catering? Suggestions for budget-friendly improvements are especially welcome! (optional)"
                    />
                  </div>
                </div>
              )}

              {/* Talks & Content */}
              {formState.selectedEventId && formState.overallRating > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="bg-js text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</span>
                    Talks & Content
                  </h3>
                  
                  <div>
                    <label className="block text-gray-700 mb-2 font-semibold">
                      How were the talks and content?
                    </label>
                    <div className="flex items-center space-x-1 mb-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormState(prev => ({
                            ...prev,
                            talks: { ...prev.talks, rating }
                          }))}
                          className="focus:outline-none transition-colors duration-150"
                        >
                          <Star
                            size={28}
                            className={`${
                              rating <= formState.talks.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            } hover:text-yellow-400`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-gray-600 text-sm">
                        {formState.talks.rating > 0 ? `${formState.talks.rating}/5` : '0/5'}
                      </span>
                    </div>
                    
                    <textarea
                      value={formState.talks.comments}
                      onChange={(e) => setFormState(prev => ({
                        ...prev,
                        talks: { ...prev.talks, comments: e.target.value }
                      }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
                      placeholder="What did you think of the presentations and speakers? (optional)"
                    />
                  </div>
                </div>
              )}

              {/* Timing & Organization */}
              {formState.selectedEventId && formState.overallRating > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="bg-js text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">4</span>
                    Timing & Organization
                  </h3>
                  
                  <div>
                    <label className="block text-gray-700 mb-2 font-semibold">
                      How was the event timing and organization?
                    </label>
                    <div className="flex items-center space-x-1 mb-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormState(prev => ({
                            ...prev,
                            timing: { ...prev.timing, rating }
                          }))}
                          className="focus:outline-none transition-colors duration-150"
                        >
                          <Star
                            size={28}
                            className={`${
                              rating <= formState.timing.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            } hover:text-yellow-400`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-gray-600 text-sm">
                        {formState.timing.rating > 0 ? `${formState.timing.rating}/5` : '0/5'}
                      </span>
                    </div>
                    
                    <textarea
                      value={formState.timing.comments}
                      onChange={(e) => setFormState(prev => ({
                        ...prev,
                        timing: { ...prev.timing, comments: e.target.value }
                      }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
                      placeholder="Thoughts on start time, duration, breaks, or event flow? (optional)"
                    />
                  </div>
                </div>
              )}

              {/* Event Execution */}
              {formState.selectedEventId && formState.overallRating > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="bg-js text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">5</span>
                    Event Execution
                  </h3>
                  
                  <div>
                    <label className="block text-gray-700 mb-2 font-semibold">
                      How was the overall event execution?
                    </label>
                    <div className="flex items-center space-x-1 mb-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormState(prev => ({
                            ...prev,
                            execution: { ...prev.execution, rating }
                          }))}
                          className="focus:outline-none transition-colors duration-150"
                        >
                          <Star
                            size={28}
                            className={`${
                              rating <= formState.execution.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            } hover:text-yellow-400`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-gray-600 text-sm">
                        {formState.execution.rating > 0 ? `${formState.execution.rating}/5` : '0/5'}
                      </span>
                    </div>
                    
                    <textarea
                      value={formState.execution.comments}
                      onChange={(e) => setFormState(prev => ({
                        ...prev,
                        execution: { ...prev.execution, comments: e.target.value }
                      }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
                      placeholder="Venue, setup, logistics, networking opportunities? (optional)"
                    />
                  </div>
                </div>
              )}

              {/* Improvements & Future Topics */}
              {formState.selectedEventId && formState.overallRating > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="bg-js text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">6</span>
                    Help Us Improve
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 mb-2 font-semibold">
                        What could we improve for future events?
                      </label>
                      <textarea
                        value={formState.improvements}
                        onChange={(e) => setFormState(prev => ({ ...prev, improvements: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-js"
                        placeholder="Share your suggestions for improvements - venue, catering, format, content, networking opportunities, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2 font-semibold">
                        What topics would you like to see in future events?
                      </label>
                      <textarea
                        value={formState.futureTopics}
                        onChange={(e) => setFormState(prev => ({ ...prev, futureTopics: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-js"
                        placeholder="Technologies, frameworks, tools, or specific topics you'd like to learn about..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Deal of the Day */}
              {formState.selectedEventId && formState.overallRating > 0 && (
                <div className="mb-8">
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
                                size={28}
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
                        <label className="block text-gray-700 mb-2 font-semibold">
                          Comments about our deals/discounts (optional):
                        </label>
                        <textarea
                          value={formState.dealOfDay.comments}
                          onChange={(e) => setFormState(prev => ({
                            ...prev,
                            dealOfDay: { ...prev.dealOfDay, comments: e.target.value }
                          }))}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-js"
                          placeholder="Tell us about our discount offers, promotion timing, value for money, etc."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Value Assessment */}
              {formState.selectedEventId && formState.overallRating > 0 && (
                <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-xl font-bold mb-6 flex items-center text-gray-900">
                    <span className="bg-js text-black rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">7</span>
                    Overall Value Assessment
                  </h3>
                  
                  <div className="space-y-8">
                    <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
                      <label className="block text-gray-800 mb-4 font-semibold text-base">
                        Was this event worth your time? *
                      </label>
                      <div className="space-y-3">
                        {[
                          { value: 'definitely', label: '✨ Definitely - Great value!', color: 'text-emerald-700' },
                          { value: 'mostly', label: '👍 Mostly - Good overall', color: 'text-emerald-600' },
                          { value: 'somewhat', label: '👌 Somewhat - Mixed feelings', color: 'text-amber-600' },
                          { value: 'not_really', label: '😐 Not really - Could be better', color: 'text-slate-600' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center cursor-pointer p-3 rounded-md hover:bg-gray-50 transition-colors">
                            <input
                              type="radio"
                              name="worthTime"
                              value={option.value}
                              checked={formState.worthTime === option.value}
                              onChange={(e) => setFormState(prev => ({ ...prev, worthTime: e.target.value as 'definitely' | 'mostly' | 'somewhat' | 'not_really' }))}
                              className="mr-4 w-4 h-4 text-js border-gray-300 focus:ring-js focus:ring-2"
                            />
                            <span className={`${option.color} font-medium text-sm`}>{option.label}</span>
                          </label>
                        ))}
                      </div>
                      {validationErrors.worthTime && (
                        <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">{validationErrors.worthTime}</p>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
                      <label className="block text-gray-800 mb-4 font-semibold text-base">
                        Would you recommend this event to others? *
                      </label>
                      <div className="space-y-3">
                        {[
                          { value: 'definitely', label: '🔥 Definitely - I\'d actively promote it!', color: 'text-emerald-700' },
                          { value: 'probably', label: '✅ Probably - If asked, I\'d recommend it', color: 'text-emerald-600' },
                          { value: 'maybe', label: '🤷‍♂️ Maybe - Depends on the person', color: 'text-amber-600' },
                          { value: 'unlikely', label: '❌ Unlikely - Needs improvement first', color: 'text-slate-600' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center cursor-pointer p-3 rounded-md hover:bg-gray-50 transition-colors">
                            <input
                              type="radio"
                              name="wouldRecommend"
                              value={option.value}
                              checked={formState.wouldRecommend === option.value}
                              onChange={(e) => setFormState(prev => ({ ...prev, wouldRecommend: e.target.value as 'definitely' | 'probably' | 'maybe' | 'unlikely' }))}
                              className="mr-4 w-4 h-4 text-js border-gray-300 focus:ring-js focus:ring-2"
                            />
                            <span className={`${option.color} font-medium text-sm`}>{option.label}</span>
                          </label>
                        ))}
                      </div>
                      {validationErrors.wouldRecommend && (
                        <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">{validationErrors.wouldRecommend}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Comment */}
              {formState.selectedEventId && formState.overallRating > 0 && (
                <div className="mb-6">
                  <label htmlFor="comment" className="block text-gray-700 mb-2 font-semibold">
                    Share your thoughts about this event *
                  </label>
                  <textarea
                    id="comment"
                    value={formState.additionalComments}
                    onChange={(e) => setFormState(prev => ({ ...prev, additionalComments: e.target.value }))}
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-js"
                    placeholder="What did you think of the event? What was great? What could be improved? Any suggestions for future events?"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Your feedback helps us improve future events and create better experiences for everyone!
                  </p>
                </div>
              )}

              {/* Submit Button */}
              {formState.selectedEventId && formState.overallRating > 0 && (
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
        // Validate the date
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