import {CommentIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Evening feedback. The current site already writes these documents
 * (src/pages/api/event-feedback.ts); this declares them so they show in the Studio.
 * All fields read-only: they come from the public form.
 */
export default defineType({
  name: 'comprehensiveFeedback',
  title: 'Evening feedback',
  type: 'document',
  icon: CommentIcon,
  readOnly: true,
  fields: [
    defineField({name: 'event', title: 'Event', type: 'reference', to: [{type: 'events'}]}),
    defineField({name: 'eventId', title: 'Event ID', type: 'string', hidden: true}),
    defineField({name: 'eventType', title: 'Event type', type: 'string'}),
    defineField({name: 'overallRating', title: 'Overall (1–5)', type: 'number'}),
    defineField({
      name: 'ratings',
      title: 'Ratings',
      type: 'object',
      fields: ['foodOptions', 'drinks', 'talks', 'timing', 'execution'].map((name) =>
        defineField({name, type: 'object', fields: [defineField({name: 'rating', type: 'number'}), defineField({name: 'comments', type: 'text'})]}),
      ),
    }),
    defineField({name: 'moreOf', title: 'Do more of', type: 'text'}),
    defineField({name: 'improvements', title: 'Do less of / what could be better', type: 'text'}),
    defineField({name: 'futureTopics', title: 'Hear about next', type: 'text'}),
    defineField({name: 'arrivalIssues', title: 'Confusing or awkward about coming', type: 'text'}),
    defineField({name: 'describeToFriend', title: 'How they’d describe it to a friend', type: 'text', description: 'Quotable only when "May quote" is ticked.'}),
    defineField({name: 'worthTime', title: 'Worth the time', type: 'string'}),
    defineField({name: 'wouldRecommend', title: 'Would recommend', type: 'string'}),
    defineField({name: 'dealOfDay', title: 'Deal of the day', type: 'object', fields: [defineField({name: 'rating', type: 'number'}), defineField({name: 'comments', type: 'text'})]}),
    defineField({name: 'additionalComments', title: 'Other comments', type: 'text'}),
    defineField({name: 'quoteConsent', title: 'May quote on the website', type: 'boolean'}),
    defineField({name: 'email', title: 'Email (optional)', type: 'string'}),
    defineField({name: 'submittedAt', title: 'Submitted', type: 'datetime'}),
    defineField({name: 'ipHash', type: 'string', hidden: true}),
    defineField({name: 'browserFingerprint', type: 'string', hidden: true}),
  ],
  orderings: [{title: 'Newest first', name: 'submittedDesc', by: [{field: 'submittedAt', direction: 'desc'}]}],
  preview: {
    select: {event: 'event.title', rating: 'overallRating', at: 'submittedAt'},
    prepare: ({event, rating, at}) => ({title: `${rating ?? '?'} · ${event ?? 'Unknown event'}`, subtitle: at ? new Date(at).toLocaleString('en-GB') : ''}),
  },
})
