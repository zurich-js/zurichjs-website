// schemas/speaker.ts
import { defineType } from 'sanity';

export default defineType({
  name: 'speaker',
  title: 'Speaker',
  type: 'document',
  fields: [
    { 
      name: 'id', 
      title: 'ID', 
      type: 'slug' 
    },
    { 
      name: 'name', 
      title: 'Name', 
      type: 'string',
    },
    { 
      name: 'email', 
      title: 'Email', 
      type: 'string',
    },
    { 
      name: 'title', 
      title: 'Job Title', 
      type: 'string' 
    },
    {
      name: 'company',
      title: 'Company',
      type: 'string',
      description: 'Already written by the talk proposal form on the current site.',
    },
    {
      name: 'location',
      title: 'Location',
      type: 'string',
    },
    {
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'One short line for teaser cards on the home page, e.g. "Forms and TypeScript".',
      validation: (Rule) => Rule.max(60),
    },
    {
      name: 'interests',
      title: 'Topics',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    },
    { 
      name: 'image', 
      title: 'Image', 
      type: 'image',
      options: {
        hotspot: true
      } 
    },
    { 
      name: 'bio', 
      title: 'Bio', 
      type: 'text' 
    },
    { 
      name: 'twitter', 
      title: 'Twitter', 
      type: 'url' 
    },
    { 
      name: 'linkedin', 
      title: 'LinkedIn', 
      type: 'url',
      validation: Rule => Rule.uri({scheme: ['http', 'https']})
    },
    { 
      name: 'github', 
      title: 'GitHub', 
      type: 'url' 
    },
    { 
      name: 'website', 
      title: 'Website', 
      type: 'url' 
    },
    { 
      name: 'talks', 
      title: 'Number of Talks', 
      type: 'number' 
    },
    {
      name: 'isVisible',
      title: 'Is Visible',
      type: 'boolean',
      description: 'Whether this speaker is visible on the website',
      initialValue: false
    },
    {
      name: 'legacySlugs',
      title: 'Old URLs (IDs)',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      description: 'Earlier IDs of this speaker. zurichjs.com/speakers/<old ID> redirects to the current page. Add the old ID here whenever you change the ID above.',
    },
    {
      name: 'talkReferences',
      title: 'Talks',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'talk' }] }],
      description: 'Talks this speaker has given',
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'title',
      media: 'image'
    }
  }
});