import {CalendarIcon} from '@sanity/icons/Calendar'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {readiness, type EventDraft} from '../lib/readiness'

/**
 * Events (type name stays "events"; renaming would mean migrating every document and reference).
 * V2 fields are additive: existing documents keep working, and migrations/v2-additive fills defaults.
 */
export default defineType({
  name: 'events',
  title: 'Events',
  type: 'document',
  icon: CalendarIcon,
  groups: [
    {name: 'basics', title: 'Basics', default: true},
    {name: 'venue', title: 'Venue'},
    {name: 'programme', title: 'Programme'},
    {name: 'practical', title: 'Good to know'},
    {name: 'tickets', title: 'Meetup'},
    {name: 'after', title: 'After the event'},
  ],
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', group: 'basics', validation: (r) => r.required()}),
    defineField({
      name: 'id',
      title: 'URL (ID)',
      type: 'slug',
      group: 'basics',
      description: 'The page lives at zurichjs.com/events/<ID>. Do not change it after publishing: links and search results use it.',
      options: {source: 'title', maxLength: 96},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'basics',
      description: 'The site also follows the clock: from doors the page opens feedback for 48 hours, then becomes the recap.',
      options: {
        list: [
          {title: 'Scheduled (RSVP open on Meetup)', value: 'scheduled'},
          {title: 'Date set, RSVP opens soon', value: 'rsvp-soon'},
          {title: 'Date to be confirmed', value: 'tbc'},
          {title: 'Full (Meetup waitlist)', value: 'full'},
          {title: 'Postponed', value: 'postponed'},
          {title: 'Cancelled', value: 'cancelled'},
        ],
        layout: 'radio',
      },
      initialValue: 'scheduled',
    }),
    defineField({
      name: 'datetime',
      title: 'Doors',
      type: 'datetime',
      group: 'basics',
      options: {timeStep: 15},
      validation: (r) =>
        r.custom((value, ctx) => {
          const s = (ctx.document as EventDraft | undefined)?.status ?? 'scheduled'
          return !value && ['scheduled', 'rsvp-soon', 'full'].includes(s) ? 'Scheduled events need a date and doors time.' : true
        }),
    }),
    defineField({name: 'endsAt', title: 'Ends', type: 'datetime', group: 'basics', options: {timeStep: 15}}),
    defineField({
      name: 'dateText',
      title: 'Month (when the date is not fixed)',
      type: 'string',
      group: 'basics',
      description: 'For "Date to be confirmed" events, e.g. "January 2027".',
      hidden: ({document}) => document?.status !== 'tbc',
    }),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 4, group: 'basics', validation: (r) => r.min(50).warning('Search snippets need at least 50 characters.')}),

    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'object',
      group: 'venue',
      options: {collapsible: false},
      fields: [
        defineField({name: 'name', title: 'Name', type: 'string'}),
        defineField({name: 'street', title: 'Street and number', type: 'string'}),
        defineField({name: 'zip', title: 'Postcode', type: 'string'}),
        defineField({name: 'city', title: 'City', type: 'string', initialValue: 'Zürich'}),
        defineField({name: 'directions', title: 'How to get there', type: 'text', rows: 3}),
        defineField({name: 'entrance', title: 'Entrance and floor', type: 'string', description: 'e.g. "Side entrance on Hardstrasse, 3rd floor, ring ZurichJS".'}),
        defineField({name: 'transport', title: 'Public transport', type: 'string', description: 'e.g. "Tram 4 or 13 to Escher-Wyss-Platz, 3 minutes on foot".'}),
        defineField({name: 'accessibility', title: 'Accessibility', type: 'string', description: 'Step-free access, lift, toilets. Only what you have checked.'}),
      ],
    }),
    defineField({name: 'venueNote', title: 'Venue note', type: 'string', group: 'venue', description: 'Shown when the venue is not confirmed yet.'}),
    defineField({name: 'location', title: 'Location (legacy)', type: 'string', group: 'venue', description: 'Used by the current site. Keep in sync with Venue › Name until the switch to V2.'}),
    defineField({name: 'address', title: 'Address (legacy)', type: 'string', group: 'venue', description: 'Used by the current site, e.g. "Hardstrasse 201, 8005 Zürich".'}),
    defineField({name: 'hosts', title: 'Hosts', type: 'array', group: 'venue', of: [defineArrayMember({type: 'reference', to: [{type: 'partner'}]})]}),
    defineField({
      name: 'supporters',
      title: 'Supporters of this event',
      type: 'array',
      group: 'venue',
      description: 'Shown as "Thanks to" on the event page and on the Tonight page. Hosts above are shown too; add them here only to give a more specific role.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'eventSupporter',
          fields: [
            defineField({name: 'partner', title: 'Partner', type: 'reference', to: [{type: 'partner'}], validation: (r) => r.required()}),
            defineField({
              name: 'role',
              title: 'Role',
              type: 'string',
              options: {
                list: [
                  {title: 'Venue host', value: 'venue'},
                  {title: 'Food and drinks', value: 'food'},
                  {title: 'Sponsor', value: 'sponsor'},
                  {title: 'Community partner', value: 'community'},
                ],
              },
              initialValue: 'sponsor',
            }),
          ],
          preview: {select: {title: 'partner.name', subtitle: 'role', media: 'partner.logo'}},
        }),
      ],
    }),

    defineField({
      name: 'talks',
      title: 'Talks',
      type: 'array',
      group: 'programme',
      description: 'In running order. Used for the programme when the agenda below is empty.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'talk'}]})],
    }),
    defineField({
      name: 'agenda',
      title: 'Agenda',
      type: 'array',
      group: 'programme',
      description:
        'The evening in running order, with times: doors, welcome, talks, breaks, networking. Use "Fill programme from talks" to start from the usual evening. When empty, the site lists the talks without times.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'agendaItem',
          fields: [
            defineField({name: 'time', title: 'Time', type: 'string', description: 'e.g. 18:30. Leave empty if not fixed yet; the site never guesses a time.', validation: (r) => r.regex(/^\d{2}:\d{2}$/, {name: 'HH:MM'})}),
            defineField({
              name: 'kind',
              title: 'Kind',
              type: 'string',
              description: 'Optional. The site infers it from the title or the talk when empty.',
              options: {
                list: [
                  {title: 'Doors', value: 'doors'},
                  {title: 'Welcome / intro', value: 'intro'},
                  {title: 'Talk', value: 'talk'},
                  {title: 'Break / food', value: 'break'},
                  {title: 'Networking', value: 'networking'},
                  {title: 'Close', value: 'close'},
                  {title: 'Other', value: 'other'},
                ],
              },
            }),
            defineField({name: 'title', title: 'Title', type: 'string'}),
            defineField({name: 'talk', title: 'Talk', type: 'reference', to: [{type: 'talk'}]}),
            defineField({name: 'note', title: 'Note', type: 'string'}),
          ],
          preview: {select: {time: 'time', title: 'title', talk: 'talk.title'}, prepare: ({time, title, talk}) => ({title: `${time ?? ''} ${title ?? talk ?? ''}`})},
        }),
      ],
    }),

    defineField({
      name: 'practical',
      title: 'Good to know',
      type: 'array',
      group: 'practical',
      description: 'Short facts: cost, language, food, accessibility, code of conduct.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'practicalInfo',
          fields: [defineField({name: 'label', title: 'Label', type: 'string'}), defineField({name: 'value', title: 'Text', type: 'text', rows: 2})],
          preview: {select: {title: 'label', subtitle: 'value'}},
        }),
      ],
    }),

    defineField({name: 'meetupUrl', title: 'Meetup event link', type: 'url', group: 'tickets', description: 'RSVPs happen on Meetup. The site links here; it does not register anyone.'}),
    defineField({
      name: 'sane',
      title: 'Free tickets on Sane',
      type: 'object',
      group: 'tickets',
      description:
        'Optional. When this is filled in and registration is open on Sane, the main button offers a free ticket on Sane. Meetup RSVPs stay open, and in every other case the button goes to Meetup.',
      fields: [
        defineField({name: 'organization', title: 'Sane organisation', type: 'string', description: 'The organisation part of the Sane link, e.g. "zurichjs".', validation: (r) => r.regex(/^[a-z0-9-]+$/, {name: 'slug'})}),
        defineField({name: 'event', title: 'Sane event', type: 'string', description: 'The event part of the Sane link, e.g. "november-2026".', validation: (r) => r.regex(/^[a-z0-9-]+$/, {name: 'slug'})}),
      ],
    }),
    // Pro meetups and paid tickets are gone: every meetup is free and RSVPs on Meetup.
    // These fields stay declared, read-only and hidden when empty, so values on
    // existing documents are kept and visible. Nothing is deleted.
    defineField({
      name: 'isProMeetup',
      title: 'Pro meetup (deprecated)',
      type: 'boolean',
      group: 'tickets',
      readOnly: true,
      hidden: ({value}) => !value,
      description: 'Not used by the site. Pro meetups no longer exist.',
    }),
    defineField({
      name: 'stripePriceId',
      title: 'Stripe price ID (deprecated)',
      type: 'string',
      group: 'tickets',
      readOnly: true,
      hidden: ({value}) => !value,
      description: 'Not used by the site. Paid tickets were removed.',
    }),
    defineField({
      name: 'ticketSaleUrl',
      title: 'Ticket sale URL (deprecated)',
      type: 'url',
      group: 'tickets',
      readOnly: true,
      hidden: ({value}) => !value,
      description: 'Not used by the site. Kept so existing values are not lost.',
    }),

    defineField({
      name: 'photoCredit',
      title: 'Photo credit',
      type: 'string',
      group: 'after',
      description: 'Shown with this event\'s gallery, e.g. "Photos: Enrique Ruiz Durazo". Leave empty if unknown.',
    }),
    defineField({name: 'image', title: 'Main image (promotional artwork)', type: 'image', group: 'after', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})]}),
    defineField({
      name: 'photos',
      title: 'Photos from the evening',
      type: 'array',
      group: 'after',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Alt text', type: 'string', validation: (r) => r.required()})]})],
      options: {layout: 'grid'},
    }),
    defineField({
      name: 'recap',
      title: 'Recap',
      type: 'object',
      group: 'after',
      description: 'Shown on the same URL once the feedback window has closed. Talks only; ZurichJS does not record talks. Slides, when a speaker shares them, go on the talk.',
      fields: [
        defineField({
          name: 'talks',
          title: 'Talks',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'recapTalk',
              fields: [
                defineField({name: 'talk', title: 'Talk', type: 'reference', to: [{type: 'talk'}]}),
                defineField({name: 'summary', title: 'One or two sentences', type: 'text', rows: 3}),
                defineField({name: 'format', title: 'Format label', type: 'string', description: 'e.g. "Talk · 25 min". Leave empty to derive it.'}),
              ],
              preview: {select: {title: 'talk.title', subtitle: 'summary'}},
            }),
          ],
        }),
      ],
    }),
    defineField({name: 'attendees', title: 'Attendees', type: 'number', group: 'after'}),
    defineField({name: 'excludeFromStats', title: 'Exclude from stats', type: 'boolean', group: 'after', initialValue: false}),
  ],
  validation: (r) =>
    r.custom((doc) => {
      if (!doc) return true
      const missing = readiness(doc as EventDraft).filter((c) => !c.ok)
      return missing.length ? {message: `Not ready to publish: ${missing.map((m) => m.label).join(', ')}`, level: 'warning'} as never : true
    }),
  orderings: [{title: 'Date, newest first', name: 'dateDesc', by: [{field: 'datetime', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', datetime: 'datetime', status: 'status', dateText: 'dateText', media: 'image'},
    prepare: ({title, datetime, status, dateText, media}) => ({
      title,
      subtitle: [datetime ? new Date(datetime).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Zurich'}) : dateText, status && status !== 'scheduled' ? status : null]
        .filter(Boolean)
        .join(' · '),
      media,
    }),
  },
})
