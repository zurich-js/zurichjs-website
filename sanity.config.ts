import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {defineLocations, presentationTool} from 'sanity/presentation'
import {structureTool} from 'sanity/structure'
import ConvertSubmissionToTalkAction from './actions/convertSubmissionToTalk'
import {ReadinessBadge} from './components/ReadinessBadge'
import {defaultDocumentNode, structure} from './deskStructure'
import {PREVIEW_ORIGIN} from './lib/preview'
import {SINGLETONS, schemaTypes} from './schemaTypes'

const singletons = new Set<string>(SINGLETONS)

export default defineConfig({
  name: 'default',
  title: 'Zurich JS',

  projectId: 'viqjrovw',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [
    structureTool({structure, defaultDocumentNode}),
    // Preview the V2 Astro site (run `pnpm dev` in platform/ with SANITY_PERSPECTIVE=drafts and a read token).
    presentationTool({
      previewUrl: {origin: PREVIEW_ORIGIN, previewMode: {enable: '/'}},
      resolve: {
        locations: {
          events: defineLocations({
            select: {title: 'title', slug: 'id.current'},
            resolve: (doc) => ({locations: doc?.slug ? [{title: doc.title ?? 'Event', href: `/events/${doc.slug}`}, {title: 'Events', href: '/events'}] : []}),
          }),
          speaker: defineLocations({
            select: {title: 'name', slug: 'id.current'},
            resolve: (doc) => ({locations: doc?.slug ? [{title: doc.title ?? 'Speaker', href: `/speakers/${doc.slug}`}] : []}),
          }),
          meetupRating: defineLocations({locations: [{title: 'Home', href: '/'}]}),
          conference: defineLocations({locations: [{title: 'Home', href: '/'}]}),
        },
      },
    }),
    visionTool(),
  ],

  document: {
    actions: (prev, context) => {
      if (singletons.has(context.schemaType)) return prev.filter(({action}) => action && ['publish', 'discardChanges', 'restore'].includes(action))
      if (context.schemaType === 'talkSubmission') return [...prev, ConvertSubmissionToTalkAction]
      return prev
    },
    badges: (prev, context) => (context.schemaType === 'events' ? [...prev, ReadinessBadge] : prev),
    // Singletons are opened from the desk, never created from "New document".
    newDocumentOptions: (prev, {creationContext}) => (creationContext.type === 'global' ? prev.filter((t) => !singletons.has(t.templateId)) : prev),
  },

  schema: {
    types: schemaTypes,
    templates: (prev) => [
      ...prev.filter((t) => !singletons.has(t.schemaType)),
      {
        id: 'meetup-from-template',
        title: 'Meetup (from template)',
        schemaType: 'events',
        value: () => ({
          status: 'rsvp-soon',
          venue: {city: 'Zürich'},
          practical: [
            {_key: 'cost', _type: 'practicalInfo', label: 'Cost', value: 'Free. RSVP on Meetup so the host can plan food and drinks.'},
            {_key: 'lang', _type: 'practicalInfo', label: 'Language', value: 'Talks are in English.'},
            {_key: 'food', _type: 'practicalInfo', label: 'Food and drinks', value: 'Provided by the host after the talks, with vegetarian and vegan options.'},
            {_key: 'coc', _type: 'practicalInfo', label: 'Code of conduct', value: 'All ZurichJS events follow our code of conduct.'},
          ],
        }),
      },
    ],
  },
})
