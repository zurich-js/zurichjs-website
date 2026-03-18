import type { Speaker } from '@/types';
import { client } from '../client';
import type { SanitySpeaker, SanitySpeakerWithTalks, SanityTalk } from './types';

export const getSpeakers = async ({
  shouldFilterVisible = true,
}: {
  shouldFilterVisible?: boolean;
}): Promise<Speaker[]> => {
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
        videoUrl,
        durationMinutes,
        "events": *[_type == "events" && references(^._id)]{
          "id": id.current,
          title,
          datetime,
          location
        }
      }
    }`);

  const speakersWithTalkCount = speakers.map((speaker: SanitySpeaker & { talks: SanityTalk[] }) => ({
    ...speaker,
    image: speaker.image?.asset?.url ?? '/images/speakers/default.png',
    talks: speaker.talks || [],
    talkCount: (speaker.talks || []).length,
  }));

  return speakersWithTalkCount.sort((a: Speaker, b: Speaker) => b.talkCount - a.talkCount);
};

export const getSpeakerById = async (speakerId: string): Promise<Speaker | null> => {
  const [speaker] = await client.fetch(
    `*[_type == "speaker" && id.current == $speakerId] {
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
    }`,
    { speakerId }
  );

  if (!speaker) return null;

  return {
    _id: speaker._id,
    ...speaker,
    image: speaker.image?.asset?.url ?? '/images/speakers/default.png',
    talks: speaker.talks || [],
    talkCount: (speaker.talks || []).length,
  };
};

export const getSpeakersByIds = async (speakerIds: string[]): Promise<Speaker[]> => {
  const speakers = await client.fetch(
    `*[_type == "speaker" && id.current in $speakerIds] {
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
    }`,
    { speakerIds }
  );

  return speakers.map((speaker: SanitySpeakerWithTalks) => ({
    ...speaker,
    image: speaker.image?.asset?.url ?? '/images/speakers/default.png',
    talks: speaker.talks || [],
    talkCount: (speaker.talks || []).length,
  }));
};
