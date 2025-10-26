import { Workshop } from '@/components/sections/UpcomingWorkshops';
import { getConfirmedWorkshops } from '@/data/workshops';

/**
 * Parse workshop date string (e.g., "October 28, 2025") to a Date object
 */
function parseWorkshopDate(dateInfo: string): Date | null {
  try {
    // Handle dates like "October 28, 2025" or "November 12, 2025"
    const date = new Date(dateInfo);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Check if a workshop date falls within the cross-promotion window
 * (same day or up to 48 hours before the event)
 */
function isWorkshopRelatedToEvent(workshopDate: Date, eventDate: Date): boolean {
  // Calculate time difference in milliseconds
  const timeDiff = eventDate.getTime() - workshopDate.getTime();

  // Convert to hours
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  // Workshop should be:
  // - On the same day (0 <= hoursDiff < 24)
  // - OR up to 48 hours before the event (-48 <= hoursDiff < 0)
  //
  // Actually, re-reading the requirement: "same day or up to 48h before the meetup date"
  // This means:
  // - Same day: workshop and event on the same calendar day
  // - Up to 48h before: workshop happens 0-48 hours before the event

  // Let's check if they're on the same calendar day
  const sameDay =
    workshopDate.getFullYear() === eventDate.getFullYear() &&
    workshopDate.getMonth() === eventDate.getMonth() &&
    workshopDate.getDate() === eventDate.getDate();

  if (sameDay) {
    return true;
  }

  // Check if workshop is up to 48 hours (2 days) before the event
  // Workshop should be before or at the same time as the event
  // and within 48 hours
  const isWithin48HoursBefore = hoursDiff >= 0 && hoursDiff <= 48;

  return isWithin48HoursBefore;
}

/**
 * Get workshops that should be cross-promoted with a specific event
 * Returns workshops that occur on the same day or up to 48 hours before the event
 */
export function getRelatedWorkshops(eventDatetime: string): Workshop[] {
  const eventDate = new Date(eventDatetime);

  if (isNaN(eventDate.getTime())) {
    console.warn('Invalid event datetime:', eventDatetime);
    return [];
  }

  const confirmedWorkshops = getConfirmedWorkshops();

  const relatedWorkshops = confirmedWorkshops.filter((workshop) => {
    const workshopDate = parseWorkshopDate(workshop.dateInfo);

    if (!workshopDate) {
      return false;
    }

    return isWorkshopRelatedToEvent(workshopDate, eventDate);
  });

  return relatedWorkshops;
}
