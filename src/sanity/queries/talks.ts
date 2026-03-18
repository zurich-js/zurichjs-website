import { format } from 'date-fns';
import type { Talk } from '@/types';
import { client } from '../client';
import type { SanitySpeaker, SanityTalk } from './types';

export const getTalks = async (): Promise<Talk[]> => {
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

  return talks.map((talk: SanityTalk & { events: Array<{ id: string; title: string; datetime: string; location: string }> }) => ({
    _id: talk._id || "",
    id: talk.id || "",
    title: talk.title || "",
    description: talk.description || "",
    type: talk.type || "",
    tags: talk.tags || [],
    durationMinutes: talk.durationMinutes || 0,
    events: (talk.events || []).map((event) => ({
      id: event.id || "",
      title: event.title || "",
      date: event.datetime ? format(new Date(event.datetime), "MMMM d, yyyy") : "",
      location: event.location || "",
    })),
    speakers: talk.speakers?.map((speaker: SanitySpeaker) => ({
      id: speaker.id?.current || "",
      name: speaker.name || "",
      title: speaker.title || "",
      image: speaker.image?.asset?.url ?? '/images/speakers/default.png',
    })) || [],
  }));
};

export const getTalkById = async (talkId: string): Promise<Talk | null> => {
  const [talk] = await client.fetch(
    `*[_type == "talk" && id.current == $talkId] {
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
    }`,
    { talkId }
  );

  if (!talk) return null;

  return {
    _id: talk._id || "",
    id: talk.id || "",
    title: talk.title || "",
    description: talk.description || "",
    type: talk.type || "",
    tags: talk.tags || [],
    durationMinutes: talk.durationMinutes || 0,
    events: (talk.events || []).map((event: { id: string; title: string; datetime: string; location: string }) => ({
      id: event.id || "",
      title: event.title || "",
      date: event.datetime ? format(new Date(event.datetime), "MMMM d, yyyy") : "",
      location: event.location || "",
    })),
    speakers: talk.speakers?.map((speaker: SanitySpeaker) => ({
      id: speaker.id || "",
      name: speaker.name || "",
      title: speaker.title || "",
      image: speaker.image?.asset?.url ?? '/images/speakers/default.png',
    })) || [],
  };
};

export interface TalkSubmissionStats {
  pendingSubmissions: number;
  totalSubmissions: number;
  recentSubmissions: number;
  queuePosition: number;
}

export const getTalkSubmissionStats = async (): Promise<TalkSubmissionStats> => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const stats = await client.fetch(
    `{
      "pendingSubmissions": count(*[_type == "talkSubmission" && (status == "pending" || status == "under_review")]),
      "totalSubmissions": count(*[_type == "talkSubmission"]),
      "recentSubmissions": count(*[_type == "talkSubmission" && _createdAt >= $ninetyDaysAgo])
    }`,
    { ninetyDaysAgo: ninetyDaysAgo.toISOString() }
  );

  return {
    pendingSubmissions: stats.pendingSubmissions || 0,
    totalSubmissions: stats.totalSubmissions || 0,
    recentSubmissions: stats.recentSubmissions || 0,
    queuePosition: (stats.pendingSubmissions || 0) + 1,
  };
};

export const getRecentTalkExamples = async (): Promise<Array<{ title: string; abstract: string }>> => {
  const talks = await client.fetch(`
    *[_type == "talk" && defined(description) && defined(title)] | order(_createdAt desc) [0..6] {
      title,
      description
    }
  `);

  const validTalks = talks
    .filter((talk: { title: string; description: string }) =>
      talk.description && talk.description.trim().length > 20
    )
    .slice(0, 5);

  return validTalks.map((talk: { title: string; description: string }) => ({
    title: talk.title,
    abstract:
      talk.description.length > 100
        ? talk.description.substring(0, 100) + '...'
        : talk.description,
  }));
};
