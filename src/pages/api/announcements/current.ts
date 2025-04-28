import { NextApiRequest, NextApiResponse } from 'next';

import { getCurrentAnnouncement } from '@/sanity/queries';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const isLoggedIn = req.query.isLoggedIn === 'true';
        const now = new Date().toISOString();

        const announcements = await getCurrentAnnouncement();

        // Filter announcements based on conditions
        const currentAnnouncement = announcements.find(announcement => {
            const { conditions } = announcement;

            // Check if announcement is within date range
            const isWithinDateRange = (!conditions?.startDate || conditions.startDate <= now) &&
                (!conditions?.endDate || conditions.endDate >= now);

            // Check if login is required and user is logged in
            const meetsLoginRequirement = !conditions?.requiresLogin || isLoggedIn;

            return isWithinDateRange && meetsLoginRequirement;
        });

        return res.status(200).json(currentAnnouncement || null);
    } catch (error) {
        console.error('Error fetching announcement:', error);
        return res.status(500).json({ message: 'Error fetching announcement' });
    }
} 