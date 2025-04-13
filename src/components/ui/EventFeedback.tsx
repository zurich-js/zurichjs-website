import { motion } from 'framer-motion';
import { Star, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FeedbackFormProps {
  eventId: string;
  talkId: string;
  talkTitle: string;
  speakerId: string;
  speakerName: string;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
  isSubmitted: boolean;
}

interface FeedbackData {
  eventId: string;
  talkId: string;
  speakerId: string;
  rating: number;
  comment: string;
  submittedAt: string;
}

const FeedbackForm = ({ 
  eventId, 
  talkId, 
  talkTitle, 
  speakerId, 
  speakerName, 
  onSubmit, 
  isSubmitted 
}: FeedbackFormProps) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [localSubmitted, setLocalSubmitted] = useState<boolean>(isSubmitted);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setErrorMessage('Please select a rating before submitting');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      await onSubmit({
        eventId,
        talkId,
        speakerId,
        rating,
        comment,
        submittedAt: new Date().toISOString()
      });
      
      setLocalSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      if (typeof error === 'object' && error !== null && 'message' in error) {
        setErrorMessage(String(error.message));
      } else {
        setErrorMessage('Failed to submit feedback. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (localSubmitted) {
    return (
      <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
        <h4 className="font-bold text-lg mb-1">Thank you for your feedback on &ldquo;{talkTitle}&rdquo;!</h4>
        <p className="text-gray-600">Your insights help {speakerName} improve and our community grow.</p>
      </div>
    );
  }

  // Comment presets for quick selection
  const commentPresets = [
    { label: "Great talk!", value: "Great talk! I enjoyed the content and delivery." },
    { label: "Insightful", value: "Very insightful presentation with valuable information." },
    { label: "Clear explanation", value: "The concepts were explained clearly and concisely." },
    { label: "Good examples", value: "I appreciated the practical examples shown." },
    { label: "Needs improvement", value: "The talk could use some improvement in structure and delivery." }
  ];

  const applyPreset = (preset: string) => {
    // Check if any preset is already in the comment
    const existingPresetIndex = commentPresets.findIndex(p => 
      comment.includes(p.value)
    );
    
    if (existingPresetIndex !== -1) {
      // Replace the existing preset with the new one
      const existingPreset = commentPresets[existingPresetIndex].value;
      const newComment = comment.replace(existingPreset, preset);
      setComment(newComment);
    } else if (comment.trim()) {
      // No preset found, but there's some text - add on a new line
      setComment(comment => `${comment}\n${preset}`);
    } else {
      // Empty comment - just set it
      setComment(preset);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
      <div>
        <h4 className="font-bold mb-1">{talkTitle}</h4>
        <p className="text-gray-600 text-sm">by {speakerName}</p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          How would you rate this talk?
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none"
            >
              <Star
                size={24}
                fill={(hoverRating || rating) >= star ? '#FFC107' : 'none'}
                color={(hoverRating || rating) >= star ? '#FFC107' : '#D1D5DB'}
              />
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label htmlFor={`comment-${talkId}`} className="block text-sm font-medium text-gray-700 mb-1">
          Comments (optional)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {commentPresets.map((preset, index) => (
            <button
              key={index}
              type="button"
              onClick={() => applyPreset(preset.value)}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <textarea
          id={`comment-${talkId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like? Any suggestions for improvement?"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>
      
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {errorMessage}
        </div>
      )}
      
      <button
        type="submit"
        disabled={rating === 0 || isSubmitting}
        className={`w-full py-2 px-4 rounded-md font-medium text-white transition-colors ${
          rating === 0 || isSubmitting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-yellow-500 hover:bg-yellow-600'
        }`}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
};

export interface EventFeedbackProps {
  event: {
    id: string;
    title: string;
    datetime: string;
    talks: Array<{
      id: string;
      title: string;
      speakers: Array<{
        id: string;
        name: string;
      }>;
    }>;
  };
  isFeedbackMode: boolean;
}

export default function EventFeedback({ event, isFeedbackMode }: EventFeedbackProps) {
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<Record<string, boolean>>({});
  
  // Load previously submitted feedbacks from localStorage
  useEffect(() => {
    const storageKey = `zurichjs-feedback-${event.id}`;
    const storedFeedbacks = localStorage.getItem(storageKey);
    
    if (storedFeedbacks) {
      setSubmittedFeedbacks(JSON.parse(storedFeedbacks));
    }
  }, [event]);
  
  const handleFeedbackSubmit = async (feedbackData: FeedbackData) => {
    try {
      // Send feedback to the API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });
      
      if (!response.ok) {
        // Try to parse error message from response
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.message) {
          throw new Error(errorData.message);
        }
        
        // If we can't get a specific message, use the status text
        throw new Error(`Failed to submit feedback: ${response.statusText}`);
      }
      
      // Update local storage to mark this talk as submitted
      const storageKey = `zurichjs-feedback-${event.id}`;
      const updatedFeedbacks = {
        ...submittedFeedbacks,
        [feedbackData.talkId]: true,
      };
      
      localStorage.setItem(storageKey, JSON.stringify(updatedFeedbacks));
      setSubmittedFeedbacks(updatedFeedbacks);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  };
  
  if (!isFeedbackMode) {
    return null;
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-8 mb-12"
    >
      <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-3">Share Your Feedback</h2>
        <p className="mb-4">
          Your feedback helps our speakers improve and guides future content. 
          Please rate each talk and provide constructive comments.
        </p>
      </div>
      
      <div className="space-y-6">
        {event.talks.map((talk) => (
          <div key={talk.id}>
            {talk.speakers.map((speaker) => (
              <FeedbackForm
                key={`${talk.id}-${speaker.id}`}
                eventId={event.id}
                talkId={talk.id}
                talkTitle={talk.title}
                speakerId={speaker.id}
                speakerName={speaker.name}
                onSubmit={handleFeedbackSubmit}
                isSubmitted={!!submittedFeedbacks[talk.id]}
              />
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}