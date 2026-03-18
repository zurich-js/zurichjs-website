import type { APIContext } from 'astro';
import crypto from 'crypto';
import { createClient } from '@sanity/client';

import { sendPlatformNotification } from '@/lib/notification';
import { getEventById } from '@/sanity/queries/events';

export const prerender = false;

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

// Initialize Sanity client
const sanityClient = createClient({
  projectId: "viqjrovw",
  dataset: "production",
  apiVersion: '2024-01-01',
  token: import.meta.env.SANITY_TOKEN,
  useCdn: false,
});

export async function POST(context: APIContext) {
  try {
    const feedback: ComprehensiveFeedbackData = await context.request.json();
    const { selectedEventId, overallRating, foodOptions, drinks, talks, timing, execution, improvements, futureTopics, worthTime, wouldRecommend, dealOfDay, additionalComments, submittedAt } = feedback;

    if (!selectedEventId || !overallRating || !submittedAt) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if this is a workshop (starts with 'workshop-') or an event
    const isWorkshop = selectedEventId.startsWith('workshop-');
    let event = null;

    if (!isWorkshop) {
      // Validate that the event exists in Sanity
      event = await getEventById(selectedEventId);
      if (!event) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Event not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Create a hash of the IP address to help prevent duplicate submissions
    const ipAddress = context.request.headers.get('x-forwarded-for') || '';
    const ipHash = crypto
      .createHash('sha256')
      .update(ipAddress)
      .digest('hex');

    // Create a browser fingerprint from user agent and other headers
    const userAgent = context.request.headers.get('user-agent') || '';
    const accept = context.request.headers.get('accept') || '';
    const acceptLanguage = context.request.headers.get('accept-language') || '';
    const acceptEncoding = context.request.headers.get('accept-encoding') || '';

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
      return new Response(JSON.stringify({
        success: false,
        message: `You have already submitted comprehensive feedback for this ${isWorkshop ? 'workshop' : 'event'}`
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
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
      const ratingStars = '\u2B50'.repeat(overallRating);
      const avgRating = Math.round((foodOptions.rating + drinks.rating + talks.rating + timing.rating + execution.rating) / 5 * 10) / 10;

      await sendPlatformNotification({
        title: `New Comprehensive ${isWorkshop ? 'Workshop' : 'Event'} Feedback ${ratingStars}`,
        message: `Overall: ${overallRating}/5 stars | Avg Details: ${avgRating}/5\n${isWorkshop ? 'Workshop' : 'Event'}: ${itemTitle}\nWorth Time: ${worthTime}\nWould Recommend: ${wouldRecommend}\n\nImprovements: ${improvements.length > 50 ? improvements.substring(0, 50) + '...' : improvements}`,
        priority: overallRating <= 2 ? 2 : 1,
      });
    } catch (notificationError) {
      console.error('Failed to send comprehensive feedback notification:', notificationError);
      // Don't fail the feedback submission if notification fails
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Comprehensive feedback submitted successfully',
      feedbackId: createdFeedback._id
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing event feedback:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Error processing feedback',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
