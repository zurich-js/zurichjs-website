/**
 * Date and time calculation utilities for workshop components
 */

export interface TimeUnits {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface TimeRemainingOptions {
  /** Return only the most significant unit (e.g., "2 days" instead of "2 days 3 hours") */
  singleUnit?: boolean;
  /** Return two most significant units (e.g., "2 days 3 hours" or "3 hours 20 minutes") */
  twoUnits?: boolean;
  /** Include seconds in calculations */
  includeSeconds?: boolean;
}

/**
 * Calculate time difference between two dates and return structured units
 */
export function calculateTimeDifference(fromDate: Date, toDate: Date): TimeUnits {
  const diffTime = Math.max(toDate.getTime() - fromDate.getTime(), 0);

  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

/**
 * Calculate time remaining from now until a target date/time
 */
export function calculateTimeRemaining(
  targetDate: string,
  targetTime?: string,
  options: TimeRemainingOptions = {}
): string {
  const now = new Date();
  const targetDateTime = new Date(targetDate + 'T' + (targetTime??0));
  const timeUnits = calculateTimeDifference(now, targetDateTime);

  return formatTimeUnits(timeUnits, options);
}


/**
 * Calculate duration between two time strings (HH:MM format)
 */
export function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  const timeUnits = calculateTimeDifference(start, end);

  const hours = timeUnits.hours;
  const minutes = timeUnits.minutes;

  return `${hours > 0 ? hours + 'h' : ''}${hours > 0 && minutes > 0 ? ' ' : ''}${minutes > 0 ? minutes + 'm' : ''}`;
}

/**
 * Format time units into a human-readable string
 */
function formatTimeUnits(timeUnits: TimeUnits, options: TimeRemainingOptions = {}): string {
  const { days, hours, minutes, seconds } = timeUnits;

  if (options.singleUnit) {
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (options.includeSeconds && seconds > 0) {
      return `${seconds} second${seconds > 1 ? 's' : ''}`;
    } else {
      return '';
    }
  }

  if (options.twoUnits) {
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (options.includeSeconds && seconds > 0) {
      return `${seconds} second${seconds > 1 ? 's' : ''}`;
    } else {
      return '';
    }
  }

  // Default: return all non-zero units
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (options.includeSeconds && seconds > 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);

  return parts.join(' ');
}

export function formatDateForWorkshop(dateString: string) {
  const date = new Date(dateString);
  const day = date.getDate();
  const monthShort = date.toLocaleString('default', { month: "long" }).substring(0, 3);
  return { day, monthShort };
};

/**
 * Get time units for display in cards/components (like WorkshopPricingExpiration)
 */
export function getTimeUnitsForDisplay(targetDate: Date): TimeUnits {
  const now = new Date();
  return calculateTimeDifference(now, targetDate);
}

/**
 * Get time units for display from date and time strings
 */
export function getTimeUnitsFromStrings(date: string, time: string): TimeUnits {
  const targetDate = new Date(date + 'T' + time);
  return getTimeUnitsForDisplay(targetDate);
}





/**
 * Pricing period configuration
 */
export interface PricingConfig {
  date: string; // YYYY-MM-DD - EXPIRATION date
  time: string; // HH:MM - EXPIRATION time
  title: string; // e.g. "Early Bird"
  discount: number; // percentage discount, e.g. 20
}
/**
 * Find the current active pricing period based on current time
 * The dates in pricing periods represent EXPIRATION dates, not start dates
 * Returns the period that is currently active (not yet expired)
 */
export function getActivePricingPhase(
  pricingPhases: PricingConfig[],
): PricingConfig {
  if (!pricingPhases?.length) {
    throw new Error('No pricing phases provided');
  }

  const now = new Date();
  for (const period of pricingPhases) {
    const expirationDate = new Date(period.date + 'T' + period.time);
    if (now < expirationDate) {
      return { ...period };
    }
  }
  return { ...pricingPhases[pricingPhases.length - 1] };
}

export function getTotalDiscountForPhase({
  phase,  couponPercent,  couponAmount,  basePrice
}: {
  phase: PricingConfig;
  couponPercent?: number | null;
  couponAmount?: number | null;
  basePrice?: number
}): number {
    let totalPercent = phase.discount || 0;
    if (!!couponPercent) {
      totalPercent += couponPercent;
    }
    else if (!!couponAmount && basePrice) {
      totalPercent += (couponAmount / basePrice) * 100;
    }
    return Math.min(totalPercent, 100); // Cap at 100%
}
