import {RocketIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/** The conference module on the meetup site. Follows the conference lifecycle; never invent dates or prices. */
export default defineType({
  name: 'conference',
  title: 'Conference module',
  type: 'document',
  icon: RocketIcon,
  fields: [
    defineField({
      name: 'state',
      title: 'Conference state',
      type: 'string',
      options: {
        list: [
          {title: 'Next edition not announced', value: 'unannounced'},
          {title: 'Announced', value: 'announced'},
          {title: 'Tickets on sale', value: 'onsale'},
          {title: 'Sold out', value: 'soldout'},
          {title: 'Edition completed', value: 'completed'},
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({name: 'headline', title: 'Headline', type: 'string', validation: (r) => r.required().max(80)}),
    defineField({name: 'body', title: 'One or two sentences', type: 'text', rows: 3, validation: (r) => r.required().max(240)}),
    defineField({name: 'cta', title: 'Button text', type: 'string', validation: (r) => r.required().max(40)}),
    defineField({name: 'cfp', title: 'Call for papers line', type: 'string', description: 'Shown on the talk proposal page.'}),
    defineField({name: 'url', title: 'Conference site', type: 'url', initialValue: 'https://conf.zurichjs.com'}),
  ],
  preview: {select: {title: 'headline', subtitle: 'state'}},
})
