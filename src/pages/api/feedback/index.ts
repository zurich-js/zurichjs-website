import crypto from 'crypto';

import { createClient } from '@sanity/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getEventById, getSpeakerById, getTalkById } from '@/sanity/queries';

// Initialize Sanity client
const sanityClient = createClient({
    projectId: "viqjrovw",
    dataset: "production",
    apiVersion: '2024-01-01', // Use the latest API version
    token: process.env.SANITY_TOKEN,
    useCdn: false, // We need fresh data and ability to write
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { eventId, talkId, speakerId, rating, comment, submittedAt } = req.body;

        if (!eventId || !talkId || !speakerId || !rating || !submittedAt) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if the event exists
        const event = await getEventById(eventId);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Validate that the speaker exists in Sanity
        const speaker = await getSpeakerById(speakerId);

        if (!speaker) {
            return res.status(404).json({
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
                message: 'Talk not found. Please contact the administrator.'
            });
        }

        // Removed feedback period check to allow feedback at any time

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
                message: 'You have already submitted feedback for this talk'
            });
        }

        const eventObj = await getEventById(eventId);
        const talkObj = await getTalkById(talkId);
        const speakerObj = await getSpeakerById(speakerId);

        // Create the feedback document in Sanity
        await sanityClient.create({
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
        });

        res.status(201).json({ success: true });
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
                    message: 'One of the referenced documents does not exist in the database. Please refresh the page and try again.',
                    error: error.message
                });
            }
        }

        res.status(500).json({
            message: 'Error submitting feedback',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}