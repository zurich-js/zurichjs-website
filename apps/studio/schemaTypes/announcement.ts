import { defineType } from 'sanity';

export default defineType({
  name: 'announcement',
  title: 'Announcement',
  type: 'document',
  fields: [
    { name: 'id', title: 'ID', type: 'slug' },
    { 
      name: 'type', 
      title: 'Type', 
      type: 'string',
      options: {
        list: [
          { title: 'Event', value: 'event' },
          { title: 'Promotion', value: 'promotion' },
          { title: 'Workshop', value: 'workshop' },
          { title: 'General', value: 'general' },
        ],
      },
    },
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'message', title: 'Message', type: 'text' },
    { 
      name: 'cta', 
      title: 'Call to Action', 
      type: 'object',
      fields: [
        { name: 'text', title: 'Button Text', type: 'string' },
        { name: 'href', title: 'Link', type: 'string' },
      ],
    },
    { 
      name: 'conditions', 
      title: 'Display Conditions', 
      type: 'object',
      fields: [
        { name: 'startDate', title: 'Start Date', type: 'datetime' },
        { name: 'endDate', title: 'End Date', type: 'datetime' },
        { name: 'requiresLogin', title: 'Requires Login', type: 'boolean', initialValue: false },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      type: 'type',
      startDate: 'conditions.startDate',
    },
    prepare({ title, type, startDate }: any) {
      return {
        title,
        subtitle: `${type} - ${new Date(startDate).toLocaleDateString()}`,
      };
    },
  },
});
