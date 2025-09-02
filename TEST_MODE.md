# Test Mode for Feedback Form

This document explains how to use the test mode functionality to test different date/time scenarios for the feedback form.

## Overview

Test mode allows developers to simulate different dates to see how users will experience the feedback form in various scenarios (e.g., right after an event, weeks later, or when no recent events are available).

## How It Works

- **Auto-enabled in Development**: Test mode is automatically enabled when `NODE_ENV=development`
- **URL-based Date Override**: Use `?testDate=YYYY-MM-DD` in the URL to simulate a specific date
- **UI Controls**: Development-only UI panel with quick scenario buttons

## Usage

### Method 1: URL Parameters

Visit the feedback page with a test date parameter:
```
http://localhost:3000/feedback?testDate=2024-01-16
```

This will simulate that the current date is January 16, 2024.

### Method 2: Test Mode UI (Development Only)

1. Visit `/feedback` in development mode
2. You'll see a yellow "🧪 Test Mode (Development)" panel
3. Click "Show Controls" to expand the test interface
4. View real-time info about:
   - Current test date (simulated vs real)
   - Number of events available for feedback
   - Number of upcoming events for scenarios
   - 30-day feedback window details
5. Either:
   - Set a custom date using the date input
   - Use one of the smart scenario buttons (based on real events)

## Test Scenarios

The system automatically generates scenarios using **real upcoming events** from your database:

### Dynamic Scenarios (Based on Real Events)

The test mode fetches your actual upcoming events and creates scenarios relative to their dates:

#### 1. **Day After Event**
- **Purpose**: Test when user visits feedback form the day after an event
- **Expected**: Event should show in the feedback form
- **Use Case**: Most common scenario for feedback collection
- **Generated**: Uses your next upcoming event + 1 day

#### 2. **Week After Event** 
- **Purpose**: Test feedback collection a week after an event
- **Expected**: Event should still show (within 30-day window)
- **Use Case**: Users who attend but provide feedback later
- **Generated**: Uses your next upcoming event + 7 days

#### 3. **Month After Event**
- **Purpose**: Test when event is outside the 30-day feedback window
- **Expected**: Event should NOT show (too old for feedback)
- **Use Case**: Ensure old events don't appear
- **Generated**: Uses your next upcoming event + 31 days

#### 4. **Day Before Event**
- **Purpose**: Test when event hasn't happened yet
- **Expected**: Event should NOT show (future events excluded)
- **Use Case**: Prevent feedback on events that haven't occurred
- **Generated**: Uses your next upcoming event - 1 day

#### 5. **No Recent Events**
- **Purpose**: Test when all events are older than 30 days
- **Expected**: Show "No Recent Events Found" message
- **Use Case**: Handle periods with no recent meetups
- **Generated**: Uses your next upcoming event + 45 days

### Smart Scenario Display

Each scenario button shows:
- **Event name** (truncated if long)
- **Calculated test date** 
- **Hover tooltip** with full event details
- **Real-time feedback counts** in the test mode panel

## Technical Details

### Files Involved

- `src/lib/testMode.ts` - Test mode utilities and configuration
- `src/pages/feedback.tsx` - Feedback page with test controls
- `src/sanity/queries.ts` - Updated query function with test date support

### Environment Variables

```bash
# .env.local (optional - for setting default test date)
NEXT_PUBLIC_TEST_CURRENT_DATE=2024-01-16
```

### Key Functions

- `getTestModeConfig(urlTestDate?)` - Gets current test configuration with URL override support
- `getCurrentDate()` - Returns current date (real or test)
- `getRecentPastEventsForFeedback(testDate?)` - Fetches recent events for feedback with optional test date
- `getUpcomingEventsForTestScenarios()` - Fetches upcoming events for generating test scenarios

## Example Testing Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Visit Feedback Page**
   ```
   http://localhost:3000/feedback
   ```

3. **Test Different Scenarios**
   - Use quick scenario buttons to jump between test cases
   - Observe how the form behaves (events shown/hidden, empty states)
   - Test form submission with different scenarios

4. **Reset to Real Date**
   - Click "🔄 Reset to Real Date" button
   - Or visit `/feedback` without query parameters

## Production Behavior

- Test mode is **disabled in production** 
- No test UI panel will appear
- Only real dates are used
- URL parameters are ignored in production

## Tips for Testing

1. **Use Browser Dev Tools**: Check network requests to see what events are being fetched
2. **Test Edge Cases**: Try dates with no events, invalid dates, etc.
3. **Check Mobile**: Ensure test controls work on mobile viewports
4. **Form Flow**: Test complete feedback submission flow in different scenarios
5. **Analytics**: Verify tracking events fire correctly in test scenarios

## Troubleshooting

**Test controls not showing?**
- Ensure you're running in development mode (`npm run dev`)
- Check that `NODE_ENV=development`

**Date not updating?**
- The page uses Server-Side Rendering - you need to reload to see changes
- Test controls automatically reload the page when applying new dates

**Events not showing as expected?**
- Check your Sanity database has events within the test date ranges
- Verify event dates are in the correct format in your CMS
- Remember: only past events within 30 days show for feedback
