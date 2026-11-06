import {StarIcon} from '@sanity/icons/Star'
import {defineField, defineType} from 'sanity'

/**
 * Meetup's published group score, updated by hand after checking the group page
 * (Meetup API access is not available; no scraping). Clear "Score" to hide the
 * rating on the site. The site never prints the scale ("/5").
 */
export default defineType({
  name: 'meetupRating',
  title: 'Meetup rating',
  type: 'document',
  icon: StarIcon,
  fields: [
    defineField({name: 'score', title: 'Score', type: 'string', description: 'Exactly as Meetup shows it, e.g. "4.9". Empty hides the rating.', validation: (r) => r.regex(/^\d(\.\d)?$/)}),
    defineField({name: 'count', title: 'Number of ratings', type: 'number', validation: (r) => r.required().integer().min(1)}),
    defineField({name: 'scale', title: 'Scale', type: 'number', initialValue: 5, description: 'For reference only; not shown on the site.'}),
    defineField({name: 'url', title: 'Group page', type: 'url', initialValue: 'https://www.meetup.com/zurich-js/', validation: (r) => r.required()}),
    defineField({name: 'source', title: 'Source', type: 'string', initialValue: 'Meetup group page, public snapshot'}),
    defineField({name: 'checkedAt', title: 'Checked on', type: 'date', validation: (r) => r.required()}),
  ],
  preview: {select: {score: 'score', count: 'count', checkedAt: 'checkedAt'}, prepare: ({score, count, checkedAt}) => ({title: score ? `${score} from ${count} ratings` : 'Rating hidden', subtitle: checkedAt ? `Checked ${checkedAt}` : ''})},
})
