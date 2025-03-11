import { client } from "./client";
import get from "lodash.get";
import { format } from "date-fns";

export const getStats = async () => {
  const [{
    members,
    eventsHosted,
    speakersToDate,
    totalAttendees,
  }] = await client.fetch(`*[_type == "stats"]`);
  return {
    members,
    eventsHosted,
    speakersToDate,
    totalAttendees,
  };
};

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
    id: get(event, "id.current", ""),
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
      speakers: get(talk, "speakers", [])?.map((speaker: SanitySpeaker) => ({
        id: get(speaker, "id.current", ""),
        name: get(speaker, "name", ""),
        title: get(speaker, "title", ""),
        image: get(speaker, "image.asset.url", null) ?? '/images/speakers/default.png',
      })) || [],
    })) || [],
  };
};

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





