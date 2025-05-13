import crypto from 'crypto';

import { createClient } from '@sanity/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getEventById, getSpeakerById, getTalkById } from '@/sanity/queries';

// Types to match the client-side types
interface ProductFeedbackData {
  productId: string;
  rating: number;
  interests: string[];
  questions: string;
  learningPreferences: string[];
}

interface FeedbackData {
  eventId: string;
  talkId: string;
  speakerId: string;
  rating: number;
  comment: string;
  submittedAt: string;
  productFeedback?: ProductFeedbackData;
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
    apiVersion: '2024-01-01', // Use the latest API version
    token: process.env.SANITY_TOKEN,
    useCdn: false, // We need fresh data and ability to write
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            message: 'Method not allowed' 
        });
    }

    try {
        const feedback: FeedbackData = req.body;
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
                rating: productFeedback.rating,
                interests: productFeedback.interests,
                hasQuestions: !!productFeedback.questions,
                learningPreferences: productFeedback.learningPreferences
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
                    learningPreferences: productFeedback.learningPreferences
                }
            });
        }

        const createdFeedback = await sanityClient.create(feedbackDoc);
        
        return res.status(201).json({ 
            success: true,
            message: 'Feedback submitted successfully',
            feedbackId: createdFeedback._id
        });
    } catch (error) {
        console.error('Error creating feedback:', error);

        // Log detailed error information for debugging
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                body: req.body
            });

            // Check for specific Sanity reference errors
            if (error.message.includes('references non-existent document')) {
                return res.status(400).json({
                    success: false,
                    message: 'One of the referenced documents does not exist in the database. Please refresh the page and try again.',
                    error: error.message
                });
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Error submitting feedback',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}