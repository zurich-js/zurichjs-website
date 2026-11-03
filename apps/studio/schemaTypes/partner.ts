import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Companies and communities that host, sponsor or partner with ZurichJS.
 * The site separates current sponsors from past supporters with `current`
 * and the dates; it never calls a partner "current" unless an organiser ticked it.
 */
export default defineType({
  name: 'partner',
  title: 'Partner',
  type: 'document',
  fields: [
    defineField({name: 'id', title: 'ID', type: 'slug', options: {source: 'name'}}),
    defineField({name: 'name', title: 'Name', type: 'string'}),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      description: 'Transparent PNG or SVG on white works best.',
    }),
    defineField({name: 'url', title: 'Website URL', type: 'url'}),
    defineField({
      name: 'kinds',
      title: 'How they support ZurichJS',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {
        list: [
          {title: 'Sponsor', value: 'sponsor'},
          {title: 'Venue host', value: 'venue'},
          {title: 'Food and drinks', value: 'food'},
          {title: 'Community partner', value: 'community'},
          {title: 'Conference partner', value: 'conference'},
          {title: 'Supporting (tools, perks, services)', value: 'supporting'},
        ],
      },
    }),
    defineField({
      name: 'tier',
      title: 'Sponsorship tier',
      type: 'string',
      options: {list: ['champion', 'builder', 'friend', 'supporter']},
      hidden: ({document}) => !(document?.kinds as string[] | undefined)?.includes('sponsor'),
    }),
    defineField({
      name: 'current',
      title: 'Current',
      type: 'boolean',
      description:
        'Tick only while the relationship is active. Unticked partners are listed as past supporters, never as current sponsors.',
      initialValue: false,
    }),
    defineField({name: 'since', title: 'Since', type: 'date'}),
    defineField({
      name: 'until',
      title: 'Until',
      type: 'date',
      description: 'Leave empty while current.',
    }),
    defineField({
      name: 'description',
      title: 'One line',
      type: 'string',
      description: 'e.g. "Hosted three meetups in 2025".',
      validation: (r) => r.max(140),
    }),
    defineField({
      name: 'allowReferrer',
      title: 'Send referrer',
      type: 'boolean',
      description:
        'Some sponsors asked to see visits from zurichjs.com in their analytics. Ticked: links omit "noreferrer".',
      initialValue: false,
    }),
  ],
  preview: {
    select: {title: 'name', current: 'current', kinds: 'kinds', media: 'logo'},
    prepare: ({title, current, kinds, media}) => ({
      title,
      subtitle: [current ? 'Current' : 'Past', ...((kinds as string[]) ?? [])].join(' · '),
      media,
    }),
  },
})
