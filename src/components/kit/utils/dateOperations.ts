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
  targetTime: string,
  options: TimeRemainingOptions = {}
): string {
  const now = new Date();
  const targetDateTime = new Date(targetDate + 'T' + targetTime);
  const timeUnits = calculateTimeDifference(now, targetDateTime);

  return formatTimeUnits(timeUnits, options);
}

/**
 * Calculate time remaining from now until a target Date object
 */
export function calculateTimeRemainingFromDate(
  targetDate: Date,
  options: TimeRemainingOptions = {}
): string {
  const now = new Date();
  const timeUnits = calculateTimeDifference(now, targetDate);

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
 * Check if a date/time has passed
 */
export function hasTimePassed(targetDate: string, targetTime: string): boolean {
  const now = new Date();
  const targetDateTime = new Date(targetDate + 'T' + targetTime);
  return now >= targetDateTime;
}

/**
 * Check if a Date object has passed
 */
export function hasDatePassed(targetDate: Date): boolean {
  const now = new Date();
  return now >= targetDate;
}

/**
 * Pricing period configuration
 */
export interface PricingPeriod {
  date: string; // YYYY-MM-DD - EXPIRATION date
  time: string; // HH:MM - EXPIRATION time
  title: string; // e.g. "Early Bird"
  discount: number; // percentage discount, e.g. 20
  isOffer?: boolean; // optional flag to mark special offers
}

export interface PricingConfig {
  [key: string]: PricingPeriod;
}

/**
 * Alternative, more explicit pricing structure
 * This makes it clearer that dates are expiration dates
 */
export interface PricingPeriodExplicit {
  expiresAt: string; // ISO date string or YYYY-MM-DDTHH:MM
  title: string; // e.g. "Early Bird"
  discount: number; // percentage discount, e.g. 20
  isOffer?: boolean; // optional flag to mark special offers
}

export interface PricingConfigExplicit {
  [key: string]: PricingPeriodExplicit;
}

/**
 * Helper to convert explicit pricing config to legacy format
 */
export function convertExplicitToLegacy(config: PricingConfigExplicit): PricingConfig {
  const result: PricingConfig = {};
  
  for (const [key, period] of Object.entries(config)) {
    const [date, time] = period.expiresAt.includes('T') 
      ? period.expiresAt.split('T')
      : [period.expiresAt, '23:59'];
    
    result[key] = {
      date,
      time,
      title: period.title,
      discount: period.discount,
      isOffer: period.isOffer,
    };
  }
  
  return result;
}

/**
 * Find the current active pricing period based on current time
 * The dates in pricing periods represent EXPIRATION dates, not start dates
 * Returns the period that is currently active (not yet expired)
 */
export function getCurrentPricingPeriod(
  pricing: PricingConfig | undefined,
  fallbackDate: string,
  fallbackTime: string
): PricingPeriod {
  if (!pricing || Object.keys(pricing).length === 0) {
    return {
      date: fallbackDate,
      time: fallbackTime,
      title: 'Standard',
      discount: 0,
    };
  }

  const now = new Date();

  // Sort pricing periods by expiration date/time (ascending - earliest expiration first)
  const sortedKeys = Object.keys(pricing).sort((a, b) => {
    const aDate = new Date(pricing[a].date + 'T' + pricing[a].time);
    const bDate = new Date(pricing[b].date + 'T' + pricing[b].time);
    return aDate.getTime() - bDate.getTime();
  });

  // Find the first period that hasn't expired yet
  for (const key of sortedKeys) {
    const period = pricing[key];
    const expirationDate = new Date(period.date + 'T' + period.time);
    
    // If current time is before the expiration date, this period is still active
    if (now < expirationDate) {
      return period;
    }
  }

  // If all periods have expired, return the last one (most recent expiration)
  return pricing[sortedKeys[sortedKeys.length - 1]];
}

/**
 * Get all pricing periods sorted by date/time
 */
export function getSortedPricingPeriods(pricing: PricingConfig): Array<{ key: string; period: PricingPeriod; dateTime: Date }> {
  return Object.keys(pricing)
    .map(key => ({
      key,
      period: pricing[key],
      dateTime: new Date(pricing[key].date + 'T' + pricing[key].time)
    }))
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
}

/**
 * Check if a pricing period is currently active
 */
export function isPricingPeriodActive(period: PricingPeriod): boolean {
  const now = new Date();
  const periodDateTime = new Date(period.date + 'T' + period.time);
  return now >= periodDateTime;
}
