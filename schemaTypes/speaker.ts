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