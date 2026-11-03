import { defineType } from 'sanity';

export default defineType({
  name: 'stats',
  title: 'Statistics',
  type: 'document',
  fields: [
    { name: 'members', title: 'Members', type: 'number' },
    { name: 'totalAttendees', title: 'Total Attendees', type: 'number' },
  ],
});