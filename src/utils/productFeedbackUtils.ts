import { mockProductDemos, ProductDemo } from "@/data/mockProductDemos";

interface ProductFeedbackData {
  productId: string;
  rating: number;
  interests: string[];
  questions: string;
  learningPreferences: string[];
}

interface FeedbackSummary {
  totalFeedback: number;
  averageRating: number;
  topInterests: { interest: string; count: number }[];
  topLearningPreferences: { preference: string; count: number }[];
  hasQuestions: number;
}

// Talk interface to properly type the functions
interface Talk {
  id: string;
  title: string;
  productDemo?: ProductDemo | null;
  // Other properties a talk might have
  [key: string]: unknown;
}

/**
 * Process product feedback data for analytics and tracking
 */
export const processProductFeedback = (feedback: ProductFeedbackData): void => {
  // In a real implementation, this would send the data to an analytics service
  // or store it in a database. For this demo, we'll just log it.
  console.log(`Processing product feedback for ${feedback.productId}:`, {
    rating: feedback.rating,
    interestsCount: feedback.interests.length,
    hasQuestions: feedback.questions.length > 0,
    learningPrefsCount: feedback.learningPreferences.length
  });
};

/**
 * Format product feedback data for a sponsor report
 */
export const formatSponsorReport = (
  productId: string, 
  feedbackItems: ProductFeedbackData[]
): string => {
  if (feedbackItems.length === 0) {
    return `No feedback available for ${productId}`;
  }

  // Get the product info
  const productInfo = mockProductDemos.find(demo => demo.id === productId);
  
  // Calculate summary stats
  const summary = summarizeFeedback(feedbackItems);
  
  // Format the report
  return `
## Product Feedback Report: ${productInfo?.name || productId}

### Summary
- Total feedback submissions: ${summary.totalFeedback}
- Average rating: ${summary.averageRating.toFixed(1)}/5.0
- Feedback with questions: ${summary.hasQuestions} (${Math.round((summary.hasQuestions / summary.totalFeedback) * 100)}%)

### Top Interests
${summary.topInterests.map(item => `- ${item.interest}: ${item.count} (${Math.round((item.count / summary.totalFeedback) * 100)}%)`).join('\n')}

### Preferred Learning Methods
${summary.topLearningPreferences.map(item => `- ${item.preference}: ${item.count} (${Math.round((item.count / summary.totalFeedback) * 100)}%)`).join('\n')}

### Follow-up Opportunities
- Attendees with questions: ${summary.hasQuestions}
- Interested in demo: ${summary.topInterests.find(i => i.interest.includes('demo'))?.count || 0}
- Interested in pricing: ${summary.topInterests.find(i => i.interest.includes('pricing'))?.count || 0}
  `;
};

/**
 * Summarize feedback data for analytics
 */
export const summarizeFeedback = (feedbackItems: ProductFeedbackData[]): FeedbackSummary => {
  const totalFeedback = feedbackItems.length;
  
  if (totalFeedback === 0) {
    return {
      totalFeedback: 0,
      averageRating: 0,
      topInterests: [],
      topLearningPreferences: [],
      hasQuestions: 0
    };
  }
  
  // Calculate average rating
  const totalRating = feedbackItems.reduce((sum, item) => sum + item.rating, 0);
  const averageRating = totalRating / totalFeedback;
  
  // Count feedback with questions
  const hasQuestions = feedbackItems.filter(item => item.questions.trim().length > 0).length;
  
  // Count interests
  const interestCounts: Record<string, number> = {};
  feedbackItems.forEach(item => {
    item.interests.forEach(interest => {
      interestCounts[interest] = (interestCounts[interest] || 0) + 1;
    });
  });
  
  // Count learning preferences
  const learningPreferenceCounts: Record<string, number> = {};
  feedbackItems.forEach(item => {
    item.learningPreferences.forEach(pref => {
      learningPreferenceCounts[pref] = (learningPreferenceCounts[pref] || 0) + 1;
    });
  });
  
  // Sort interests by count
  const topInterests = Object.entries(interestCounts)
    .map(([interest, count]) => ({ interest, count }))
    .sort((a, b) => b.count - a.count);
  
  // Sort learning preferences by count
  const topLearningPreferences = Object.entries(learningPreferenceCounts)
    .map(([preference, count]) => ({ preference, count }))
    .sort((a, b) => b.count - a.count);
  
  return {
    totalFeedback,
    averageRating,
    topInterests,
    topLearningPreferences,
    hasQuestions
  };
};

/**
 * Check if a talk has a product demo
 */
export const hasTalkProductDemo = (talk: Talk): boolean => {
  return !!talk.productDemo;
};

/**
 * Get product demo information from a talk
 */
export const getProductDemoFromTalk = (talk: Talk): ProductDemo | undefined | null => {
  return talk.productDemo;
};

/**
 * Determine if we should show product feedback based on the talk
 */
export const shouldShowProductFeedback = (talk: Talk): boolean => {
  // In a real implementation, this might check user session or other conditions
  return hasTalkProductDemo(talk);
}; 