import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'feedback',
  title: 'Feedback',
  type: 'document',
  fields: [
    defineField({
      name: 'event',
      title: 'Event',
      type: 'reference',
      to: [{ type: 'events' }],
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'talk',
      title: 'Talk',
      type: 'reference',
      to: [{ type: 'talk' }],
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'speaker',
      title: 'Speaker',
      type: 'reference',
      to: [{ type: 'speaker' }],
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'rating',
      title: 'Rating',
      type: 'number',
      validation: (Rule) => Rule.required().min(1).max(5)
    }),
    defineField({
      name: 'comment',
      title: 'Comment',
      type: 'text'
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted At',
      type: 'datetime',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'ipHash',
      title: 'IP Hash',
      type: 'string',
      description: 'Hashed IP address to help prevent multiple submissions',
    }),
    defineField({
      name: 'browserFingerprint',
      title: 'Browser Fingerprint',
      type: 'string',
      description: 'Fingerprint to help identify unique users',
    })
  ],
  preview: {
    select: {
      title: 'talk.title',
      subtitle: 'speaker.name',
      rating: 'rating'
    },
    prepare({ title, subtitle, rating }: { title?: string; subtitle?: string; rating?: number }) {
      return {
        title: `${title || 'Untitled Talk'}`,
        subtitle: `${subtitle || 'Unknown Speaker'} - Rating: ${rating}/5`,
      };
    }
  }
})