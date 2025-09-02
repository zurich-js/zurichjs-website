import crypto from 'crypto';

import { createClient } from '@sanity/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getEventById } from '@/sanity/queries';

// Types
interface ComprehensiveFeedbackData {
  selectedEventId: string;
  overallRating: number;
  foodOptions: { rating: number; comments: string; };
  drinks: { rating: number; comments: string; };
  talks: { rating: number; comments: string; };
  timing: { rating: number; comments: string; };
  execution: { rating: number; comments: string; };
  improvements: string;
  futureTopics: string;
  worthTime: 'definitely' | 'mostly' | 'somewhat' | 'not_really' | '';
  wouldRecommend: 'definitely' | 'probably' | 'maybe' | 'unlikely' | '';
  dealOfDay: { rating: number; comments: string; };
  additionalComments: string;
  submittedAt: string;
}

type ResponseData = {
  success: boolean;
  message: string;
  feedbackId?: string;
  error?: string;
};

// Initialize Sanity client
const sanityClient = createClient({
  projectId: "viqjrovw",
  dataset: "production",
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    const feedback: ComprehensiveFeedbackData = req.body;
    const { selectedEventId, overallRating, foodOptions, drinks, talks, timing, execution, improvements, futureTopics, worthTime, wouldRecommend, dealOfDay, additionalComments, submittedAt } = feedback;

    if (!selectedEventId || !overallRating || !submittedAt) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }

    // Check if this is a workshop (starts with 'workshop-') or an event
    const isWorkshop = selectedEventId.startsWith('workshop-');
    let event = null;

    if (!isWorkshop) {
      // Validate that the event exists in Sanity
      event = await getEventById(selectedEventId);
      if (!event) {
        return res.status(404).json({ 
          success: false,
          message: 'Event not found' 
        });
      }
    }

    // Create a hash of the IP address to help prevent duplicate submissions
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipHash = crypto
      .createHash('sha256')
      .update(typeof ipAddress === 'string' ? ipAddress : ipAddress[0] || '')
      .digest('hex');

    // Create a browser fingerprint from user agent and other headers
    const userAgent = req.headers['user-agent'] || '';
    const accept = req.headers['accept'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    const browserFingerprint = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          userAgent,
          accept,
          acceptLanguage,
          acceptEncoding,
        })
      )
      .digest('hex');

    // Check for existing comprehensive feedback from this user for this event/workshop
    const existingFeedback = await sanityClient.fetch(
      `*[_type == "comprehensiveFeedback" && 
    eventId == $eventId && 
    (ipHash == $ipHash || browserFingerprint == $browserFingerprint)][0]`,
      {
        eventId: selectedEventId,
        ipHash,
        browserFingerprint
      }
    );

    if (existingFeedback) {
      return res.status(409).json({
        success: false,
        message: `You have already submitted comprehensive feedback for this ${isWorkshop ? 'workshop' : 'event'}`
      });
    }

    // Log comprehensive feedback information
    console.log('Received comprehensive feedback:', {
      selectedEventId,
      overallRating,
      ratings: {
        food: foodOptions.rating,
        drinks: drinks.rating,
        talks: talks.rating,
        timing: timing.rating,
        execution: execution.rating
      },
      worthTime,
      wouldRecommend,
      isWorkshop,
      submittedAt
    });

    // Create the comprehensive feedback document in Sanity
    const feedbackDoc = {
      _type: 'comprehensiveFeedback',
      eventId: selectedEventId,
      eventType: isWorkshop ? 'workshop' : 'event',
      // Only add event reference for actual events (not workshops)
      ...(event && {
        event: {
          _type: 'reference',
          _ref: event._id
        }
      }),
      overallRating,
      ratings: {
        foodOptions: {
          rating: foodOptions.rating,
          comments: foodOptions.comments
        },
        drinks: {
          rating: drinks.rating,
          comments: drinks.comments
        },
        talks: {
          rating: talks.rating,
          comments: talks.comments
        },
        timing: {
          rating: timing.rating,
          comments: timing.comments
        },
        execution: {
          rating: execution.rating,
          comments: execution.comments
        }
      },
      improvements,
      futureTopics,
      worthTime,
      wouldRecommend,
      dealOfDay: {
        rating: dealOfDay.rating,
        comments: dealOfDay.comments
      },
      additionalComments,
      submittedAt: new Date(submittedAt).toISOString(),
      ipHash,
      browserFingerprint
    };

    const createdFeedback = await sanityClient.create(feedbackDoc);

    // Send notification about new comprehensive feedback
    try {
      const itemTitle = isWorkshop ? selectedEventId.replace('workshop-', '').replace(/-/g, ' ') : (event?.title || 'Unknown Event');
      const ratingStars = '⭐'.repeat(overallRating);
      const avgRating = Math.round((foodOptions.rating + drinks.rating + talks.rating + timing.rating + execution.rating) / 5 * 10) / 10;
      
      await fetch(`${req.headers.origin || process.env.NEXTAUTH_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `New Comprehensive ${isWorkshop ? 'Workshop' : 'Event'} Feedback ${ratingStars}`,
          message: `Overall: ${overallRating}/5 stars | Avg Details: ${avgRating}/5\n${isWorkshop ? 'Workshop' : 'Event'}: ${itemTitle}\nWorth Time: ${worthTime}\nWould Recommend: ${wouldRecommend}\n\nImprovements: ${improvements.length > 50 ? improvements.substring(0, 50) + '...' : improvements}`,
          type: 'other',
          priority: overallRating <= 2 ? 'high' : 'normal',
        }),
      });
    } catch (notificationError) {
      console.error('Failed to send comprehensive feedback notification:', notificationError);
      // Don't fail the feedback submission if notification fails
    }

    return res.status(201).json({ 
      success: true,
      message: 'Comprehensive feedback submitted successfully',
      feedbackId: createdFeedback._id
    });

  } catch (error) {
    console.error('Error processing event feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing feedback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}