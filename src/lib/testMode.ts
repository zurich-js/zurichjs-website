/**
 * Test mode utilities for simulating different date/time scenarios
 * Only works in development/test environments
 */

export interface TestModeConfig {
  enabled: boolean;
  currentDate: Date | null;
}

/**
 * Get the current test mode configuration
 * This can be called with or without URL query params
 */
export function getTestModeConfig(urlTestDate?: string): TestModeConfig {
  // Enable test mode automatically in development
  const enabled = process.env.NODE_ENV === 'development';
  
  let currentDate: Date | null = null;
  
  if (enabled) {
    // Priority: URL parameter > Environment variable
    const testDateString = urlTestDate || process.env.NEXT_PUBLIC_TEST_CURRENT_DATE;
    
    if (testDateString) {
      try {
        currentDate = new Date(testDateString);
        // Validate the date
        if (isNaN(currentDate.getTime())) {
          console.warn('Invalid test date provided, falling back to current date');
          currentDate = null;
        }
      } catch (error) {
        console.warn('Failed to parse test date, falling back to current date:', error);
        currentDate = null;
      }
    }
  }
  
  return {
    enabled,
    currentDate
  };
}

/**
 * Get the current date/time, respecting test mode overrides
 */
export function getCurrentDate(): Date {
  const testConfig = getTestModeConfig();
  
  if (testConfig.enabled && testConfig.currentDate) {
    return testConfig.currentDate;
  }
  
  return new Date();
}

/**
 * Get a date relative to the current test/real date
 */
export function getRelativeDate(days: number): Date {
  const currentDate = getCurrentDate();
  const relativeDate = new Date(currentDate);
  relativeDate.setDate(relativeDate.getDate() + days);
  return relativeDate;
}

/**
 * Format date for test mode display
 */
export function formatTestDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Test scenarios for common use cases
 */
export const TEST_SCENARIOS = {
  // Event was yesterday (should show in feedback)
  DAY_AFTER_EVENT: {
    name: 'Day After Event',
    description: 'Event was yesterday - should show for feedback',
    getDaysOffset: (eventDate: Date) => {
      const dayAfter = new Date(eventDate);
      dayAfter.setDate(dayAfter.getDate() + 1);
      return dayAfter;
    }
  },
  
  // Event was a week ago (should show in feedback)
  WEEK_AFTER_EVENT: {
    name: 'Week After Event',
    description: 'Event was 7 days ago - should show for feedback',
    getDaysOffset: (eventDate: Date) => {
      const weekAfter = new Date(eventDate);
      weekAfter.setDate(weekAfter.getDate() + 7);
      return weekAfter;
    }
  },
  
  // Event was a month ago (should NOT show in feedback)
  MONTH_AFTER_EVENT: {
    name: 'Month After Event',
    description: 'Event was 31 days ago - should NOT show for feedback',
    getDaysOffset: (eventDate: Date) => {
      const monthAfter = new Date(eventDate);
      monthAfter.setDate(monthAfter.getDate() + 31);
      return monthAfter;
    }
  },
  
  // Event is tomorrow (should NOT show in feedback)
  DAY_BEFORE_EVENT: {
    name: 'Day Before Event',
    description: 'Event is tomorrow - should NOT show for feedback',
    getDaysOffset: (eventDate: Date) => {
      const dayBefore = new Date(eventDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      return dayBefore;
    }
  },
  
  // No recent events scenario
  NO_RECENT_EVENTS: {
    name: 'No Recent Events',
    description: 'All events are older than 30 days - should show empty state',
    getDaysOffset: (eventDate: Date) => {
      const longAfter = new Date(eventDate);
      longAfter.setDate(longAfter.getDate() + 45);
      return longAfter;
    }
  }
} as const;

export type TestScenario = keyof typeof TEST_SCENARIOS;