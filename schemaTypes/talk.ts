import { defineType } from 'sanity';

export default defineType({
  name: 'talk',
  title: 'Talk',
  type: 'document',
  fields: [
    { name: 'id', title: 'ID', type: 'slug' },
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'description', title: 'Description', type: 'text' },
    { name: 'type', title: 'Type', type: 'string' },
    { name: 'durationMinutes', title: 'Duration (minutes)', type: 'number' },
    {
      name: 'speakers',
      title: 'Speakers',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'speaker' }] }],
      description: 'Speakers who gave this talk'
    },
    {
      name: 'events',
      title: 'Events',
      type: 'reference',
      to: [{ type: 'events' }],
      description: 'The event where this talk was presented'
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags'
      }
    },
    {
      name: 'slides',
      title: 'Slides',
      type: 'file',
      options: {
        accept: '.pdf,.ppt,.pptx'
      }
    },
    {
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      description: 'Link to the talk recording'
    }
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'date',
      media: 'slides'
    }
  }
});