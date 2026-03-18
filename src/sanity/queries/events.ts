import { client } from '../client';
import type { SanityEvent, SanityTalk, SanitySpeaker } from './types';

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
    isProMeetup: event.isProMeetup || false,
    meetupUrl: event.meetupUrl || "",
    stripePriceId: event.stripePriceId || "",
    excludeFromStats: event.excludeFromStats || false,
    talks: event.talks?.map((talk: SanityTalk) => ({
      id: talk.id?.current || "",
      title: talk.title || "",
      description: talk.description || "",
      type: talk.type || "",
      tags: talk.tags || [],
      durationMinutes: talk.durationMinutes as number || 0,
      slides: talk.slides || "",
      videoUrl: talk.videoUrl || "",
      productDemo: talk.productDemo ? {
        id: talk.productDemo.id?.current || "",
        name: talk.productDemo.name || "",
        description: talk.productDemo.description || "",
        logo: talk.productDemo.logo?.asset?.url || null,
        websiteUrl: talk.productDemo.websiteUrl || ""
      } : null,
      productDemos: talk.productDemos ? talk.productDemos : [],
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

export interface UTMEvent {
  _id: string;
  id: string;
  title: string;
  datetime: string;
  location: string;
  talks: Array<{
    speakers: Array<{
      id: string;
      name: string;
    }>;
  }>;
}

interface SanityUTMEvent {
  _id: string;
  id: string;
  title: string;
  datetime: string;
  location: string;
  talks?: Array<{
    speakers?: Array<{
      id: string;
      name: string;
    }>;
  }>;
}

const EVENT_FIELDS = `
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
    productDemo-> {
      "id": id,
      name,
      description,
      "logo": {
        "asset": {
          "url": logo.asset->url
        }
      },
      websiteUrl
    },
    productDemos[]-> {
      "id": id,
      name,
      description,
      "logo": {
        "asset": {
          "url": logo.asset->url
        }
      },
      websiteUrl
    },
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
`;

export const getUpcomingEvents = async () => {
  const events = await client.fetch(
    `*[_type == "events" && datetime > now()] | order(datetime asc) { ${EVENT_FIELDS} }`
  );
  return events.map(mapEventData);
};

export const getPastEvents = async () => {
  const events = await client.fetch(
    `*[_type == "events" && datetime < now()] | order(datetime desc) { ${EVENT_FIELDS} }`
  );
  return events.map(mapEventData);
};

export const getEventById = async (eventId: string) => {
  const [event] = await client.fetch(
    `*[_type == "events" && id.current == $eventId] {
      ...,
      "image": { "asset": { "url": image.asset->url } },
      excludeFromStats,
      talks[]-> {
        ...,
        "id": id,
        productDemo-> {
          "id": id, name, description,
          "logo": { "asset": { "url": logo.asset->url } },
          websiteUrl
        },
        productDemos[]-> {
          ..., name, description,
          "logo": logo.asset->url,
          websiteUrl
        },
        speakers[]-> {
          ...,
          "id": id,
          "image": { "asset": { "url": image.asset->url } }
        }
      }
    }`,
    { eventId }
  );
  return event ? mapEventData(event) : null;
};

export const getEventsForUTM = async (options: {
  limit?: number;
  monthsBack?: number;
  monthsAhead?: number;
} = {}): Promise<UTMEvent[]> => {
  const { limit = 50, monthsBack = 6, monthsAhead = 12 } = options;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + monthsAhead);

  const events = await client.fetch(
    `*[_type == "events" && datetime >= $startDate && datetime <= $endDate] | order(datetime desc) [0...$limit] {
      _id,
      "id": id.current,
      title,
      datetime,
      location,
      talks[]-> {
        speakers[]-> {
          "id": id.current,
          name
        }
      }
    }`,
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: limit - 1,
    }
  );

  return events.map((event: SanityUTMEvent) => ({
    _id: event._id,
    id: event.id,
    title: event.title,
    datetime: event.datetime,
    location: event.location,
    talks: event.talks?.map((talk) => ({
      speakers: talk.speakers?.map((speaker) => ({
        id: speaker.id,
        name: speaker.name,
      })) || [],
    })) || [],
  }));
};

export const getRecentPastEventsForFeedback = async (testCurrentDate?: Date): Promise<Event[]> => {
  const currentDate = testCurrentDate || new Date();

  const endOfToday = new Date(currentDate);
  endOfToday.setHours(23, 59, 59, 999);

  const thirtyDaysAgo = new Date(currentDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const events = await client.fetch(
    `*[_type == "events" && datetime <= $endOfToday && datetime >= $thirtyDaysAgo] | order(datetime desc) { ${EVENT_FIELDS} }`,
    {
      endOfToday: endOfToday.toISOString(),
      thirtyDaysAgo: thirtyDaysAgo.toISOString(),
    }
  );
  return events.map(mapEventData);
};

export const getUpcomingEventsForTestScenarios = async (): Promise<Event[]> => {
  const events = await client.fetch(
    `*[_type == "events" && datetime > now()] | order(datetime asc) [0..9] { ${EVENT_FIELDS} }`
  );
  return events.map(mapEventData);
};
