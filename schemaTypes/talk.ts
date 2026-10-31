import { defineType } from 'sanity';

export default defineType({
  name: 'talk',
  title: 'Talk',
  type: 'document',
  fields: [
    { name: 'id', title: 'ID', type: 'slug' },
    { name: 'title', title: 'Title', type: 'string' },
    { name: 'description', title: 'Description', type: 'text' },
    {
      name: 'type',
      title: 'Format',
      type: 'string',
      description: 'The site shows "Talk", "Lightning talk" or "Deep dive". Older free-text values still work.',
      options: {list: [{title: 'Talk', value: 'talk'}, {title: 'Lightning talk', value: 'lightning'}, {title: 'Deep dive', value: 'deep-dive'}]},
    },
    { name: 'level', title: 'Level', type: 'string', options: {list: ['Beginner', 'Intermediate', 'Advanced', 'All levels']} },
    { name: 'language', title: 'Language', type: 'string', initialValue: 'English' },
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
      description: 'Kept for the archive. Not shown on the website: ZurichJS does not publish slides.',
      title: 'Slides',
      type: 'file',
      options: {
        accept: '.pdf,.ppt,.pptx'
      }
    },
    {
      name: 'videoUrl',
      description: 'Kept for the archive. Not shown on the website: ZurichJS talks are not recorded.',
      title: 'Video URL',
      type: 'url',
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