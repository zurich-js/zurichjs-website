import axios from 'axios';
import { motion } from 'framer-motion';
import { GetServerSideProps } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/SEO';

// Define interfaces for the speaker feedback data structure
interface FeedbackItem {
  _id: string;
  submittedAt: string;
  rating: number;
  comment?: string;
  email?: string;
  attendeeInfo?: {
    name?: string;
    company?: string;
    jobTitle?: string;
    followUp?: boolean;
  };
  event: {
    _id: string;
    title: string;
    date?: string;
    datetime: string;
  };
  talk: {
    _id: string;
    title: string;
    id?: {
      _type: string;
      current: string;
    };
  };
  speaker: {
    _id: string;
    name: string;
    image: string;
    id?: {
      _type: string;
      current: string;
    };
  };
  productFeedback?: {
    product: {
      _id: string;
      name: string;
      description: string;
      logo?: {
        asset: {
          url: string;
        }
      };
      websiteUrl?: string;
      _createdAt?: string;
      _rev?: string;
      _type?: string;
      _updatedAt?: string;
      id?: {
        _type?: string;
        current: string;
      };
    };
    rating: number;
    interests: string[];
    questions: string;
    learningPreferences: string[];
    detailedFeedback: string | null;
  };
}

// Define interface for product interest item
interface ProductInterest {
  interest: string;
  count: number;
}

// Define interface for product learning preference item
interface ProductLearningPreference {
  preference: string;
  count: number;
}

// Define interface for product feedback data
interface ProductFeedbackData {
  productId: string; 
  productName: string; 
  productLogo?: string; // Added for logo display
  websiteUrl?: string; // Added for linking to product website
  totalFeedback: number;
  averageRating: number;
  interests: ProductInterest[];
  learningPreferences: ProductLearningPreference[];
  questions: string[];
  detailedFeedback: string[];
  sentimentAnalysis?: {
    positive: number;
    negative: number;
    neutral: number;
  };
  contactInfo?: {
    email: string;
    name?: string;
    company?: string;
    jobTitle?: string;
    followUp?: boolean;
    feedbackType?: string;
  }[];
  insightSummary?: string;
}

// Props for ProductAnalytics component
interface ProductAnalyticsProps {
  productFeedbackByProduct: ProductFeedbackData[];
  className?: string;
}

// Helper function to render product feedback analytics
const ProductAnalytics = ({ productFeedbackByProduct, className = "" }: ProductAnalyticsProps) => {

  // Add state for managing tab selection for each product card
  const [activeTabMap, setActiveTabMap] = useState<Record<string, 'feedback' | 'questions'>>({});

  // Function to handle tab switching
  const handleTabChange = (productId: string, tab: 'feedback' | 'questions') => {
    setActiveTabMap(prev => ({
      ...prev,
      [productId]: tab
    }));
  };
  
  // Helper function to calculate sentiment score (0-10)
  const getSentimentScore = (product: ProductFeedbackData): string => {

    if (!product.sentimentAnalysis || product.totalFeedback === 0) return '0.0';
    
    // Calculate weighted score with a more nuanced approach:
    // - Positive feedback is weighted more heavily (multiplier 10)
    // - Neutral feedback has a medium impact (multiplier 5) 
    // - Negative feedback slightly lowers the score (multiplier 0)
    // This creates a score between 0-10
    const weightedPositive = product.sentimentAnalysis.positive * 10;
    const weightedNeutral = product.sentimentAnalysis.neutral * 5;
    const totalWeightedPoints = weightedPositive + weightedNeutral;
    const maxPossiblePoints = product.totalFeedback * 10;
    
    // Calculate normalized score (0-10 scale)
    const score = (totalWeightedPoints / maxPossiblePoints) * 10;
    
    // Return score with one decimal place
    return score.toFixed(1);
  };
  
  // Helper function to get sentiment label based on score
  const getSentimentLabel = (product: ProductFeedbackData): string => {
    const score = parseFloat(getSentimentScore(product));
    
    if (score >= 8.5) return "Excellent";
    if (score >= 7.0) return "Very Good";
    if (score >= 6.0) return "Good";
    if (score >= 5.0) return "Satisfactory";
    if (score >= 3.5) return "Mixed";
    if (score >= 2.0) return "Concerning";
    return "Poor";
  };
  
  // Helper function to get sentiment color based on score
  const getSentimentColor = (product: ProductFeedbackData): string => {
    const score = parseFloat(getSentimentScore(product));
    
    if (score >= 8.5) return "text-emerald-600";
    if (score >= 7.0) return "text-green-600";
    if (score >= 6.0) return "text-lime-600";
    if (score >= 5.0) return "text-yellow-500";
    if (score >= 3.5) return "text-amber-500";
    if (score >= 2.0) return "text-orange-500";
    return "text-red-600";
  };
  
  // Helper function to calculate rotation angle for sentiment gauge (0-180 degrees)
  const getSentimentRotation = (product: ProductFeedbackData): number => {
    if (!product.sentimentAnalysis || product.totalFeedback === 0) return 90; // Neutral position
    
    const score = parseFloat(getSentimentScore(product));
    // Map score 0-10 to rotation 0-180
    return Math.min(Math.max(score * 18, 0), 180);
  };
  
  // Helper function to format insight summary as bullet points
  const formatInsightSummary = (summary: string): string[] => {
    if (!summary) return [];
    
    // Split by period and filter out empty strings
    return summary
      .split('.')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };
  
  // Helper function to generate recommendations based on product feedback
  const getRecommendation = (product: ProductFeedbackData): string => {
    if (!product.sentimentAnalysis || product.totalFeedback === 0) {
      return "Collect more feedback to get actionable recommendations.";
    }
    
    const score = parseFloat(getSentimentScore(product));
    
    if (score >= 8.5) {
      return "This product is performing exceptionally well. Highlight it in marketing materials and consider it a flagship example for future presentations.";
    } else if (score >= 7.0) {
      return "This product is very well-received. Continue highlighting its strengths while making minor improvements based on specific feedback.";
    } else if (score >= 6.0) {
      return "This product is performing well. Consider addressing specific points from detailed feedback to elevate its reception further.";
    } else if (score >= 5.0) {
      return "This product is performing adequately. Focus on addressing the most common questions and concerns to improve future presentations.";
    } else if (score >= 3.5) {
      return "This product has mixed reception. Review the negative feedback carefully and consider refining your presentation approach.";
    } else if (score >= 2.0) {
      return "There are significant concerns with this product's presentation. Consider revising your messaging or addressing product limitations.";
    } else {
      return "This product needs substantial improvement in how it's presented. Consider a fundamental reassessment of the demo strategy.";
    }
  };

  if (!productFeedbackByProduct || productFeedbackByProduct.length === 0) {
    return (
      <div className={`mt-8 ${className}`}>
        <h2 className="text-3xl font-bold mb-3 text-indigo-800">Product Demo Analytics</h2>
        <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-indigo-100">
          <div className="text-indigo-300 mb-4">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-indigo-800 mb-3">No Product Demo Feedback Yet</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            There is no product demo feedback available for your talks yet. Once attendees provide feedback on your product demos, you&apos;ll see analytics here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-8 ${className}`}>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-3 text-indigo-800">Product Demo Analytics</h2>
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm flex-shrink-0 border border-indigo-100">
              <div className="text-4xl font-bold text-indigo-700">{productFeedbackByProduct.length}</div>
              <div className="text-gray-600 text-sm">Product{productFeedbackByProduct.length !== 1 ? 's' : ''}</div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-indigo-800 mb-2">Audience Product Feedback</h3>
              <p className="text-gray-700">
                This dashboard provides comprehensive insights from audience feedback on your product demonstrations. 
                Use these analytics to understand audience interests, preferences, and sentiment.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {productFeedbackByProduct.map((product: ProductFeedbackData) => (
          <div key={product.productId} className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden">
            {/* Product Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  {product.productLogo && (
                    <div className="w-8 h-8 mr-3 bg-white rounded-full overflow-hidden flex-shrink-0">
                      <Image 
                        src={product.productLogo}
                        alt={product.productName}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>
                  )}
                  <h3 className="text-xl font-bold">{product.productName}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {product.websiteUrl && (
                    <a 
                      href={product.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-white/80 transition-colors"
                      title="Visit product website"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 text-white text-sm">
                    {product.totalFeedback} {product.totalFeedback === 1 ? 'response' : 'responses'}
                  </div>
                </div>
              </div>
              
              {/* Rating display */}
              <div className="mt-4 flex items-center">
                <div className="bg-white bg-opacity-10 rounded-full px-4 py-1 flex items-center">
                  <span className="text-2xl font-bold mr-2">{product.averageRating.toFixed(1)}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(product.averageRating) ? 'text-yellow-300' : 'text-white text-opacity-30'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Key Insights Section */}
            {product.insightSummary && (
              <div className="px-6 py-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                <div className="flex items-start">
                  <div className="mr-3 text-indigo-600 mt-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-indigo-800 mb-2">Key Insights</h4>
                    
                    {/* Convert insight summary into bullet points */}
                    <ul className="space-y-2 text-sm text-indigo-900">
                      {formatInsightSummary(product.insightSummary).map((insight, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-indigo-500 mr-2 mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Actionable recommendation based on sentiment */}
                    {product.sentimentAnalysis && (
                      <div className="mt-3 pt-3 border-t border-indigo-200">
                        <div className="text-sm font-medium text-indigo-700">
                          Recommended Action:
                        </div>
                        <p className="text-sm text-indigo-800 mt-1">
                          {getRecommendation(product)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div>
                {/* Sentiment Analysis */}
                {product.sentimentAnalysis && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      Audience Sentiment
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-5 relative">
                      {/* Sentiment Gauge */}
                      <div className="flex flex-col items-center mb-4">
                        <div className="relative w-36 h-18 overflow-hidden mb-1">
                          {/* Semicircular gauge background */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-36 h-36 bg-gradient-to-b from-gray-200 to-gray-100 rounded-full"></div>
                          </div>
                          
                          {/* Gauge scale markers */}
                          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center">
                            <div className="w-32 h-16 relative">
                              {/* Scale markings */}
                              <div className="absolute bottom-0 left-0 right-0 flex justify-between">
                                {[...Array(6)].map((_, i) => (
                                  <div key={i} className="h-2 w-0.5 bg-gray-400" style={{ 
                                    position: 'absolute', 
                                    left: `${i * 20}%`, 
                                    bottom: '0'
                                  }}></div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Needle */}
                          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center">
                            <div 
                              className="w-1 h-12 bg-indigo-600 origin-bottom transform transition-transform duration-500 ease-in-out"
                              style={{ transform: `rotate(${getSentimentRotation(product)}deg)` }}
                            ></div>
                            <div className="absolute bottom-0 w-3 h-3 rounded-full bg-indigo-600 transform -translate-x-1/2 -translate-y-0"></div>
                          </div>
                          
                          {/* Gauge labels */}
                          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                            <span className="text-xs text-red-500 -ml-1">0</span>
                            <span className="text-xs text-yellow-500 translate-x-2/3">5</span>
                            <span className="text-xs text-green-500 -mr-1">10</span>
                          </div>
                        </div>
                        
                        {/* Score and sentiment label */}
                        <div className={`mt-1 text-xl font-bold ${getSentimentColor(product)}`}>
                          {getSentimentScore(product)}
                          <span className="ml-1 relative group">
                            <svg className="w-4 h-4 text-gray-400 inline cursor-pointer" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-white shadow-lg rounded-lg border border-gray-200 text-xs text-left opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10">
                              <div className="font-medium text-gray-800 mb-1">How Sentiment Score is Calculated:</div>
                              <ul className="list-disc ml-3 space-y-1 text-gray-600">
                                <li>Positive feedback: counts as 10 points</li>
                                <li>Neutral feedback: counts as 5 points</li>
                                <li>Negative feedback: counts as 0 points</li>
                              </ul>
                              <div className="mt-2 text-gray-700">
                                Score = (Total points ÷ Maximum possible points) × 10
                              </div>
                              <div className="mt-1 text-gray-500 italic">
                                Scale: 0 (poor) to 10 (excellent)
                              </div>
                              <div className="absolute w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45 -bottom-1 left-1/2 -translate-x-1/2"></div>
                            </div>
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-600">{getSentimentLabel(product)}</div>
                        
                        {/* Sentiment Breakdown */}
                        <div className="mt-4 w-full">
                          <div className="flex justify-between items-center mb-1 text-xs text-gray-600">
                            <span className="flex items-center">
                              Breakdown
                              <span className="ml-1 relative group">
                                <svg className="w-3.5 h-3.5 text-gray-400 cursor-pointer" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div className="absolute bottom-full left-0 mb-2 w-72 p-3 bg-white shadow-lg rounded-lg border border-gray-200 text-xs text-left opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10">
                                  <div className="font-medium text-gray-800 mb-1">Sentiment Analysis Methodology</div>
                                  <p className="text-gray-600 mb-2">
                                    Our sentiment analysis classifies feedback into three categories based on ratings:
                                  </p>
                                  <ul className="list-disc ml-3 space-y-1 text-gray-600">
                                    <li><span className="text-green-600 font-medium">Positive</span>: Ratings of 4-5 out of 5</li>
                                    <li><span className="text-yellow-600 font-medium">Neutral</span>: Rating of 3 out of 5</li>
                                    <li><span className="text-red-600 font-medium">Negative</span>: Ratings of 1-2 out of 5</li>
                                  </ul>
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <div className="font-medium text-gray-700">Score Calculation:</div>
                                    <div className="text-gray-600 mt-1">
                                      <code className="bg-gray-100 px-1 py-0.5 rounded">Score = ((P×10 + N×5) ÷ (Total×10)) × 10</code>
                                    </div>
                                    <div className="mt-1 text-gray-500">
                                      Where: P = Positive count, N = Neutral count
                                    </div>
                                  </div>
                                  <div className="absolute w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45 -bottom-1 left-4"></div>
                                </div>
                              </span>
                            </span>
                            <span>{product.totalFeedback} responses</span>
                          </div>
                          
                          {/* Sentiment Progress Bar */}
                          <div className="bg-gray-100 rounded-full h-3 overflow-hidden mb-2">
                            <div className="flex h-full">
                              <div 
                                className="bg-green-500 h-full transition-all duration-500" 
                                style={{ width: `${(product.sentimentAnalysis.positive / product.totalFeedback) * 100}%` }}
                              ></div>
                              <div 
                                className="bg-yellow-400 h-full transition-all duration-500" 
                                style={{ width: `${(product.sentimentAnalysis.neutral / product.totalFeedback) * 100}%` }}
                              ></div>
                              <div 
                                className="bg-red-500 h-full transition-all duration-500" 
                                style={{ width: `${(product.sentimentAnalysis.negative / product.totalFeedback) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Sentiment Counters */}
                          <div className="grid grid-cols-3 gap-1 text-center">
                            <div className="bg-green-50 rounded-md p-1.5 border border-green-100">
                              <div className="text-sm font-semibold text-green-700">{product.sentimentAnalysis.positive}</div>
                              <div className="text-xs text-green-600">Positive</div>
                            </div>
                            <div className="bg-yellow-50 rounded-md p-1.5 border border-yellow-100">
                              <div className="text-sm font-semibold text-yellow-700">{product.sentimentAnalysis.neutral}</div>
                              <div className="text-xs text-yellow-600">Neutral</div>
                            </div>
                            <div className="bg-red-50 rounded-md p-1.5 border border-red-100">
                              <div className="text-sm font-semibold text-red-700">{product.sentimentAnalysis.negative}</div>
                              <div className="text-xs text-red-600">Negative</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Audience Interests */}
                {product.interests.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm9 4a1 1 0 10-2 0v6a1 1 0 102 0V7zm-3 2a1 1 0 10-2 0v4a1 1 0 102 0V9zm-3 3a1 1 0 10-2 0v1a1 1 0 102 0v-1z" clipRule="evenodd" />
                      </svg>
                      Audience Interests
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-3">
                        {product.interests.slice(0, 5).map((item: ProductInterest, index: number) => (
                          <div key={index}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700">{item.interest}</span>
                              <span className="text-indigo-700 font-medium">{Math.round((item.count / product.totalFeedback) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${(item.count / product.totalFeedback) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column */}
              <div>
                {/* Learning Preferences */}
                {product.learningPreferences.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                      Learning Preferences
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {product.learningPreferences.map((item: ProductLearningPreference, index: number) => (
                          <div
                            key={index}
                            className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm flex items-center"
                          >
                            {item.preference}
                            <span className="ml-1 bg-indigo-200 text-indigo-800 rounded-full px-1.5 text-xs font-semibold">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Contact List - Collapsible Section */}
                {product.contactInfo && product.contactInfo.length > 0 && (
                  <div>
                    <details className="group mb-6">
                      <summary className="font-semibold text-gray-700 flex items-center cursor-pointer list-none">
                        <svg className="w-4 h-4 mr-2 text-indigo-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        Contact List
                        <svg className="w-4 h-4 ml-2 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="mt-3 bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-3">Attendees who provided feedback ({product.contactInfo.length})</p>
                        <div className="max-h-40 overflow-y-auto pr-2">
                          <ul className="divide-y divide-gray-200">
                            {product.contactInfo.map((contact, index) => (
                              <li key={index} className="py-2">
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full mr-2 ${
                                    contact.feedbackType === 'positive' ? 'bg-green-500' :
                                    contact.feedbackType === 'negative' ? 'bg-red-500' : 'bg-yellow-400'
                                  }`}></div>
                                  <span className="text-sm font-medium">{contact.email}</span>
                                  {contact.followUp && (
                                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">Follow up</span>
                                  )}
                                </div>
                                {contact.name && (
                                  <div className="text-xs text-gray-500 ml-4">
                                    {contact.name}{contact.company ? ` - ${contact.company}` : ''}
                                    {contact.jobTitle ? `, ${contact.jobTitle}` : ''}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tabs for Questions and Detailed Feedback */}
            {(product.questions.length > 0 || product.detailedFeedback.length > 0) && (
              <div className="border-t border-gray-200">
                <div className="bg-gray-50">
                  <div role="tablist" className="flex border-b border-gray-200">
                    <button 
                      role="tab"
                      aria-selected={!activeTabMap[product.productId] || activeTabMap[product.productId] === 'feedback'} 
                      className={`px-4 py-3 text-sm font-medium ${
                        !activeTabMap[product.productId] || activeTabMap[product.productId] === 'feedback' 
                          ? 'text-indigo-700 border-b-2 border-indigo-500 bg-white'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => handleTabChange(product.productId, 'feedback')}
                    >
                      Feedback
                    </button>
                    {product.questions.length > 0 && (
                      <button 
                        role="tab"
                        aria-selected={activeTabMap[product.productId] === 'questions'}
                        className={`px-4 py-3 text-sm font-medium ${
                          activeTabMap[product.productId] === 'questions'
                            ? 'text-indigo-700 border-b-2 border-indigo-500 bg-white'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => handleTabChange(product.productId, 'questions')}
                      >
                        Questions {product.questions.length > 0 && `(${product.questions.length})`}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Feedback Panel */}
                <div role="tabpanel" 
                  className={`p-6 ${!activeTabMap[product.productId] || activeTabMap[product.productId] === 'feedback' ? 'block' : 'hidden'}`}
                >
                  {product.detailedFeedback.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {product.detailedFeedback.map((feedback: string, index: number) => (
                        feedback && (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border border-gray-200">
                            &ldquo;{feedback}&rdquo;
                          </div>
                        )
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">No detailed feedback available</div>
                  )}
                </div>
                
                {/* Questions Panel */}
                {product.questions.length > 0 && (
                  <div role="tabpanel" 
                    className={`p-6 ${activeTabMap[product.productId] === 'questions' ? 'block' : 'hidden'}`}
                  >
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {product.questions.map((question: string, index: number) => (
                        question && (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border border-gray-200">
                            <div className="flex">
                              <div className="text-indigo-500 mr-2 flex-shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div>&ldquo;{question}&rdquo;</div>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface SpeakerFeedbackPageProps {
  feedbackData: FeedbackItem[];
  error: string | null;
}

export default function SpeakerFeedbackPage({ feedbackData, error }: SpeakerFeedbackPageProps) {

  const router = useRouter();
  const { token } = router.query;
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'talks' | 'products'>('talks');

  // Tab change handler
  const handleTabChange = (tab: 'talks' | 'products') => {
    setActiveTab(tab);
  };

  // Set isMounted to true when component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

    // Group product feedback for analysis
    const productMap = new Map<string, {
      productId: string;
      productName: string;
      productLogo?: string;
      websiteUrl?: string;
      ratings: number[];
      interests: string[];
      learningPreferences: string[];
      questions: string[];
      detailedFeedback: string[];
    }>();
    let totalProductRating = 0;
    let totalProductFeedback = 0;

    feedbackData.forEach(item => {
      if (!talkMap.has(item.talk._id)) {
        talkMap.set(item.talk._id, {
          talkId: item.talk._id,
          talkTitle: item.talk.title,
          eventTitle: item.event.title,
          eventDate: item.event.date || item.event.datetime,
          ratings: [],
          comments: [],
          productFeedback: [] as FeedbackItem['productFeedback'][]
        });
      }

      const talkData = talkMap.get(item.talk._id);
      talkData.ratings.push(item.rating);
      if (item.comment) talkData.comments.push(item.comment);
      
      // Process product feedback if available
      if (item.productFeedback) {
        // Add original productFeedback to the talk data
        talkData.productFeedback.push(item.productFeedback);
        
        // Add to product map for cross-talk analysis
        let productId = null;
        
        // Get product ID, handling different possible structures
        if (item.productFeedback.product) {
          // Direct _id property
          if (item.productFeedback.product._id) {
            productId = item.productFeedback.product._id;
          }
          // Handle case where id might be in a nested structure
          else if (item.productFeedback.product.id?.current) {
            productId = item.productFeedback.product.id.current;
          }
        }
        
        // Normalize productId to string to ensure consistent matching
        const normalizedProductId = productId ? String(productId) : null;
        
        if (normalizedProductId && !productMap.has(normalizedProductId)) {
          productMap.set(normalizedProductId, {
            productId: normalizedProductId,
            productName: item.productFeedback.product?.name || 'Unknown Product',
            productLogo: item.productFeedback.product?.logo?.asset?.url,
            websiteUrl: item.productFeedback.product?.websiteUrl,
            ratings: [],
            interests: [],
            learningPreferences: [],
            questions: [],
            detailedFeedback: []
          });
        }
        
        if (normalizedProductId) {
          const productData = productMap.get(normalizedProductId);
          if (productData) {
            productData.ratings.push(item.productFeedback.rating);
            if (item.productFeedback.interests && Array.isArray(item.productFeedback.interests)) {
              productData.interests = [...productData.interests, ...item.productFeedback.interests];
            }
            if (item.productFeedback.learningPreferences && Array.isArray(item.productFeedback.learningPreferences)) {
              productData.learningPreferences = [...productData.learningPreferences, ...item.productFeedback.learningPreferences];
            }
            if (item.productFeedback.questions && typeof item.productFeedback.questions === 'string') {
              productData.questions.push(item.productFeedback.questions);
            }
            if (item.productFeedback.detailedFeedback) {
              productData.detailedFeedback.push(item.productFeedback.detailedFeedback);
            }
          }
        }
        
        totalProductRating += item.productFeedback.rating;
        totalProductFeedback++;
      }
      
      totalRating += item.rating;
    });

    // Calculate stats for each talk
    const feedbackByTalk = Array.from(talkMap.values()).map(talk => {
      const totalFeedback = talk.ratings.length;
      const averageRating = totalFeedback > 0
        ? talk.ratings.reduce((sum: number, rating: number) => sum + rating, 0) / totalFeedback
        : 0;

      // Process product feedback for this talk
      const productFeedbackCount = talk.productFeedback.length;
      const hasProductFeedback = productFeedbackCount > 0;
      const talkProductMap = new Map();
      
      if (hasProductFeedback) {
        talk.productFeedback.forEach((feedback: NonNullable<FeedbackItem['productFeedback']>) => {
          if (feedback && feedback.product) {
            // Get product ID, handling different possible structures
            let productId = null;
            
            // Direct _id property
            if (feedback.product._id) {
              productId = feedback.product._id;
            }
            // Handle case where id might be in a nested structure
            else if (feedback.product.id?.current) {
              productId = feedback.product.id.current;
            }
            
            // Normalize productId to string to ensure consistent matching
            const normalizedProductId = productId ? String(productId) : null;
            
            if (normalizedProductId && !talkProductMap.has(normalizedProductId)) {
              talkProductMap.set(normalizedProductId, {
                productId: normalizedProductId,
                productName: feedback.product.name || 'Unknown Product',
                productLogo: feedback.product.logo?.asset?.url,
                websiteUrl: feedback.product.websiteUrl,
                ratings: [],
                interests: [],
                detailedFeedback: []
              });
            }
            
            if (normalizedProductId) {
              const product = talkProductMap.get(normalizedProductId);
              if (product) {
                product.ratings.push(feedback.rating);
                if (feedback.interests && Array.isArray(feedback.interests)) {
                  product.interests = [...product.interests, ...feedback.interests];
                }
                if (feedback.detailedFeedback) {
                  product.detailedFeedback.push(feedback.detailedFeedback);
                }
              }
            }
          }
        });
      }
      
      // Calculate product stats for this talk
      const productStats = Array.from(talkProductMap.values()).map(product => {
        const ratings = product.ratings;
        const averageRating = ratings.length > 0
          ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length
          : 0;
          
        // Count interest occurrences
        const interestCounts = product.interests.reduce((counts: Record<string, number>, interest: string) => {
          counts[interest] = (counts[interest] || 0) + 1;
          return counts;
        }, {});
        
        // Sort interests by frequency
        const topInterests = Object.entries(interestCounts)
          .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
          .slice(0, 3)
          .map(([interest]) => interest);
          
        return {
          productId: product.productId,
          productName: product.productName,
          productLogo: product.productLogo,
          websiteUrl: product.websiteUrl,
          feedbackCount: ratings.length,
          averageRating,
          topInterests,
          detailedFeedback: product.detailedFeedback
        };
      });

      return {
        talkTitle: talk.talkTitle,
        eventTitle: talk.eventTitle,
        eventDate: talk.eventDate,
        totalFeedback,
        averageRating,
        comments: talk.comments,
        hasProductFeedback,
        productFeedbackCount,
        productStats
      };
    });

    // Process overall product data
    const productFeedbackByProduct = Array.from(productMap.values()).map(product => {
      const ratings = product.ratings;
      const totalFeedback = ratings.length;
      const averageRating = totalFeedback > 0
        ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / totalFeedback
        : 0;
      
      // Count interest occurrences  
      const interestCounts = product.interests.reduce((counts: Record<string, number>, interest: string) => {
        counts[interest] = (counts[interest] || 0) + 1;
        return counts;
      }, {});
      
      // Sort interests by frequency
      const interests = Object.entries(interestCounts)
        .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
        .map(([interest, count]) => ({
          interest,
          count
        }));
        
      // Count learning preference occurrences
      const learningCounts = product.learningPreferences.reduce((counts: Record<string, number>, pref: string) => {
        counts[pref] = (counts[pref] || 0) + 1;
        return counts;
      }, {});
      
      // Sort learning preferences by frequency
      const learningPreferences = Object.entries(learningCounts)
        .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
        .map(([preference, count]) => ({
          preference,
          count
        }));
      
      // Collect contact information and segment by feedback type
      const contactInfo: {
        email: string;
        name?: string;
        company?: string;
        jobTitle?: string;
        followUp?: boolean;
        feedbackType?: string;
      }[] = [];

      // Find all feedback items for this product and collect email/contact info
      feedbackData.forEach(item => {
        if (item.productFeedback && item.productFeedback.product) {
          // Get product ID, handling different possible structures
          let itemProductId = null;
            
          // Direct _id property
          if (item.productFeedback.product._id) {
            itemProductId = item.productFeedback.product._id;
          }
          // Handle case where id might be in a nested structure
          else if (item.productFeedback.product.id?.current) {
            itemProductId = item.productFeedback.product.id.current;
          }
            
          // Normalize IDs for comparison
          const normalizedItemProductId = itemProductId ? String(itemProductId) : null;
            
          if (normalizedItemProductId === product.productId && item.email) {
            // Determine feedback type (positive, negative, neutral) based on rating
            let feedbackType = 'neutral';
            if (item.productFeedback.rating >= 4) feedbackType = 'positive';
            else if (item.productFeedback.rating <= 2) feedbackType = 'negative';
              
            contactInfo.push({
              email: item.email || '',
              name: item.attendeeInfo?.name,
              company: item.attendeeInfo?.company,
              jobTitle: item.attendeeInfo?.jobTitle,
              followUp: item.attendeeInfo?.followUp,
              feedbackType
            });
          }
        }
      });
      
      // Simple sentiment analysis
      const sentimentAnalysis = {
        positive: ratings.filter(rating => rating >= 4).length,
        negative: ratings.filter(rating => rating <= 2).length,
        neutral: ratings.filter(rating => rating === 3).length
      };
      
      // Generate insight summary based on collected data
      let insightSummary = '';
      
      // Most popular interest if available
      if (interests.length > 0) {
        const topInterest = interests[0];
        const interestPercentage = Math.round((topInterest.count / totalFeedback) * 100);
        insightSummary += `${interestPercentage}% of attendees expressed interest in "${topInterest.interest}". `;
        
        // If we have second-most popular interest and it's significant
        if (interests.length > 1 && interests[1].count >= totalFeedback * 0.25) {
          const secondInterest = interests[1];
          const secondPercentage = Math.round((secondInterest.count / totalFeedback) * 100);
          insightSummary += `Another ${secondPercentage}% were interested in "${secondInterest.interest}". `;
        }
      }
      
      // Sentiment insight with more detailed analysis based on ratings directly
      const positivePercentage = totalFeedback > 0 ? Math.round((sentimentAnalysis.positive / totalFeedback) * 100) : 0;
      const negativePercentage = totalFeedback > 0 ? Math.round((sentimentAnalysis.negative / totalFeedback) * 100) : 0;
      
      if (positivePercentage >= 75) {
        insightSummary += `The product received strong positive feedback (${positivePercentage}% favorable). `;
      } else if (positivePercentage >= 50) {
        insightSummary += `Overall reception was positive with ${positivePercentage}% favorable feedback. `;
      } else if (negativePercentage >= 30) {
        insightSummary += `${negativePercentage}% of feedback was negative, suggesting improvement opportunities. `;
      } else {
        insightSummary += `Feedback was mixed with ${positivePercentage}% positive and ${negativePercentage}% negative responses. `;
      }
      
      // Learning preferences insight
      if (learningPreferences.length > 0) {
        const topLearningPref = learningPreferences[0];
        const percentage = Math.round((topLearningPref.count / totalFeedback) * 100);
        insightSummary += `${percentage}% of attendees prefer learning through "${topLearningPref.preference}". `;
      }
      
      // Common questions or concerns
      if (product.questions && product.questions.length > 0) {
        insightSummary += `${product.questions.length} questions were asked, indicating areas to address in future presentations. `;
      }
      
      // Follow-up opportunities
      const followUpCount = contactInfo.filter(c => c.followUp).length;
      if (followUpCount > 0) {
        const followUpPercentage = Math.round((followUpCount / totalFeedback) * 100);
        insightSummary += `${followUpPercentage}% of attendees requested follow-up contact. `;
      }
      
      return {
        productId: product.productId,
        productName: product.productName,
        productLogo: product.productLogo,
        websiteUrl: product.websiteUrl,
        totalFeedback,
        averageRating,
        interests,
        learningPreferences,
        questions: product.questions,
        detailedFeedback: product.detailedFeedback,
        contactInfo,
        sentimentAnalysis,
        insightSummary
      };
    });

    // Overall summary
    const totalFeedback = feedbackData.length;
    const averageRating = totalFeedback > 0 ? totalRating / totalFeedback : 0;
    
    // Product feedback summary
    const hasProductFeedback = totalProductFeedback > 0;
    const averageProductRating = hasProductFeedback ? totalProductRating / totalProductFeedback : 0;

    return {
      speaker,
      summary: {
        totalFeedback,
        averageRating,
        hasProductFeedback,
        totalProductFeedback,
        averageProductRating
      },
      feedbackByTalk,
      productFeedbackByProduct
    };
  };

  // Process data before early returns
  const processedData = processFeedbackData();

  // Loading, error, and empty states
  if (!token) {
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

  const { speaker, summary, feedbackByTalk, productFeedbackByProduct } = processedData;

  // Computed values for visual elements
  const ratingPercentage = (summary.averageRating / 5) * 100;
  const productRatingPercentage = summary.hasProductFeedback ? (summary.averageProductRating / 5) * 100 : 0;
  
  return (
    <Layout>
      <SEO
        title={`Speaker Feedback - ${speaker?.name}`}
        description={`Feedback for ${speaker?.name}'s talks at ZurichJS events.`}
      />

      {/* Hero Section with Animation */}
      <section className="relative overflow-hidden text-gray-900">
        <div className="container mx-auto px-6 py-14 md:py-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row items-center gap-8"
          >
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white shadow-xl relative">
              <Image
                src={speaker?.image ? `${speaker?.image}?h=300` : '/images/speakers/default.png'}
                alt={speaker?.name || 'Speaker'}
                width={144}
                height={144}
                className="object-cover w-full h-full"
                priority
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
                  <span className="font-bold text-lg">{summary.averageRating.toFixed(1)}</span>
                  <span className="text-sm text-gray-600">
                    from {summary.totalFeedback} {summary.totalFeedback === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Metrics Dashboard */}
      <div className="bg-gray-50 py-10 border-t border-b border-gray-200">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Feedback Summary</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Talk Rating Metric */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-gray-500 text-sm font-medium mb-2">Talk Rating</h3>
                <div className="flex items-baseline">
                  <div className="text-3xl font-bold mr-2">{summary.averageRating.toFixed(1)}</div>
                  <div className="text-gray-500 text-sm">out of 5.0</div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-yellow-500 h-2.5 rounded-full" 
                      style={{ width: `${ratingPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Total Reviews Metric */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-gray-500 text-sm font-medium mb-2">Total Feedback</h3>
                <div className="flex items-baseline">
                  <div className="text-3xl font-bold mr-2">{summary.totalFeedback}</div>
                  <div className="text-gray-500 text-sm">
                    {summary.totalFeedback === 1 ? 'review' : 'reviews'}
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  Across {feedbackByTalk.length} {feedbackByTalk.length === 1 ? 'talk' : 'talks'}
                </div>
              </div>

              {/* Product Demo Rating */}
              <div className={`bg-white rounded-xl shadow-sm border ${summary.hasProductFeedback ? 'border-purple-200' : 'border-gray-200'} p-6`}>
                <h3 className="text-gray-500 text-sm font-medium mb-2">Product Demo Rating</h3>
                {summary.hasProductFeedback ? (
                  <>
                    <div className="flex items-baseline">
                      <div className="text-3xl font-bold mr-2 text-purple-700">{summary.averageProductRating.toFixed(1)}</div>
                      <div className="text-gray-500 text-sm">out of 5.0</div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-purple-500 h-2.5 rounded-full" 
                          style={{ width: `${productRatingPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center h-12 text-gray-400">
                    No product feedback
                  </div>
                )}
              </div>

              {/* Product Reviews Metric */}
              <div className={`bg-white rounded-xl shadow-sm border ${summary.hasProductFeedback ? 'border-purple-200' : 'border-gray-200'} p-6`}>
                <h3 className="text-gray-500 text-sm font-medium mb-2">Product Feedback</h3>
                {summary.hasProductFeedback ? (
                  <>
                    <div className="flex items-baseline">
                      <div className="text-3xl font-bold mr-2 text-purple-700">{summary.totalProductFeedback}</div>
                      <div className="text-gray-500 text-sm">
                        {summary.totalProductFeedback === 1 ? 'review' : 'reviews'}
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-gray-500">
                      Across {productFeedbackByProduct.length} {productFeedbackByProduct.length === 1 ? 'product' : 'products'}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center h-12 text-gray-400">
                    No product feedback
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tabs for Talk/Product Feedback */}
      <div className="container mx-auto px-6 py-10">
        <div className="border-b border-gray-200 mb-8">
          <div className="flex gap-8">
            <button
              onClick={() => handleTabChange('talks')}
              className={`pb-4 px-1 font-medium text-lg transition-colors ${
                activeTab === 'talks'
                  ? 'border-b-2 border-yellow-500 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Talk Feedback
            </button>
            {summary.hasProductFeedback && (
              <button
                onClick={() => handleTabChange('products')}
                className={`pb-4 px-1 font-medium text-lg transition-colors ${
                  activeTab === 'products'
                    ? 'border-b-2 border-purple-600 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Product Feedback
              </button>
            )}
          </div>
        </div>

        {/* Talk Feedback Content */}
        <div style={{ display: activeTab === 'talks' ? 'block' : 'none' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Talk Feedback</h2>
            <div className="space-y-8">
              {feedbackByTalk.map((talk, index) => (
                <motion.div
                  key={talk.talkTitle}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200"
                >
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-xl font-semibold">{talk.talkTitle}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(talk.eventDate)}
                      </div>
                      <div>{talk.eventTitle}</div>
                      {talk.hasProductFeedback && (
                        <div className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          Includes Product Demo
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="flex mr-2">
                        {renderStars(talk.averageRating)}
                      </div>
                      <span className="text-gray-600">
                        {talk.averageRating.toFixed(1)} from {talk.totalFeedback} {talk.totalFeedback === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>

                    {/* Comments Section */}
                    {talk.comments.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-700 mb-3">Audience Feedback</h4>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                          {talk.comments.map((comment: string, i: number) => (
                            <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                              &ldquo;{comment}&rdquo;
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Product Stats Mini-Section */}
                    {talk.hasProductFeedback && talk.productStats.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <h4 className="font-semibold text-purple-700 mb-3">Product Demo Feedback</h4>
                        <div className="space-y-4">
                          {talk.productStats.map((product) => (
                            <div key={product.productId} className="bg-purple-50 p-4 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center">
                                  {product.productLogo && (
                                    <div className="w-6 h-6 mr-2 bg-white rounded-full overflow-hidden flex-shrink-0 border border-purple-200">
                                      <Image 
                                        src={product.productLogo}
                                        alt={product.productName}
                                        width={24}
                                        height={24}
                                        className="object-contain"
                                      />
                                    </div>
                                  )}
                                  <h5 className="font-semibold text-purple-900">{product.productName}</h5>
                                </div>
                                <div className="flex items-center bg-white px-2 py-1 rounded-full">
                                  <div className="flex mr-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <svg
                                        key={star}
                                        className={`w-3 h-3 ${
                                          star <= Math.round(product.averageRating) ? 'text-purple-500' : 'text-gray-300'
                                        }`}
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    ))}
                                  </div>
                                  <span className="text-xs text-purple-900">{product.averageRating.toFixed(1)}</span>
                                </div>
                              </div>
                              
                              {product.topInterests.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm text-purple-700 mb-1">Top audience interests:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {product.topInterests.map((interest, i) => (
                                      <span key={i} className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">
                                        {interest}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <button
                                onClick={() => handleTabChange('products')}
                                className="mt-3 text-xs text-purple-700 hover:text-purple-900 flex items-center"
                              >
                                View detailed product feedback
                                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Product Feedback Content */}
        <div style={{ display: activeTab === 'products' && summary.hasProductFeedback ? 'block' : 'none' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <ProductAnalytics 
              productFeedbackByProduct={productFeedbackByProduct as unknown as ProductFeedbackData[]} 
            />
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { token } = context.params || {};
  
  if (!token) {
    return {
      props: {
        feedbackData: [],
        error: 'No token provided'
      }
    };
  }

  try {
    // Server-side API call using absolute URL
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = context.req.headers.host || 'localhost:3000';
    const apiUrl = `${protocol}://${host}/api/speaker-feedback/${token}`;
    
    const { data } = await axios.get(apiUrl);

    return {
      props: {
        feedbackData: data || [],
        error: null
      }
    };
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return {
      props: {
        feedbackData: [],
        error: 'Failed to load feedback. The token may be invalid or expired.'
      }
    };
  }
};