// Re-export all queries for backwards compatibility
export { getUpcomingEvents, getPastEvents, getEventById, getEventsForUTM, getRecentPastEventsForFeedback, getUpcomingEventsForTestScenarios } from './events';
export type { Event, UTMEvent } from './events';

export { getSpeakers, getSpeakerById, getSpeakersByIds } from './speakers';

export { getTalks, getTalkById, getTalkSubmissionStats, getRecentTalkExamples } from './talks';
export type { TalkSubmissionStats } from './talks';

export { getFeedback, getEventFeedbackStats, getSpeakerFeedbackStats, getTalkFeedbackStats, getEventFeedbackById, getFeedbackByEventId, getFeedbackBySpeakerId } from './feedback';
export type { FeedbackItem, EventFeedbackStats, SpeakerFeedbackStats, TalkFeedbackStats } from './feedback';

export { getCurrentAnnouncement } from './announcements';
export type { Announcement } from './announcements';

export { getStats } from './stats';
