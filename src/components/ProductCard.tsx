import { useState } from 'react';

// Component interfaces
interface SentimentGaugeProps {
  score: number;
  className?: string;
}

interface SentimentBreakdownProps {
  positive: number;
  neutral: number;
  negative: number;
  totalFeedback: number;
  className?: string;
}

interface InsightSummaryProps {
  summary: string;
  className?: string;
}

interface AudienceInterestsProps {
  interests: Array<{ interest: string; count: number }>;
  totalFeedback: number;
  className?: string;
}

interface LearningPreferencesProps {
  preferences: Array<{ preference: string; count: number }>;
  totalFeedback: number;
  className?: string;
}

interface ContactListProps {
  contacts: Array<{
    email: string;
    name?: string;
    company?: string;
    jobTitle?: string;
    followUp?: boolean;
    feedbackType?: string;
  }>;
  className?: string;
}

interface FeedbackTabsProps {
  detailedFeedback: string[];
  questions: string[];
  className?: string;
}

// Product feedback data interface
interface ProductFeedbackData {
  productId: string;
  productName: string;
  totalFeedback: number;
  averageRating: number;
  interests: Array<{ interest: string; count: number }>;
  learningPreferences: Array<{ preference: string; count: number }>;
  questions: string[];
  detailedFeedback: string[];
  sentimentAnalysis?: {
    positive: number;
    negative: number;
    neutral: number;
  };
  contactInfo?: Array<{
    email: string;
    name?: string;
    company?: string;
    jobTitle?: string;
    followUp?: boolean;
    feedbackType?: string;
  }>;
  insightSummary?: string;
}

// Props for ProductCard component
interface ProductCardProps {
  product: ProductFeedbackData;
  className?: string;
}

// Sentiment Gauge Component
const SentimentGauge = ({ score, className = "" }: SentimentGaugeProps) => {
  // Calculate the angle for the gauge needle based on score (0-100)
  const angle = -90 + (score * 1.8); // Map 0-100 to -90 to 90 degrees
  
  // Define color based on score
  let color = 'text-yellow-500';
  if (score >= 80) color = 'text-green-500';
  else if (score >= 60) color = 'text-green-400';
  else if (score >= 40) color = 'text-yellow-500';
  else if (score >= 20) color = 'text-orange-500';
  else color = 'text-red-500';
  
  return (
    <div className={`relative ${className}`}>
      <div className="flex justify-center mb-1">
        <div className="relative w-36 h-20">
          {/* Gauge background */}
          <div className="absolute top-0 left-0 w-full h-full">
            <svg viewBox="0 0 120 60" className="w-full h-full">
              <defs>
                <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="25%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="75%" stopColor="#84cc16" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
              <path 
                d="M 10,50 A 40,40 0 0,1 110,50" 
                fill="none" 
                stroke="url(#gauge-gradient)" 
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path 
                d="M 10,50 A 40,40 0 0,1 110,50" 
                fill="none" 
                stroke="#e5e7eb"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="157"
                strokeDashoffset="157"
                style={{ 
                  strokeDashoffset: `${(100-score) * 1.57}` 
                }}
              />
            </svg>
          </div>
          
          {/* Gauge needle */}
          <div 
            className="absolute top-0 left-0 w-full h-full flex justify-center"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div className="w-1 h-20 bg-gray-700 rounded-full origin-bottom transform -translate-y-5"></div>
          </div>
          
          {/* Score display */}
          <div className="absolute bottom-0 left-0 w-full flex justify-center">
            <div className={`text-2xl font-bold ${color}`}>{score}</div>
          </div>
        </div>
      </div>
      
      {/* Label text below gauge */}
      <div className="text-center">
        <div className="text-sm font-medium text-gray-700">Sentiment Score</div>
        <div className="group relative inline-block text-xs text-gray-500">
          <span className="flex items-center cursor-help underline decoration-dotted">
            How is this calculated?
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 w-60 z-10 p-2 bg-black text-xs text-white rounded shadow-lg">
            Sentiment scores are calculated using a weighted system:
            <ul className="mt-1 list-disc list-inside">
              <li>Positive feedback (4-5 stars): 10 points</li>
              <li>Neutral feedback (3 stars): 5 points</li>
              <li>Negative feedback (1-2 stars): 0 points</li>
            </ul>
            The final score is the average of all feedback points (0-100).
          </div>
        </div>
      </div>
    </div>
  );
};

// Sentiment Breakdown Component
const SentimentBreakdown = ({ positive, neutral, negative, totalFeedback, className = "" }: SentimentBreakdownProps) => {
  // Calculate percentages
  const positivePercent = totalFeedback > 0 ? Math.round((positive / totalFeedback) * 100) : 0;
  const neutralPercent = totalFeedback > 0 ? Math.round((neutral / totalFeedback) * 100) : 0;
  const negativePercent = totalFeedback > 0 ? Math.round((negative / totalFeedback) * 100) : 0;
  
  return (
    <div className={`${className}`}>
      <div className="mb-1 flex justify-between items-center">
        <div className="text-sm font-medium text-gray-700">Sentiment Breakdown</div>
        <div className="group relative inline-block text-xs text-gray-500">
          <span className="flex items-center cursor-help underline decoration-dotted">
            More info
            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full right-0 mb-2 w-60 z-10 p-2 bg-black text-xs text-white rounded shadow-lg">
            Feedback is categorized by rating:
            <ul className="mt-1 list-disc list-inside">
              <li>Positive: 4-5 star ratings</li>
              <li>Neutral: 3 star ratings</li>
              <li>Negative: 1-2 star ratings</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between items-center mb-1">
            <div className="text-xs text-green-800">Positive</div>
            <div className="text-xs text-green-800 font-medium">{positivePercent}% ({positive})</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full"
              style={{ width: `${positivePercent}%` }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <div className="text-xs text-yellow-800">Neutral</div>
            <div className="text-xs text-yellow-800 font-medium">{neutralPercent}% ({neutral})</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-yellow-500 h-1.5 rounded-full"
              style={{ width: `${neutralPercent}%` }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <div className="text-xs text-red-800">Negative</div>
            <div className="text-xs text-red-800 font-medium">{negativePercent}% ({negative})</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-red-500 h-1.5 rounded-full"
              style={{ width: `${negativePercent}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Insight Summary Component
const InsightSummary = ({ summary, className = "" }: InsightSummaryProps) => {
  if (!summary) return null;
  
  return (
    <div className={`${className}`}>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Key Insights</h4>
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
        <div className="flex gap-3">
          <div className="flex-shrink-0 text-indigo-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm text-indigo-900">{summary}</div>
        </div>
      </div>
    </div>
  );
};

// Audience Interests Component
const AudienceInterests = ({ interests, totalFeedback, className = "" }: AudienceInterestsProps) => {
  if (!interests || interests.length === 0) return null;
  
  return (
    <div className={`${className}`}>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Audience Interests</h4>
      <div className="space-y-2">
        {interests.slice(0, 5).map((item, index) => {
          const percentage = totalFeedback > 0 ? Math.round((item.count / totalFeedback) * 100) : 0;
          
          return (
            <div key={index}>
              <div className="flex justify-between items-center mb-1">
                <div className="text-xs text-gray-700 truncate">{item.interest}</div>
                <div className="text-xs text-gray-700 font-medium">{percentage}%</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Learning Preferences Component
const LearningPreferences = ({ preferences, totalFeedback, className = "" }: LearningPreferencesProps) => {
  if (!preferences || preferences.length === 0) return null;
  
  return (
    <div className={`${className}`}>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Learning Preferences</h4>
      <div className="flex flex-wrap gap-2">
        {preferences.map((item, index) => {
          const percentage = totalFeedback > 0 ? Math.round((item.count / totalFeedback) * 100) : 0;
          
          return (
            <div key={index} className="bg-indigo-50 rounded-full px-3 py-1">
              <div className="text-xs text-indigo-800">
                {item.preference} <span className="font-medium">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Contact List Component
const ContactList = ({ contacts, className = "" }: ContactListProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!contacts || contacts.length === 0) return null;
  
  // Group contacts by feedback type
  const positiveContacts = contacts.filter(c => c.feedbackType === 'positive');
  const neutralContacts = contacts.filter(c => c.feedbackType === 'neutral');
  const negativeContacts = contacts.filter(c => c.feedbackType === 'negative');
  const followUpContacts = contacts.filter(c => c.followUp);
  
  return (
    <div className={`${className}`}>
      <button 
        className="w-full flex justify-between items-center text-sm font-medium text-gray-700 mb-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>Attendee Contacts ({contacts.length})</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 overflow-y-auto max-h-64">
          {followUpContacts.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-green-700 mb-1">
                Requested Follow-up ({followUpContacts.length})
              </div>
              <div className="space-y-2">
                {followUpContacts.map((contact, index) => (
                  <div key={index} className="text-xs bg-green-50 border border-green-100 rounded p-2">
                    <div className="font-medium">{contact.name || contact.email}</div>
                    <div className="text-gray-600">{contact.email}</div>
                    {(contact.company || contact.jobTitle) && (
                      <div className="text-gray-600">
                        {contact.jobTitle && contact.jobTitle}{contact.jobTitle && contact.company ? ' at ' : ''}
                        {contact.company && contact.company}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {positiveContacts.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-green-700 mb-1">
                Positive Feedback ({positiveContacts.length})
              </div>
              <div className="space-y-1">
                {positiveContacts.map((contact, index) => (
                  <div key={index} className="text-xs">
                    {contact.email} {contact.name ? `(${contact.name})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {neutralContacts.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-yellow-700 mb-1">
                Neutral Feedback ({neutralContacts.length})
              </div>
              <div className="space-y-1">
                {neutralContacts.map((contact, index) => (
                  <div key={index} className="text-xs">
                    {contact.email} {contact.name ? `(${contact.name})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {negativeContacts.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-red-700 mb-1">
                Negative Feedback ({negativeContacts.length})
              </div>
              <div className="space-y-1">
                {negativeContacts.map((contact, index) => (
                  <div key={index} className="text-xs">
                    {contact.email} {contact.name ? `(${contact.name})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Feedback Tabs Component
const FeedbackTabs = ({ detailedFeedback, questions, className = "" }: FeedbackTabsProps) => {
  const [activeTab, setActiveTab] = useState<'feedback' | 'questions'>('feedback');
  
  const hasFeedback = detailedFeedback && detailedFeedback.length > 0;
  const hasQuestions = questions && questions.length > 0;
  
  if (!hasFeedback && !hasQuestions) return null;
  
  return (
    <div className={`${className}`}>
      <div className="flex border-b">
        <button
          className={`text-xs py-2 px-4 font-medium ${
            activeTab === 'feedback'
              ? 'text-indigo-700 border-b-2 border-indigo-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('feedback')}
        >
          Detailed Feedback ({detailedFeedback.length})
        </button>
        <button
          className={`text-xs py-2 px-4 font-medium ${
            activeTab === 'questions'
              ? 'text-indigo-700 border-b-2 border-indigo-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('questions')}
        >
          Questions ({questions.length})
        </button>
      </div>
      
      <div className="p-3 overflow-y-auto max-h-32">
        {activeTab === 'feedback' && hasFeedback ? (
          <div className="space-y-2">
            {detailedFeedback.map((feedback, index) => (
              <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                &ldquo;{feedback}&rdquo;
              </div>
            ))}
          </div>
        ) : null}
        
        {activeTab === 'questions' && hasQuestions ? (
          <div className="space-y-2">
            {questions.map((question, index) => (
              <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                &ldquo;{question}&rdquo;
              </div>
            ))}
          </div>
        ) : null}
        
        {/* Empty state messages */}
        {activeTab === 'feedback' && !hasFeedback ? (
          <div className="text-center text-sm text-gray-500 py-2">
            No detailed feedback available
          </div>
        ) : null}
        
        {activeTab === 'questions' && !hasQuestions ? (
          <div className="text-center text-sm text-gray-500 py-2">
            No questions available
          </div>
        ) : null}
      </div>
    </div>
  );
};

// Main ProductCard Component
const ProductCard = ({ product, className = "" }: ProductCardProps) => {
  // Calculate sentiment score
  const calculateSentimentScore = () => {
    if (!product.sentimentAnalysis) return 50; // Default neutral score
    
    const { positive, neutral, negative } = product.sentimentAnalysis;
    const total = positive + neutral + negative;
    
    if (total === 0) return 50;
    
    // Calculate weighted score: positive=10pts, neutral=5pts, negative=0pts
    const score = ((positive * 10) + (neutral * 5)) / total;
    
    // Scale to 0-100
    return Math.round(score * 10);
  };
  
  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
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

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-indigo-900">{product.productName}</h3>
            <div className="flex items-center mt-1 text-sm text-gray-600">
              <div className="flex items-center">
                {renderStars(product.averageRating)}
                <span className="ml-2 font-medium">{product.averageRating.toFixed(1)}</span>
              </div>
              <span className="mx-2">•</span>
              <span>{product.totalFeedback} {product.totalFeedback === 1 ? 'review' : 'reviews'}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div>
            {/* Sentiment Score */}
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <SentimentGauge 
                  score={calculateSentimentScore()} 
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Sentiment Breakdown */}
            {product.sentimentAnalysis && (
              <SentimentBreakdown
                positive={product.sentimentAnalysis.positive}
                neutral={product.sentimentAnalysis.neutral}
                negative={product.sentimentAnalysis.negative}
                totalFeedback={product.totalFeedback}
                className="mb-6"
              />
            )}
            
            {/* Insight Summary */}
            {product.insightSummary && (
              <InsightSummary
                summary={product.insightSummary}
                className="mb-6"
              />
            )}
            
            {/* Contact Info */}
            {product.contactInfo && product.contactInfo.length > 0 && (
              <ContactList
                contacts={product.contactInfo}
                className="mb-4"
              />
            )}
          </div>
          
          {/* Right Column */}
          <div>
            {/* Audience Interests */}
            <AudienceInterests
              interests={product.interests}
              totalFeedback={product.totalFeedback}
              className="mb-6"
            />
            
            {/* Learning Preferences */}
            <LearningPreferences
              preferences={product.learningPreferences}
              totalFeedback={product.totalFeedback}
              className="mb-6"
            />
            
            {/* Feedback & Questions Tabs */}
            <FeedbackTabs
              detailedFeedback={product.detailedFeedback}
              questions={product.questions}
              className="mt-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 