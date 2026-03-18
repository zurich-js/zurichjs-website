import { client } from '../client';

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
    speakersToDate: stats.speakerCount || 0,
  };
};
