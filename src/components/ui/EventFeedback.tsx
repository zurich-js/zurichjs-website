import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Star, CheckCircle, ThumbsUp, MessageSquare, Box, ChevronDown, ChevronUp, ExternalLink, Beaker } from 'lucide-react';
import { useState, useEffect } from 'react';

import { ProductDemo, ProductFeedbackData } from '@/types';

interface FeedbackFormProps {
  eventId: string;
  talkId: string;
  talkTitle: string;
  speakerId: string;
  speakerName: string;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
  isSubmitted: boolean;
  productDemo?: ProductDemo | null;
  productDemos?: ProductDemo[];
}

interface FeedbackData {
  eventId: string;
  talkId: string;
  speakerId: string;
  rating: number;
  comment: string;
  submittedAt: string;
  email?: string;
  productFeedback?: ProductFeedbackData;
}

const ProductFeedback = ({ 
  productDemo, 
  onChange,
  expanded,
  onToggleExpand
}: { 
  productDemo: ProductDemo | null; 
  onChange: (data: ProductFeedbackData) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [questions, setQuestions] = useState<string>('');
  const [interests, setInterests] = useState<string[]>([]);
  const [learningPreferences, setLearningPreferences] = useState<string[]>([]);
  const [showDetailedFeedback, setShowDetailedFeedback] = useState<boolean>(false);
  const [detailedFeedback, setDetailedFeedback] = useState<string>('');
  
  const interestOptions = [
    "I'm interested in using this product",
    "I'm already evaluating this product",
    "I'm already using this product",
    "I want a demo for my team",
    "I want to see pricing options"
  ];
  
  const learningOptions = [
    "Documentation",
    "Video tutorials",
    "Webinars",
    "Case studies",
    "Live demo",
    "Code examples"
  ];
  
  // Create data update function that's called manually on changes
  const updateFeedbackData = (updates: Partial<{
    rating: number;
    interests: string[];
    questions: string;
    learningPreferences: string[];
    detailedFeedback: string;
  }>) => {
    // Update local state
    if (updates.rating !== undefined) setRating(updates.rating);
    if (updates.interests !== undefined) setInterests(updates.interests);
    if (updates.questions !== undefined) setQuestions(updates.questions);
    if (updates.learningPreferences !== undefined) setLearningPreferences(updates.learningPreferences);
    if (updates.detailedFeedback !== undefined) setDetailedFeedback(updates.detailedFeedback);
    
    // Get product ID properly
    const productId = productDemo?._id || '';
      
    // Call the parent's onChange with combined data
    onChange({
      productId,
      productName: productDemo?.name || '',
      rating: updates.rating !== undefined ? updates.rating : rating,
      interests: updates.interests !== undefined ? updates.interests : interests,
      questions: updates.questions !== undefined ? updates.questions : questions,
      learningPreferences: updates.learningPreferences !== undefined ? updates.learningPreferences : learningPreferences,
      detailedFeedback: updates.detailedFeedback !== undefined ? updates.detailedFeedback : detailedFeedback
    });
  };
  
  // Toggle an item in an array of strings
  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  // Reset detailed feedback when rating changes category
  useEffect(() => {
    if (rating > 0) {
      const isHighRating = rating >= 4;
      // Only reset feedback when crossing the threshold
      if ((isHighRating && detailedFeedback.includes('could be improved')) || 
          (!isHighRating && detailedFeedback.includes('liked so much'))) {
        setDetailedFeedback('');
        // Also update parent with empty feedback
        updateFeedbackData({ detailedFeedback: '' });
      }
    }
  }, [rating, detailedFeedback]);

  return (
    <motion.div 
      className="mt-4 bg-blue-50 rounded-lg border border-blue-200 overflow-hidden"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className="p-4 bg-blue-100 flex justify-between items-center cursor-pointer hover:bg-blue-200 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center">
          <Box size={16} className="mr-2 text-blue-700" />
          <h4 className="font-semibold text-blue-800">Product Feedback: {productDemo?.name}</h4>
        </div>
        <button className="text-blue-700">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
      
      {expanded && (
        <motion.div 
          className="p-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            {productDemo?.logo && (
              <div className="h-12 w-12 relative flex-shrink-0">
                <img 
                  src={productDemo?.logo} 
                  alt={`${productDemo?.name} logo`} 
                  className="h-full w-full object-contain" 
                />
              </div>
            )}
            <div>
              <h4 className="font-medium text-gray-800">{productDemo?.name}</h4>
              {productDemo?.description && (
                <p className="text-sm text-gray-600">{productDemo?.description}</p>
              )}
              {productDemo?.websiteUrl && (
                <a 
                  href={productDemo?.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs inline-flex items-center mt-1 text-blue-600 hover:text-blue-800"
                >
                  Visit website <ExternalLink size={12} className="ml-1" />
                </a>
              )}
            </div>
          </div>
          
          <div className="space-y-4 mt-4">
            {/* Product Rating */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                How would you rate this product?
              </label>
              <div className="flex gap-2 items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    type="button"
                    onClick={() => updateFeedbackData({ rating: star })}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none relative"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Star
                      size={24}
                      fill={(hoverRating || rating) >= star ? '#3B82F6' : 'none'}
                      color={(hoverRating || rating) >= star ? '#3B82F6' : '#94A3B8'}
                      strokeWidth={1.5}
                    />
                  </motion.button>
                ))}
                {(hoverRating > 0 || rating > 0) && (
                  <span className="ml-2 text-sm text-gray-600">
                    {hoverRating > 0 ? 
                      (hoverRating === 5 ? "Excellent!" : 
                       hoverRating === 4 ? "Very good" : 
                       hoverRating === 3 ? "Good" : 
                       hoverRating === 2 ? "Fair" : "Needs improvement") :
                      (rating === 5 ? "Excellent!" : 
                       rating === 4 ? "Very good" : 
                       rating === 3 ? "Good" : 
                       rating === 2 ? "Fair" : "Needs improvement")
                    }
                  </span>
                )}
              </div>
            </div>
            
            {/* Conditional Detailed Feedback Field based on rating */}
            {rating > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    {rating >= 4 
                      ? "What did you like so much about this product?" 
                      : "What could be improved about this product?"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDetailedFeedback(!showDetailedFeedback)}
                    className={`text-xs ${showDetailedFeedback ? 'text-blue-700' : 'text-gray-500'} hover:text-blue-800 flex items-center`}
                  >
                    {showDetailedFeedback ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
                    {showDetailedFeedback ? "Hide" : "Add details"}
                  </button>
                </div>
                
                {showDetailedFeedback && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <textarea
                      value={detailedFeedback}
                      onChange={(e) => updateFeedbackData({ detailedFeedback: e.target.value })}
                      placeholder={rating >= 4 
                        ? "What features or aspects did you find most valuable?" 
                        : "What specific aspects would make this product better for you?"}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </motion.div>
                )}
              </div>
            )}
            
            {/* Interests */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Your interest in this product (select all that apply):
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {interestOptions.map((option, index) => (
                  <div key={index} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`interest-${index}`}
                      checked={interests.includes(option)}
                      onChange={() => updateFeedbackData({ 
                        interests: toggleArrayItem(interests, option) 
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`interest-${index}`}
                      className="ml-2 block text-sm text-gray-700"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Questions */}
            <div className="space-y-2">
              <label htmlFor="product-questions" className="block text-sm font-medium text-gray-700">
                Questions about the product:
              </label>
              <textarea
                id="product-questions"
                value={questions}
                onChange={(e) => updateFeedbackData({ questions: e.target.value })}
                placeholder="Any questions about features, use cases, or implementation?"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Learning Preferences */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                How would you like to learn more? (select all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {learningOptions.map((option, index) => (
                  <div key={index} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`learning-${index}`}
                      checked={learningPreferences.includes(option)}
                      onChange={() => updateFeedbackData({ 
                        learningPreferences: toggleArrayItem(learningPreferences, option) 
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`learning-${index}`}
                      className="ml-2 block text-sm text-gray-700"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
              This feedback will be shared with the product team to help improve their offering.
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const FeedbackForm = ({ 
  eventId, 
  talkId, 
  talkTitle, 
  speakerId, 
  speakerName, 
  onSubmit, 
  isSubmitted,
  productDemo,
  productDemos
}: FeedbackFormProps) => {
  const { user, isLoaded } = useUser();
  
  // Initialize product demos once during component creation
  const initialProductDemos = productDemos?.length ? productDemos : (productDemo ? [productDemo] : []);
  const initialActiveDemo = productDemo || (initialProductDemos.length > 0 ? initialProductDemos[0] : null);
  
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [localSubmitted, setLocalSubmitted] = useState<boolean>(isSubmitted);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [showProductFeedback, setShowProductFeedback] = useState<boolean>(false);
  const [productFeedback, setProductFeedback] = useState<ProductFeedbackData | null>(null);
  const [activeProductDemo, setActiveProductDemo] = useState<ProductDemo | null>(initialActiveDemo);
  const [allProductDemos] = useState<ProductDemo[]>(initialProductDemos);

  console.log({productDemos})

  // Set email from user data when available
  useEffect(() => {
    if (isLoaded && user && user.primaryEmailAddress) {
      setEmail(user.primaryEmailAddress.emailAddress);
    }
  }, [isLoaded, user]);

  // Clear error message when rating changes
  useEffect(() => {
    if (rating > 0 && errorMessage) {
      setErrorMessage('');
    }
  }, [rating, errorMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setErrorMessage('Please select a rating before submitting');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage('');
    
    // Get the email either from state or directly from user object
    const submissionEmail = user?.primaryEmailAddress?.emailAddress || email;
    
    try {
      await onSubmit({
        eventId,
        talkId,
        speakerId,
        rating,
        comment,
        email: submissionEmail,
        submittedAt: new Date().toISOString(),
        productFeedback: productFeedback && activeProductDemo ? {
          ...productFeedback,
          productId: activeProductDemo._id,
          productName: activeProductDemo.name
        } : undefined
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="p-6 bg-green-50 rounded-lg border border-green-200 text-center"
      >
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
        </motion.div>
        <h4 className="font-bold text-lg mb-2">Thank you for your feedback on &ldquo;{talkTitle}&rdquo;!</h4>
        <p className="text-gray-600 mb-3">Your insights help {speakerName} improve and our community grow.</p>
        <div className="text-sm text-green-600 font-medium">Feedback submitted successfully</div>
        
        {activeProductDemo && productFeedback && productFeedback.rating > 0 && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <p className="text-gray-600">Your product feedback for <strong>{activeProductDemo.name}</strong> has been recorded.</p>
            <p className="text-sm text-green-600">Thank you for helping our sponsors improve their products!</p>
          </div>
        )}

        {allProductDemos.length > 1 && !productFeedback && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <p className="text-gray-600">This talk featured multiple product demos.</p>
            <p className="text-sm text-green-600">Consider providing feedback for other products as well!</p>
          </div>
        )}
      </motion.div>
    );
  }

  // Comment presets for quick selection
  const commentPresets = [
    { label: "Great talk!", value: "Great talk! I enjoyed the content and delivery." },
    { label: "Insightful", value: "Very insightful presentation with valuable information." },
    { label: "Clear explanation", value: "The concepts were explained clearly and concisely." },
    { label: "Good examples", value: "I appreciated the practical examples shown." },
    { label: "Learned a lot", value: "I learned a lot from this talk and will apply it in my work." },
    { label: "Engaging speaker", value: "The speaker was engaging and kept my attention throughout." },
    { label: "Technical issues", value: "There were some technical issues that affected the presentation." },
    { label: "Would like more depth", value: "The topic was interesting but I would have liked more in-depth content." },
    { label: "Too advanced", value: "The content was too advanced for the general audience." },
    { label: "Too basic", value: "The content was too basic for my level of expertise." }
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
    // Focus on textarea after selecting a preset
    document.getElementById(`comment-${talkId}`)?.focus();
  };

  // Description for each rating
  const ratingDescriptions = [
    "", // For index 0
    "Poor - Not helpful",
    "Fair - Needs improvement",
    "Good - Met expectations",
    "Very good - Above expectations",
    "Excellent - Outstanding!"
  ];

  // Handle product feedback changes
  const handleProductFeedbackChange = (data: ProductFeedbackData) => {
    // Just store the data directly, without triggering additional renders
    setProductFeedback(data);
  };

  // Switch active product demo
  const handleSelectProductDemo = (demo: ProductDemo) => {
    setActiveProductDemo(demo);
    // Reset product feedback when switching demos
    setProductFeedback(null);
    setShowProductFeedback(true);
  };

  // Get the key for productDemo
  const getProductDemoKey = (demo: ProductDemo): string => {
    return demo._id;
  };

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      className="space-y-4 p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="border-b pb-3">
        <h4 className="font-bold text-lg mb-1">{talkTitle}</h4>
        <p className="text-gray-600 text-sm">by {speakerName}</p>
        {allProductDemos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {allProductDemos.map(demo => (
              <button
                key={getProductDemoKey(demo)}
                type="button"
                onClick={() => handleSelectProductDemo(demo)}
                className={`bg-blue-100 text-blue-800 text-xs font-medium py-1 px-2 rounded-full inline-flex items-center hover:bg-blue-200 transition-colors ${activeProductDemo?._id === demo._id ? 'ring-2 ring-blue-400' : ''}`}
              >
                <Box size={12} className="mr-1" />
                {demo.name}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          How would you rate this talk?
        </label>
        <div className="flex flex-col space-y-3">
          <div className="flex gap-2 items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Star
                  size={28}
                  fill={(hoverRating || rating) >= star ? '#FFC107' : 'none'}
                  color={(hoverRating || rating) >= star ? '#FFC107' : '#D1D5DB'}
                  strokeWidth={1.5}
                />
              </motion.button>
            ))}
            {(hoverRating > 0 || rating > 0) && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-2 text-sm text-gray-600"
              >
                {ratingDescriptions[hoverRating || rating]}
              </motion.span>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor={`comment-${talkId}`} className="block text-sm font-medium text-gray-700">
            Comments (optional)
          </label>
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
          >
            <MessageSquare size={14} className="mr-1" />
            {showPresets ? "Hide suggestions" : "Show suggestions"}
          </button>
        </div>

        {showPresets && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="p-3 bg-gray-50 rounded-md mb-2">
              <div className="text-xs text-gray-500 mb-2">Quick suggestions (click to add):</div>
              <div className="flex flex-wrap gap-2">
                {commentPresets.map((preset, index) => (
                  <motion.button
                    key={index}
                    type="button"
                    onClick={() => applyPreset(preset.value)}
                    className="px-2 py-1 text-xs bg-white hover:bg-gray-100 border border-gray-200 rounded-full text-gray-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {preset.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <textarea
          id={`comment-${talkId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like? Any suggestions for improvement?"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 transition-all"
        />
      </div>
      
      {/* Email field - only show if user is not logged in */}
      {(!isLoaded || !user) && (
        <div className="space-y-2">
          <label htmlFor={`email-${talkId}`} className="block text-sm font-medium text-gray-700">
            Email (optional)
          </label>
          <p className="text-xs text-gray-500">
            Share your email if you&apos;d like us to follow up about your feedback or product demo interest
          </p>
          <input
            id={`email-${talkId}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 transition-all"
          />
        </div>
      )}
      
      {/* Show a message when user is logged in */}
      {isLoaded && user && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium text-gray-700">Email</div>
            <div className="text-sm bg-green-50 text-green-700 px-2 py-1 rounded-full">
              Using your account email
            </div>
          </div>
          <p className="text-xs text-gray-500">
            We&apos;ll use your account email: {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      )}
      
      {/* Product Feedback Section */}
      {activeProductDemo && (
        <ProductFeedback 
          productDemo={activeProductDemo}
          onChange={handleProductFeedbackChange}
          expanded={showProductFeedback}
          onToggleExpand={() => setShowProductFeedback(!showProductFeedback)}
        />
      )}
      
      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm"
        >
          {errorMessage}
        </motion.div>
      )}
      
      <motion.button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors flex items-center justify-center ${
          rating === 0
            ? 'bg-gray-300 cursor-not-allowed'
            : isSubmitting
              ? 'bg-yellow-400 cursor-wait'
              : 'bg-yellow-500 hover:bg-yellow-600'
        }`}
        whileHover={rating > 0 && !isSubmitting ? { scale: 1.02 } : {}}
        whileTap={rating > 0 && !isSubmitting ? { scale: 0.98 } : {}}
      >
        {isSubmitting ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
            />
            Submitting...
          </>
        ) : (
          <>
            <ThumbsUp size={16} className="mr-2" />
            Submit Feedback
          </>
        )}
      </motion.button>
    </motion.form>
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
      productDemo?: ProductDemo | null;
      productDemos?: ProductDemo[];
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
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [mockDemosAdded, setMockDemosAdded] = useState<boolean>(false);
  const [eventWithMockDemos, setEventWithMockDemos] = useState(event);
  
  // Load previously submitted feedbacks from localStorage
  useEffect(() => {
    const storageKey = `zurichjs-feedback-${event.id}`;
    const storedFeedbacks = localStorage.getItem(storageKey);
    
    if (storedFeedbacks) {
      const feedbacks = JSON.parse(storedFeedbacks);
      setSubmittedFeedbacks(feedbacks);
      
      // Calculate completion percentage
      if (event.talks.length > 0) {
        const totalFeedbacks = event.talks.length;
        const submittedCount = Object.keys(feedbacks).length;
        setCompletionPercentage(Math.round((submittedCount / totalFeedbacks) * 100));
      }
    }

    // Reset event when the incoming event changes
    setEventWithMockDemos(event);
    setMockDemosAdded(false);
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
      
      // Recalculate completion percentage
      if (event.talks.length > 0) {
        const totalFeedbacks = event.talks.length;
        const submittedCount = Object.keys(updatedFeedbacks).length;
        setCompletionPercentage(Math.round((submittedCount / totalFeedbacks) * 100));
      }
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  };

  // Function to add mock product demos for testing
  const addMockProductDemos = () => {
    if (mockDemosAdded) {
      // If already added, remove them
      setEventWithMockDemos(event);
      setMockDemosAdded(false);
      return;
    }

    // Create mock product demos with required _id property
    const mockDemos = [
      {
        _id: 'sonarqube',
        name: 'SonarQube',
        description: 'Static code analysis tool that helps developers write cleaner and safer code.',
        logo: 'https://avatars.githubusercontent.com/u/545988?s=280&v=4',
        websiteUrl: 'https://www.sonarqube.org/'
      },
      {
        _id: 'imagekit',
        name: 'ImageKit',
        description: 'Real-time image optimization and transformation service.',
        logo: 'https://avatars.githubusercontent.com/u/34096591?s=280&v=4',
        websiteUrl: 'https://imagekit.io/'
      },
      {
        _id: 'stripe',
        name: 'Stripe',
        description: 'Payment processing platform for internet businesses.',
        logo: 'https://avatars.githubusercontent.com/u/856813?s=280&v=4',
        websiteUrl: 'https://stripe.com/'
      }
    ];

    // Clone the event talks to avoid mutating the original
    const updatedTalks = [...event.talks];
    
    // Add product demos to talks (up to 3)
    for (let i = 0; i < Math.min(updatedTalks.length, mockDemos.length); i++) {
      updatedTalks[i] = {
        ...updatedTalks[i],
        productDemo: mockDemos[i] as ProductDemo
      };
    }

    // Update the event with product demos
    setEventWithMockDemos({
      ...event,
      talks: updatedTalks
    });
    setMockDemosAdded(true);
  };
  
  if (!isFeedbackMode) {
    return null;
  }

  const totalForms = eventWithMockDemos.talks.length;
  const submittedForms = Object.keys(submittedFeedbacks).length;
  const mockDemoCount = eventWithMockDemos.talks.filter(talk => talk.productDemo).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-8 mb-12"
    >
      <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Share Your Feedback</h2>
            <p className="text-gray-700">
              Your feedback helps our speakers improve and guides future content.
              {eventWithMockDemos.talks.some(talk => talk.productDemo) && (
                <span className="block mt-1 text-blue-700">
                  <Box size={14} className="inline mr-1" />
                  Some talks included product demos. Your product feedback will help our sponsors.
                </span>
              )}
            </p>
          </div>
          
          {totalForms > 0 && (
            <div className="bg-white rounded-lg p-3 shadow-sm border border-yellow-100 min-w-[150px]">
              <p className="text-sm text-gray-600 mb-1">Completion Status:</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                <motion.div 
                  className="bg-yellow-500 h-2.5 rounded-full" 
                  initial={{ width: "0%" }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-right text-gray-600">
                {submittedForms} of {totalForms} complete ({completionPercentage}%)
              </p>
            </div>
          )}
        </div>

        {/* Dev mode testing button - only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-3 pt-3 border-t border-yellow-200">
            <button
              onClick={addMockProductDemos}
              className={`text-xs flex items-center ${
                mockDemosAdded ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              } px-2 py-1 rounded-md hover:bg-gray-200`}
            >
              <Beaker size={12} className="mr-1" />
              {mockDemosAdded 
                ? `Remove Test Product Demos (${mockDemoCount})` 
                : 'Add Test Product Demos'}
            </button>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        {eventWithMockDemos.talks.map((talk) => (
          <div key={talk.id}>
            {talk.speakers.map((speaker) => (
              <FeedbackForm
                key={`${talk.id}-${speaker.id}`}
                eventId={eventWithMockDemos.id}
                talkId={talk.id}
                talkTitle={talk.title}
                speakerId={speaker.id}
                speakerName={speaker.name}
                onSubmit={handleFeedbackSubmit}
                isSubmitted={!!submittedFeedbacks[talk.id]}
                productDemo={talk.productDemo || null}
                productDemos={talk.productDemos || []}
              />
            ))}
          </div>
        ))}
      </div>

      {completionPercentage === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center"
        >
          <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
          <h3 className="text-xl font-bold mb-2">Thank You!</h3>
          <p className="text-gray-700">
            You&apos;ve completed feedback for all talks. Your input is incredibly valuable to our community!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}