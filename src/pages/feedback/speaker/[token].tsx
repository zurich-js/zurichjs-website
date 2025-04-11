import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { motion } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/SEO';

// Define interfaces for the speaker feedback data structure
interface FeedbackItem {
  _id: string;
  submittedAt: string;
  rating: number;
  comment?: string;
  event: {
    _id: string;
    title: string;
    date: string;
    datetime: string;
  };
  talk: {
    _id: string;
    title: string;
  };
  speaker: {
    _id: string;
    name: string;
    image: string;
  };
}

export default function SpeakerFeedbackPage() {
  const router = useRouter();
  const { token } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted to true when component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchFeedback = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/speaker-feedback/${token}`);

        if (data.length) {
          setFeedbackData(data);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching feedback:', err);
        setError('Failed to load feedback. The token may be invalid or expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [token]);

  // Function to render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg 
            key={star}
            className={`w-6 h-6 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  // Function to safely format date (only runs client-side)
  const formatDate = (dateString: string) => {
    if (!isMounted) return ''; // Return empty string during SSR
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Process feedback data to create summary
  const processFeedbackData = () => {
    if (!feedbackData.length) return null;

    const speaker = feedbackData[0]?.speaker;
    
    // Group feedback by talk
    const talkMap = new Map();
    let totalRating = 0;
    
    feedbackData.forEach(item => {
      if (!talkMap.has(item.talk._id)) {
        talkMap.set(item.talk._id, {
          talkId: item.talk._id,
          talkTitle: item.talk.title,
          eventTitle: item.event.title,
          eventDate: item.event.date || item.event.datetime,
          ratings: [],
          comments: []
        });
      }
      
      const talkData = talkMap.get(item.talk._id);
      talkData.ratings.push(item.rating);
      if (item.comment) talkData.comments.push(item.comment);
      totalRating += item.rating;
    });

    // Calculate stats for each talk
    const feedbackByTalk = Array.from(talkMap.values()).map(talk => {
      const totalFeedback = talk.ratings.length;
      const averageRating = totalFeedback > 0 
        ? talk.ratings.reduce((sum: number, rating: number) => sum + rating, 0) / totalFeedback 
        : 0;
        
      return {
        talkTitle: talk.talkTitle,
        eventTitle: talk.eventTitle,
        eventDate: talk.eventDate,
        totalFeedback,
        averageRating,
        comments: talk.comments
      };
    });

    // Overall summary
    const totalFeedback = feedbackData.length;
    const averageRating = totalFeedback > 0 ? totalRating / totalFeedback : 0;

    return {
      speaker,
      summary: {
        totalFeedback,
        averageRating
      },
      feedbackByTalk
    };
  };

  const processedData = processFeedbackData();

  // Loading, error, and empty states
  if (!token || loading) {
    return (
      <Layout>
        <div className="container mx-auto py-20 px-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-50 p-8 rounded-xl shadow-lg border border-red-100">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h1 className="text-2xl font-bold mb-4">Error Loading Feedback</h1>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!processedData) {
    return (
      <Layout>
        <div className="container mx-auto py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-gray-50 p-8 rounded-xl shadow-lg border border-gray-100">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h1 className="text-2xl font-bold mb-4">No Feedback Available</h1>
              <p className="text-gray-600">No feedback data was found for this speaker token.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const { speaker, summary, feedbackByTalk } = processedData;

  // Computed values for visual elements
  const ratingPercentage = (summary.averageRating / 5) * 100;

  return (
    <Layout>
      <SEO
        title={`Speaker Feedback - ${speaker?.name}`}
        description={`Feedback for ${speaker?.name}'s talks at ZurichJS events.`}
      />
      
      {/* Hero Section with Animation */}
      <section className="relative overflow-hidden bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-900">
        <div className="container mx-auto px-6 py-14 md:py-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row items-center gap-8"
          >
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white shadow-xl">
              <img 
                src={speaker?.image || '/images/speakers/default.png'}
                alt={speaker?.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{speaker?.name}</h1>
              <p className="text-xl md:text-2xl font-medium mt-2 mb-4 text-gray-800">
                Speaker Feedback
              </p>
              <div className="inline-block bg-white bg-opacity-80 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold">{summary.averageRating.toFixed(1)}/5</span>
                  <span className="mx-2">•</span>
                  <span>{summary.totalFeedback} {summary.totalFeedback === 1 ? 'response' : 'responses'}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-12">
        {/* Feedback Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Overall Feedback Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Rating Distribution</h3>
                <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-500" 
                    style={{ width: `${ratingPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                  <span>0</span>
                  <span>5</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-500">AVERAGE RATING</p>
                  <p className="text-4xl font-bold text-gray-900">{summary.averageRating.toFixed(1)}</p>
                  <div className="mt-1">{renderStars(summary.averageRating)}</div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-500">TOTAL FEEDBACK</p>
                  <p className="text-4xl font-bold text-gray-900">{summary.totalFeedback}</p>
                  <p className="mt-1 text-sm text-gray-500">Across all talks</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-md p-6 flex flex-col justify-center">
              <h3 className="text-xl font-semibold mb-4">Feedback Impact</h3>
              {(() => {
                // Determine the feedback impact message and actions based on data
                const avgRating = summary.averageRating;
                const totalFeedback = summary.totalFeedback;
                
                // Not enough feedback to give a meaningful assessment
                if (totalFeedback < 3) {
                  return (
                    <>
                      <p className="mb-6">
                        Thank you for being part of the ZurichJS community! 
                        We have limited feedback for your {totalFeedback === 1 ? 'talk' : 'talks'} so far.
                        As we collect more responses, we&apos;ll be able to provide more meaningful insights. We encourage you to reach out to attendees to submit more feedback.
                      </p>
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="ml-4 text-sm font-medium">
                          <a href="https://zurichjs.com/contact" className="underline hover:text-yellow-200 transition-colors">
                            Contact our organizers
                          </a> to discuss your speaking experience.
                        </p>
                      </div>
                    </>
                  );
                }
                
                // Excellent feedback (4.5+)
                if (avgRating >= 4.5) {
                  return (
                    <>
                      <p className="mb-6">
                        Wow! Your presentations have made an exceptional impact on our attendees. 
                        With an impressive average rating of {avgRating.toFixed(1)}, you&apos;re among our most valued speakers.
                        The ZurichJS community has really connected with your content and presentation style.
                      </p>
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                          </svg>
                        </div>
                        <p className="ml-4 text-sm font-medium">
                          We&apos;d love to have you speak again! 
                          <a href="https://zurichjs.com/cfp" className="underline hover:text-yellow-200 transition-colors ml-1">
                            Submit a new talk proposal
                          </a>
                        </p>
                      </div>
                    </>
                  );
                }
                
                // Good feedback (3.7 - 4.4)
                if (avgRating >= 3.7) {
                  return (
                    <>
                      <p className="mb-6">
                        Thank you for your valuable contributions to the ZurichJS community! 
                        With a solid average rating of {avgRating.toFixed(1)}, attendees have clearly 
                        appreciated your presentations. Your talks have been well-received and have 
                        added significant value to our events.
                      </p>
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                          </svg>
                        </div>
                        <p className="ml-4 text-sm font-medium">
                          We&apos;d love to have you speak again! 
                          <a href="https://zurichjs.com/cfp" className="underline hover:text-yellow-200 transition-colors ml-1">
                            Submit a new talk proposal
                          </a>
                        </p>
                      </div>
                    </>
                  );
                }
                
                // Needs improvement (3.0 - 3.6)
                if (avgRating >= 3.0) {
                  return (
                    <>
                      <p className="mb-6">
                        Thank you for contributing to the ZurichJS community! Your presentations have received 
                        an average rating of {avgRating.toFixed(1)}. While attendees found value in your talks, 
                        there may be opportunities to enhance your presentation style or content to create an even 
                        stronger connection with our audience.
                      </p>
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        {/* <p className="ml-4 text-sm font-medium">
                          <a href="https://zurichjs.org/speaker-resources" className="underline hover:text-yellow-200 transition-colors">
                            Access our speaker resources
                          </a> for helpful presentation tips.
                        </p>
                      </div>
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="ml-4 text-sm font-medium">
                          <a href="https://zurichjs.org/speaker-coaching" className="underline hover:text-yellow-200 transition-colors">
                            Request feedback from our organizers
                          </a> to level up your talks.
                        </p> */}
                      </div>
                    </>
                  );
                }
                
                // Significant improvement needed (< 3.0)
                return (
                  <>
                    <p className="mb-6">
                      Thank you for being part of the ZurichJS community! 
                      We have limited feedback for your {totalFeedback === 1 ? 'talk' : 'talks'} so far.
                      As we collect more responses, we&apos;ll be able to provide more meaningful insights.
                    </p>
                    {/* <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <p className="ml-4 text-sm font-medium">
                        <a href="https://zurichjs.org/speaker-coaching" className="underline hover:text-yellow-200 transition-colors">
                          Schedule a coaching session
                        </a> with our organizers for personalized feedback.
                      </p>
                    </div>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <p className="ml-4 text-sm font-medium">
                        <a href="https://zurichjs.org/speaker-resources" className="underline hover:text-yellow-200 transition-colors">
                          Review our presentation guidelines
                        </a> for practical improvement tips.
                      </p>
                    </div> */}
                  </>
                );
              })()}
            </div>
          </div>
        </motion.div>

        {/* Feedback by Talk */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Feedback by Talk
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feedbackByTalk.map((talk, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{talk.talkTitle}</h3>
                    <div className="bg-yellow-100 rounded-full h-10 w-10 flex items-center justify-center">
                      <span className="text-yellow-700 font-bold">{talk.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-500 text-sm mb-4 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(talk.eventDate)}
                    <span className="mx-2">•</span>
                    {talk.eventTitle}
                  </p>
                  
                  <div className="flex gap-2 mb-4">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                      {talk.totalFeedback} {talk.totalFeedback === 1 ? 'response' : 'responses'}
                    </span>
                  </div>
                  
                  <div className="mb-4">{renderStars(talk.averageRating)}</div>

                  {talk.comments.length > 0 && (
                    <>
                      <div className="border-t border-gray-100 my-4 pt-4">
                        <h4 className="text-lg font-semibold mb-3 text-gray-800">Attendee Comments</h4>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                          {talk.comments.map((comment: string, idx: number) => (
                            <div 
                              key={idx} 
                              className="p-3 bg-gray-50 rounded-lg border-l-4 border-yellow-400"
                            >
                              <p className="text-gray-700">{comment}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
} 