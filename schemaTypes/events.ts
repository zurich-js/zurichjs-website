import { defineType } from 'sanity';

export default defineType({
  name: 'events',
  title: 'Events',
  type: 'document',
  fields: [
    { name: 'id', title: 'ID', type: 'slug' },
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'datetime', title: 'Date and Time', type: 'datetime' },
    { name: 'location', title: 'Location', type: 'string' },
    { name: 'address', title: 'Address', type: 'string' },
    { name: 'description', title: 'Description', type: 'text' },
    { name: 'meetupUrl', title: 'Meetup URL', type: 'url' },
    { name: 'isProMeetup', title: 'Is Pro Meetup', type: 'boolean', initialValue: false },
    { name: 'ticketSaleUrl', title: 'Ticket Sale URL', type: 'url' },
    { name: 'image', title: 'Image', type: 'image' },
    { name: 'attendees', title: 'Attendees', type: 'number' },
    { name: 'excludeFromStats', title: 'Exclude from Stats', type: 'boolean', initialValue: false },
    { 
      name: 'talks', 
      title: 'Talks', 
      type: 'array', 
      of: [{ type: 'reference', to: [{ type: 'talk' }] }]
    },
  ],
});