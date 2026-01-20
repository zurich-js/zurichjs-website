import crypto from 'crypto';

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'next-sanity';


import { getEventById, getSpeakerById, getTalkById } from '@/sanity/queries';


// Types to match the client-side types
interface ProductFeedbackData {
  productId: string;
  productName?: string;
  rating: number;
  interests: string[];
  questions: string;
  learningPreferences: string[];
  detailedFeedback: string;
}

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

interface LegacyFeedbackData {
  eventId: string;
  talkId: string;
  speakerId: string;
  rating: number;
  comment: string;
  submittedAt: string;
  productFeedback?: ProductFeedbackData;
}

type FeedbackData = ComprehensiveFeedbackData | LegacyFeedbackData;

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
    apiVersion: '2024-01-01', // Use the latest API version
    token: process.env.SANITY_TOKEN,
    useCdn: false, // We need fresh data and ability to write
});

// Helper function to check if feedback is comprehensive type
function isComprehensiveFeedback(feedback: FeedbackData): feedback is ComprehensiveFeedbackData {
    return 'selectedEventId' in feedback && 'overallRating' in feedback;
}

async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            message: 'Method not allowed' 
        });
    }

    try {
        const feedback: FeedbackData = req.body;

        if (isComprehensiveFeedback(feedback)) {
            return await handleComprehensiveFeedback(feedback, req, res);
        } else {
            return await handleLegacyFeedback(feedback, req, res);
        }
    } catch (error) {
        console.error('Error processing feedback:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing feedback',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

async function handleLegacyFeedback(feedback: LegacyFeedbackData, req: NextApiRequest, res: NextApiResponse<ResponseData>) {
    const { eventId, talkId, speakerId, rating, comment, submittedAt, productFeedback } = feedback;

    if (!eventId || !talkId || !speakerId || !rating || !submittedAt) {
        return res.status(400).json({ 
            success: false,
            message: 'Missing required fields' 
        });
    }

    // Check if the event exists
    const event = await getEventById(eventId);

    if (!event) {
        return res.status(404).json({ 
            success: false,
            message: 'Event not found' 
        });
    }

    // Validate that the speaker exists in Sanity
    const speaker = await getSpeakerById(speakerId);

    if (!speaker) {
        return res.status(404).json({
            success: false,
            message: 'Speaker not found. Please contact the administrator.'
        });
    }

    // Validate that the talk exists in Sanity
    const talk = await sanityClient.fetch(
        `*[_type == "talk" && id.current == $talkId][0]`,
        { talkId }
    );

    if (!talk) {
        return res.status(404).json({
            success: false,
            message: 'Talk not found. Please contact the administrator.'
        });
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

    // Check for existing feedback from this user for this talk
    const existingFeedback = await sanityClient.fetch(
        `*[_type == "feedback" && 
    references($eventId) && 
    references($talkId) && 
    (ipHash == $ipHash || browserFingerprint == $browserFingerprint)][0]`,
        {
            eventId,
            talkId,
            ipHash,
            browserFingerprint
        }
    );

    if (existingFeedback) {
        return res.status(409).json({
            success: false,
            message: 'You have already submitted feedback for this talk'
        });
    }

    const eventObj = await getEventById(eventId);
    const talkObj = await getTalkById(talkId);
    const speakerObj = await getSpeakerById(speakerId);

    // Log feedback information
    console.log('Received talk feedback:', {
        eventId,
        talkId,
        speakerId,
        rating,
        commentLength: comment?.length || 0,
        submittedAt
    });

    // Create the feedback document in Sanity
    const feedbackDoc = {
        _type: 'feedback',
        event: {
            _type: 'reference',
            _ref: eventObj?._id
        },
        talk: {
            _type: 'reference',
            _ref: talkObj?._id
        },
        speaker: {
            _type: 'reference',
            _ref: speakerObj?._id
        },
        rating,
        comment,
        submittedAt: new Date(submittedAt).toISOString(),
        ipHash,
        browserFingerprint
    };

    // Handle product feedback if available
    if (productFeedback) {
        console.log('Received product feedback:', {
            productId: productFeedback.productId,
            productName: productFeedback.productName,
            rating: productFeedback.rating,
            interests: productFeedback.interests,
            hasQuestions: !!productFeedback.questions,
            learningPreferences: productFeedback.learningPreferences,
            hasDetailedFeedback: !!productFeedback.detailedFeedback
        });

        // Add product feedback to the main feedback document
        Object.assign(feedbackDoc, {
            productFeedback: {
                product: {
                    _type: 'reference',
                    _ref: productFeedback.productId
                },
                rating: productFeedback.rating,
                interests: productFeedback.interests,
                questions: productFeedback.questions,
                learningPreferences: productFeedback.learningPreferences,
                detailedFeedback: productFeedback.detailedFeedback
            }
        });
    }

    const createdFeedback = await sanityClient.create(feedbackDoc);

    // Send notification about new feedback
    try {
        const eventTitle = eventObj?.title || 'Unknown Event';
        const talkTitle = talkObj?.title || 'Unknown Talk';
        const speakerName = speakerObj?.name || 'Unknown Speaker';
        const ratingStars = '⭐'.repeat(rating);
        
        await fetch(`${req.headers.origin || process.env.NEXTAUTH_URL}/api/notifications/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: `New Feedback Received ${ratingStars}`,
                message: `Rating: ${rating}/5 stars\nEvent: ${eventTitle}\nTalk: "${talkTitle}" by ${speakerName}\nComment: ${comment.length > 100 ? comment.substring(0, 100) + '...' : comment}`,
                type: 'other',
                priority: rating <= 2 ? 'high' : 'normal', // High priority for poor ratings
            }),
        });
    } catch (notificationError) {
        console.error('Failed to send feedback notification:', notificationError);
        // Don't fail the feedback submission if notification fails
    }

    return res.status(201).json({ 
        success: true,
        message: 'Feedback submitted successfully',
        feedbackId: createdFeedback._id
    });
}

async function handleComprehensiveFeedback(feedback: ComprehensiveFeedbackData, req: NextApiRequest, res: NextApiResponse<ResponseData>) {
    const { selectedEventId, overallRating, foodOptions, drinks, talks, timing, execution, improvements, futureTopics, worthTime, wouldRecommend, dealOfDay, additionalComments, submittedAt } = feedback;

    if (!selectedEventId || !overallRating || !submittedAt) {
        return res.status(400).json({ 
            success: false,
            message: 'Missing required fields' 
        });
    }

    // Check if the event exists
    const event = await getEventById(selectedEventId);

    if (!event) {
        return res.status(404).json({ 
            success: false,
            message: 'Event not found' 
        });
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

    // Check for existing comprehensive feedback from this user for this event
    const existingFeedback = await sanityClient.fetch(
        `*[_type == "comprehensiveFeedback" && 
    references($eventId) && 
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
            message: 'You have already submitted comprehensive feedback for this event'
        });
    }

    const eventObj = await getEventById(selectedEventId);

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
        submittedAt
    });

    // Create the comprehensive feedback document in Sanity
    const feedbackDoc = {
        _type: 'comprehensiveFeedback',
        event: {
            _type: 'reference',
            _ref: eventObj?._id
        },
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
        const eventTitle = eventObj?.title || 'Unknown Event';
        const ratingStars = '⭐'.repeat(overallRating);
        const avgRating = Math.round((foodOptions.rating + drinks.rating + talks.rating + timing.rating + execution.rating) / 5 * 10) / 10;
        
        await fetch(`${req.headers.origin || process.env.NEXTAUTH_URL}/api/notifications/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: `New Comprehensive Feedback ${ratingStars}`,
                message: `Overall: ${overallRating}/5 stars | Avg Details: ${avgRating}/5\nEvent: ${eventTitle}\nWorth Time: ${worthTime}\nWould Recommend: ${wouldRecommend}\n\nImprovements: ${improvements.length > 50 ? improvements.substring(0, 50) + '...' : improvements}`,
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
}

export default handler;
