import { client } from '../client';

export interface FeedbackItem {
  _id: string;
  id: { current: string };
  rating: number;
  comment?: string;
  submittedAt: string;
  event: {
    _id: string;
    id: { current: string };
    title: string;
    datetime: string;
  };
  talk: {
    _id: string;
    id: { current: string };
    title: string;
  };
  speaker: {
    _id: string;
    id: { current: string };
    name: string;
    image: string;
  };
  productFeedback?: {
    productId: string;
    productName: string;
    rating: number;
    interests: string[];
    questions: string;
    learningPreferences: string[];
    detailedFeedback: string;
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

export const getFeedback = async (): Promise<FeedbackItem[]> => {
  return client.fetch(`
    *[_type == "feedback"] {
      _id, id, rating, comment, submittedAt,
      "event": event->{ _id, id, title, datetime },
      "talk": talk->{ _id, id, title },
      "speaker": speaker->{ _id, id, name, "image": image.asset->url },
      productFeedback {
        "product": product->{
          ...,
          "logo": { "asset": { "url": logo.asset->url } },
          websiteUrl
        },
        rating, interests, questions, learningPreferences, detailedFeedback
      }
    } | order(submittedAt desc)
  `);
};

export const getEventFeedbackStats = async (): Promise<EventFeedbackStats[]> => {
  const eventStats = await client.fetch(`
    *[_type == "events" && count(*[_type == "feedback" && references(^._id)]) > 0] {
      _id, title, datetime,
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
    talkCount: event.talkCount || 0,
  }));
};

export const getSpeakerFeedbackStats = async (): Promise<SpeakerFeedbackStats[]> => {
  return client.fetch(`
    *[_type == "speaker" && count(*[_type == "feedback" && references(^._id)]) > 0] {
      _id, name, "image": image.asset->url,
      "feedbackCount": count(*[_type == "feedback" && references(^._id)]),
      "averageRating": round(array::avg(*[_type == "feedback" && references(^._id)].rating), 2)
    } | order(name asc)
  `);
};

export const getTalkFeedbackStats = async (): Promise<TalkFeedbackStats[]> => {
  return client.fetch(`
    *[_type == "talk" && count(*[_type == "feedback" && references(^._id)]) > 0] {
      _id, title,
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

export const getEventFeedbackById = async (eventId: string): Promise<EventFeedbackStats | null> => {
  const [eventStats] = await client.fetch(
    `*[_type == "events" && _id == $eventId] {
      _id, title, datetime,
      "feedbackCount": count(*[_type == "feedback" && references(^._id)]),
      "averageRating": round(array::avg(*[_type == "feedback" && references(^._id)].rating), 2),
      "talkCount": count(*[_type == "talk" && references(^._id)])
    }`,
    { eventId }
  );

  if (!eventStats) return null;

  return {
    _id: eventStats._id,
    id: eventStats.id?.current,
    title: eventStats.title || "",
    date: eventStats.datetime || "",
    feedbackCount: eventStats.feedbackCount || 0,
    averageRating: eventStats.averageRating || 0,
    talkCount: eventStats.talkCount || 0,
  };
};

export const getFeedbackByEventId = async (eventId: string): Promise<FeedbackItem[]> => {
  return client.fetch(
    `*[_type == "feedback" && event._ref == $eventId] {
      _id, rating, comment, submittedAt,
      "event": event->{ _id, title, datetime },
      "talk": talk->{ _id, title },
      "speaker": speaker->{ _id, name, "image": image.asset->url }
    } | order(submittedAt desc)`,
    { eventId }
  );
};

export const getFeedbackBySpeakerId = async (speakerId: string): Promise<FeedbackItem[]> => {
  return client.fetch(
    `*[_type == "feedback" && speaker->id.current == $speakerId] {
      _id, rating, comment, submittedAt,
      "event": event->{ _id, id, title, datetime },
      "talk": talk->{ _id, id, title },
      "speaker": speaker->{ _id, id, name, "image": image.asset->url },
      productFeedback {
        "product": product->{
          ...,
          "logo": { "asset": { "url": logo.asset->url } },
          websiteUrl
        },
        rating, interests, questions, learningPreferences, detailedFeedback
      }
    } | order(submittedAt desc)`,
    { speakerId }
  );
};
