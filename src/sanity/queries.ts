import { format } from "date-fns";

import { Speaker, Talk } from "@/types";

import { client } from "./client";

// Define types for Sanity data structures
interface SanityImage {
  asset: {
    url: string;
  };
}

interface SanitySpeaker {
  _id: string;
  id: { current: string };
  name: string;
  title: string;
  image: SanityImage;
  [key: string]: unknown;
}

interface SanityTalk {
  _id: string;
  id: { current: string };
  title: string;
  description: string;
  type: string;
  tags: string[];
  slidesUrl: string;
  videoUrl: string;
  speakers: SanitySpeaker[];
  [key: string]: unknown;
}

interface SanityEvent {
  _id: string;
  id: { current: string };
  title: string;
  datetime: string;
  location: string;
  address: string;
  attendees: number;
  image: SanityImage;
  description: string;
  meetupUrl: string;
  talks: SanityTalk[];
  excludeFromStats?: boolean;
  [key: string]: unknown;
}

const mapEventData = (event: SanityEvent) => {
  return {
    _id: event._id || "",
    id: event.id?.current || "",
    title: event.title || "",
    datetime: event.datetime || "",
    location: event.location || "",
    address: event.address || "",
    attendees: event.attendees || 0,
    image: event.image?.asset?.url || null,
    description: event.description || "",
    meetupUrl: event.meetupUrl || "",
    excludeFromStats: event.excludeFromStats || false,
    talks: event.talks?.map((talk: SanityTalk) => ({
      id: talk.id?.current || "",
      title: talk.title || "",
      description: talk.description || "",
      type: talk.type || "",
      tags: talk.tags || [],
      durationMinutes: talk.durationMinutes as number || 0,
      slidesUrl: talk.slidesUrl || "",
      videoUrl: talk.videoUrl || "",
      speakers: talk.speakers?.map((speaker: SanitySpeaker) => ({
        id: speaker.id?.current || "",
        name: speaker.name || "",
        title: speaker.title || "",
        image: speaker.image?.asset?.url ?? '/images/speakers/default.png',
      })) || [],
    })) || [],
  };
};

export type Event = ReturnType<typeof mapEventData>;

export const getUpcomingEvents = async () => {
  const events = await client.fetch(`*[_type == "events" && datetime > now()] {
    ...,
    "image": {
      "asset": {
        "url": image.asset->url
      }
    },
    excludeFromStats,
    talks[]-> {
      ...,
      "id": id,
      speakers[]-> {
        ...,
        "id": id,
        "image": {
          "asset": {
            "url": image.asset->url
          }
        }
      }
    }
  }`);


  return events.map(mapEventData);
};

export const getPastEvents = async () => {
  const events = await client.fetch(`*[_type == "events" && datetime < now()] {
    ...,
    "image": {
      "asset": {
        "url": image.asset->url
      }
    },
    excludeFromStats,
    talks[]-> {
      ...,
      "id": id,
      speakers[]-> {
        ...,
        "id": id,
        "image": {
          "asset": {
            "url": image.asset->url
          }
        }
      }
    }
  }`);
  return events.map(mapEventData);
};

export const getEventById = async (eventId: string) => {
  const [event] = await client.fetch(`*[_type == "events" && id.current == $eventId] {
    ...,
    "image": {
      "asset": {
        "url": image.asset->url
      }
    },
    excludeFromStats,
    talks[]-> {
      ...,
      "id": id,
      speakers[]-> {
        ...,
        "id": id,
        "image": {
          "asset": {
            "url": image.asset->url
          }
        }
      }
    }
  }`, { eventId });

  return event ? mapEventData(event) : null;
};

// Add additional interfaces for the return types


export const getSpeakers = async ({
  shouldFilterVisible = true
}: {
  shouldFilterVisible?: boolean
}): Promise<Speaker[]> => {
  // First fetch all speakers with their talks
  const speakers = await client.fetch(`
    *[_type == "speaker" ${shouldFilterVisible ? '&& isVisible == true' : ''}] {
      ...,
      "id": id.current,
      "image": {
        "asset": {
          "url": image.asset->url
        }
      },
      "talks": *[_type == "talk" && references(^._id)]{
        "id": id.current,
        title,
        description,
        type,
        tags,
        durationMinutes,
        "events": *[_type == "events" && references(^._id)]{
          "id": id.current,
          title,
          datetime,
          location
        }
      }
    }`);

  // Map the data and add talk count
  const speakersWithTalkCount = speakers.map((speaker: SanitySpeaker & { talks: SanityTalk[] }) => ({
    ...speaker,
    image: speaker.image?.asset?.url ?? '/images/speakers/default.png',
    talks: speaker.talks || [],
    talkCount: (speaker.talks || []).length
  }));

  // Sort by talk count in descending order
  return speakersWithTalkCount.sort((a: Speaker, b: Speaker) => b.talkCount - a.talkCount);
};

export const getTalks = async (): Promise<Talk[]> => {
  // Fetch all talks with references to events they were presented at
  const talks = await client.fetch(`
    *[_type == "talk"] {
      ...,
      "id": id.current,
      "events": *[_type == "events" && references(^._id)] {
        "id": id.current,
        title,
        datetime,
        location
      },
      speakers[]-> {
        ...,
        "id": id.current,
        "image": {
          "asset": {
            "url": image.asset->url
          }
        }
      }
    }`);

  // Map the data to a consistent format
  return talks.map((talk: SanityTalk & { events: Array<{ id: string; title: string; datetime: string; location: string }> }) => ({
    _id: talk._id || "",
    id: talk.id || "",
    title: talk.title || "",
    description: talk.description || "",
    type: talk.type || "",
    tags: talk.tags || [],
    durationMinutes: talk.durationMinutes || 0,
    events: (talk.events || []).map(event => ({
      id: event.id || "",
      title: event.title || "",
      date: event.datetime ? format(new Date(event.datetime), "MMMM d, yyyy") : "",
      location: event.location || ""
    })),
    speakers: talk.speakers?.map((speaker: SanitySpeaker) => ({
      id: speaker.id?.current || "",
      name: speaker.name || "",
      title: speaker.title || "",
      image: speaker.image?.asset?.url ?? '/images/speakers/default.png',
    })) || [],
  }));
};

export const getStats = async () => {
  const stats = await client.fetch(`{
    "members": *[_type == "stats"][0].members,
    "totalAttendees": *[_type == "stats"][0].totalAttendees,
    "eventCount": count(*[_type == "events"]),
    "speakerCount": count(*[_type == "speaker"])
  }`);

  return {
    members: stats.members,
    totalAttendees: stats.totalAttendees,
    eventsHosted: stats.eventCount || 0,
    speakersToDate: stats.speakerCount || 0
  };
};

export const getSpeakerById = async (speakerId: string): Promise<Speaker | null> => {
  const [speaker] = await client.fetch(`
    *[_type == "speaker" && id.current == $speakerId] {
      ...,
      "id": id.current,
      email,
      "image": {
        "asset": {
          "url": image.asset->url
        }
      },
      "talks": *[_type == "talk" && references(^._id)]{
        "id": id.current,
        title,
        description,
        type,
        tags,
        durationMinutes,
        "events": *[_type == "events" && references(^._id)]{
          "id": id.current,
          title,
          datetime,
          location
        }
      }
    }`, { speakerId });

  if (!speaker) return null;

  return {
    _id: speaker._id,
    ...speaker,
    image: speaker.image?.asset?.url ?? '/images/speakers/default.png',
    talks: speaker.talks || [],
    talkCount: (speaker.talks || []).length
  };
};

export const getTalkById = async (talkId: string): Promise<Talk | null> => {
  const [talk] = await client.fetch(`
    *[_type == "talk" && id.current == $talkId] {
      ...,
      "id": id.current,
      "events": *[_type == "events" && references(^._id)] {
        "id": id.current,
        title,
        datetime,
        location
      },
      speakers[]-> {
        ...,
        "id": id.current,
        "image": {
          "asset": {
            "url": image.asset->url
          }
        }
      }
    }`, { talkId });

  if (!talk) return null;

  return {
    _id: talk._id || "",
    id: talk.id || "",
    title: talk.title || "",
    description: talk.description || "",
    type: talk.type || "",
    tags: talk.tags || [],
    durationMinutes: talk.durationMinutes || 0,
    events: (talk.events || []).map((event: Event) => ({
      id: event.id || "",
      title: event.title || "",
      date: event.datetime ? format(new Date(event.datetime), "MMMM d, yyyy") : "",
      location: event.location || ""
    })),
    speakers: talk.speakers?.map((speaker: SanitySpeaker) => ({
      id: speaker.id || "",
      name: speaker.name || "",
      title: speaker.title || "",
      image: speaker.image?.asset?.url ?? '/images/speakers/default.png',
    })) || [],
  };
};

// Define types for feedback data
export interface FeedbackItem {
  _id: string;
  id: {
    current: string;
  };
  rating: number;
  comment?: string;
  submittedAt: string;
  event: {
    _id: string;
    id: {
      current: string;
    };
    title: string;
    datetime: string;
  };
  talk: {
    _id: string;
    id: {
      current: string;
    };
    title: string;
  };
  speaker: {
    _id: string;
    id: {
      current: string;
    };
    name: string;
    image: string;
  };
}

export interface EventFeedbackStats {
  _id: string;
  id: string;
  title: string;
  date: string;
  feedbackCount: number;
  averageRating: number;
  talkCount: number;
}

// Interface for raw event data from Sanity
interface SanityEventStats {
  _id: string;
  title?: string;
  datetime?: string;
  feedbackCount?: number;
  averageRating?: number;
  talkCount?: number;
}

export interface SpeakerFeedbackStats {
  _id: string;
  id: string;
  name: string;
  image: string;
  feedbackCount: number;
  averageRating: number;
}

export interface TalkFeedbackStats {
  _id: string;
  title: string;
  speakerId: string;
  speakerName: string;
  speakerImage: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  feedbackCount: number;
  averageRating: number;
}

/**
 * Get all feedback items
 * 
 * @returns Promise with array of feedback items
 */
export const getFeedback = async (): Promise<FeedbackItem[]> => {
  return client.fetch(`
    *[_type == "feedback"] {
      _id,
      id,
      rating,
      comment,
      submittedAt,
      "event": event->{
        _id,
        id,
        title,
        datetime
      },
      "talk": talk->{
        _id,
        id,
        title
      },
      "speaker": speaker->{
        _id,
        id,
        name,
        "image": image.asset->url
      }
    } | order(submittedAt desc)
  `);
};

/**
 * Get event feedback statistics for all events with feedback
 * 
 * @returns Promise with array of event feedback statistics
 */
export const getEventFeedbackStats = async (): Promise<EventFeedbackStats[]> => {
  const eventStats = await client.fetch(`
    *[_type == "events" && count(*[_type == "feedback" && references(^._id)]) > 0] {
      _id,
      title,
      datetime,
      "feedbackCount": count(*[_type == "feedback" && references(^._id)]),
      "averageRating": round(array::avg(*[_type == "feedback" && references(^._id)].rating), 2),
      "talkCount": count(*[_type == "talk" && references(^._id)])
    } | order(datetime desc)
  `);
  
  return eventStats.map((event: SanityEventStats) => ({
    _id: event._id,
    title: event.title || "",
    date: event.datetime || "",
    feedbackCount: event.feedbackCount || 0,
    averageRating: event.averageRating || 0,
    talkCount: event.talkCount || 0
  }));
};

/**
 * Get speaker feedback statistics for all speakers with feedback
 * 
 * @returns Promise with array of speaker feedback statistics
 */
export const getSpeakerFeedbackStats = async (): Promise<SpeakerFeedbackStats[]> => {
  return client.fetch(`
    *[_type == "speaker" && count(*[_type == "feedback" && references(^._id)]) > 0] {
      _id,
      name,
      "image": image.asset->url,
      "feedbackCount": count(*[_type == "feedback" && references(^._id)]),
      "averageRating": round(array::avg(*[_type == "feedback" && references(^._id)].rating), 2)
    } | order(name asc)
  `);
};

/**
 * Get talk feedback statistics for all talks with feedback
 * 
 * @returns Promise with array of talk feedback statistics
 */
export const getTalkFeedbackStats = async (): Promise<TalkFeedbackStats[]> => {
  return client.fetch(`    *[_type == "talk" && count(*[_type == "feedback" && references(^._id)]) > 0] {
      _id,
      title,
      "speakerId": *[_type == "speaker" && _id in ^.speakers[]._ref][0]._id,
      "speakerName": *[_type == "speaker" && _id in ^.speakers[]._ref][0].name,
      "speakerImage": *[_type == "speaker" && _id in ^.speakers[]._ref][0].image.asset->url,
      "eventId": event->_id,
      "eventTitle": event->title,
      "eventDate": event->datetime,
      "feedbackCount": count(*[_type == "feedback" && references(^._id)]),
      "averageRating": round(array::avg(*[_type == "feedback" && references(^._id)].rating), 2)
    } | order(eventDate desc)
  `);
};

/**
 * Get feedback statistics for a specific event
 * 
 * @param eventId - ID of the event
 * @returns Promise with event feedback statistics or null if not found
 */
export const getEventFeedbackById = async (eventId: string): Promise<EventFeedbackStats | null> => {
  const [eventStats] = await client.fetch(`
    *[_type == "events" && _id == $eventId] {
      _id,
      title,
      datetime,
      "feedbackCount": count(*[_type == "feedback" && references(^._id)]),
      "averageRating": round(array::avg(*[_type == "feedback" && references(^._id)].rating), 2),
      "talkCount": count(*[_type == "talk" && references(^._id)])
    }
  `, { eventId });
  
  if (!eventStats) return null;
  
  return {
    _id: eventStats._id,
    id: eventStats.id.current,
    title: eventStats.title || "",
    date: eventStats.datetime || "",
    feedbackCount: eventStats.feedbackCount || 0,
    averageRating: eventStats.averageRating || 0,
    talkCount: eventStats.talkCount || 0
  };
};

/**
 * Get all feedback items for a specific event
 * 
 * @param eventId - ID of the event
 * @returns Promise with array of feedback items
 */
export const getFeedbackByEventId = async (eventId: string): Promise<FeedbackItem[]> => {
  return client.fetch(`
    *[_type == "feedback" && event._ref == $eventId] {
      _id,
      rating,
      comment,
      submittedAt,
      "event": event->{
        _id,
        title,
        datetime
      },
      "talk": talk->{
        _id,
        title
      },
      "speaker": speaker->{
        _id,
        name,
        "image": image.asset->url
      }
    } | order(submittedAt desc)
  `, { eventId });
};

/**
 * Get all feedback items for a specific speaker
 * 
 * @param speakerId - ID of the speaker
 * @returns Promise with array of feedback items
 */
export const getFeedbackBySpeakerId = async (speakerId: string): Promise<FeedbackItem[]> => {
  return client.fetch(`    *[_type == "feedback" && speaker->id.current == $speakerId] {
      _id,
      rating,
      comment,
      submittedAt,
      "event": event->,
      "talk": talk->{
        _id,
        title
      },
      "speaker": speaker->{
        _id,
        id,
        name,
        "image": image.asset->url
      }
    } | order(submittedAt desc)
  `, { speakerId });
};








