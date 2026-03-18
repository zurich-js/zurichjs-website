import type { APIContext } from 'astro';
import { getCurrentAnnouncement } from '@/sanity/queries/announcements';

export const prerender = false;

export async function GET({ url }: APIContext) {
  try {
    const isLoggedIn = url.searchParams.get('isLoggedIn') === 'true';
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

    return new Response(JSON.stringify(currentAnnouncement || null), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return new Response(JSON.stringify({ message: 'Error fetching announcement' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
