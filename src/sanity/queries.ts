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

const mapEventData = (event: any) => {
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
    talks: get(event, "talks", [])?.map((talk: any) => ({
      id: get(talk, "id.current", ""),
      title: get(talk, "title", ""),
      description: get(talk, "description", ""),
      type: get(talk, "type", ""),
      tags: get(talk, "tags", []),
      speakers: get(talk, "speakers", [])?.map((speaker: any) => ({
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





