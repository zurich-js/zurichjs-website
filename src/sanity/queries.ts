import { client } from "./client";
import get from "lodash.get";
import { format } from "date-fns";
import { Speaker, Talk } from "@/types";

// Define types for Sanity data structures
interface SanityImage {
  asset: {
    url: string;
  };
}

interface SanitySpeaker {
  id: { current: string };
  name: string;
  title: string;
  image: SanityImage;
  [key: string]: unknown;
}

interface SanityTalk {
  id: { current: string };
  title: string;
  description: string;
  type: string;
  tags: string[];
  speakers: SanitySpeaker[];
  [key: string]: unknown;
}

interface SanityEvent {
  id: { current: string };
  title: string;
  date: string;
  time: string;
  location: string;
  address: string;
  attendees: number;
  image: SanityImage;
  description: string;
  meetupUrl: string;
  talks: SanityTalk[];
  [key: string]: unknown;
}

const mapEventData = (event: SanityEvent) => {
  return {
    id: get(event, "id.current", "") as string,
    title: get(event, "title", ""),
    date: event.date ? format(new Date(event.date), "MMMM d, yyyy") : "",
    time: get(event, "time", ""),
    location: get(event, "location", ""),
    address: get(event, "address", ""),
    attendees: get(event, "attendees", 0),
    image: get(event, "image.asset.url", null),
    description: get(event, "description", ""),
    meetupUrl: get(event, "meetupUrl", ""),
    talks: get(event, "talks", [])?.map((talk: SanityTalk) => ({
      id: get(talk, "id.current", ""),
      title: get(talk, "title", ""),
      description: get(talk, "description", ""),
      type: get(talk, "type", ""),
      tags: get(talk, "tags", []),
      durationMinutes: get(talk, "durationMinutes", 0),
      speakers: get(talk, "speakers", [])?.map((speaker: SanitySpeaker) => ({
        id: get(speaker, "id.current", ""),
        name: get(speaker, "name", ""),
        title: get(speaker, "title", ""),
        image: get(speaker, "image.asset.url", null) ?? '/images/speakers/default.png',
      })) || [],
    })) || [],
  };
};

export type Event = ReturnType<typeof mapEventData>;

export const getUpcomingEvents = async () => {
  const events = await client.fetch(`*[_type == "events" && date > now()] {
    ...,
    "image": {
      "asset": {
        "url": image.asset->url
      }
    },
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
  const events = await client.fetch(`*[_type == "events" && date < now()] {
    ...,
    "image": {
      "asset": {
        "url": image.asset->url
      }
    },
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


export const getSpeakers = async (): Promise<Speaker[]> => {
  // First fetch all speakers with their talks
  const speakers = await client.fetch(`
    *[_type == "speaker"] {
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
          date,
          location
        }
      }
    }`);

  // Map the data and add talk count
  const speakersWithTalkCount = speakers.map((speaker: SanitySpeaker & { talks: SanityTalk[] }) => ({
    id: get(speaker, "id", ""),
    name: get(speaker, "name", ""),
    title: get(speaker, "title", ""),
    image: get(speaker, "image.asset.url", null) ?? '/images/speakers/default.png',
    bio: get(speaker, "bio", ""),
    website: get(speaker, "website", ""),
    twitter: get(speaker, "twitter", ""),
    github: get(speaker, "github", ""),
    linkedin: get(speaker, "linkedin", ""),
    talks: get(speaker, "talks", []),
    talkCount: get(speaker, "talks", []).length
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
        date,
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
  return talks.map((talk: SanityTalk & { events: Array<{ id: string; title: string; date: string; location: string }> }) => ({
    id: get(talk, "id", ""),
    title: get(talk, "title", ""),
    description: get(talk, "description", ""),
    type: get(talk, "type", ""),
    tags: get(talk, "tags", []),
    durationMinutes: get(talk, "durationMinutes", 0),
    events: get(talk, "events", []).map(event => ({
      id: get(event, "id", ""),
      title: get(event, "title", ""),
      date: event.date ? format(new Date(event.date), "MMMM d, yyyy") : "",
      location: get(event, "location", "")
    })),
    speakers: get(talk, "speakers", [])?.map((speaker: SanitySpeaker) => ({
      id: get(speaker, "id.current", ""),
      name: get(speaker, "name", ""),
      title: get(speaker, "title", ""),
      image: get(speaker, "image.asset.url", null) ?? '/images/speakers/default.png',
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




