/**
 * Seeds the "v2-preview" dataset with the V2 design sample content so the
 * Presentation tool and the V2 site can be tried without touching production.
 *
 *   SANITY_WRITE_TOKEN=… npx sanity exec scripts/seed-v2-preview.ts --with-user-token
 *
 * Creating the dataset itself is a manual step (it may need a paid plan):
 *   npx sanity dataset create v2-preview --visibility private
 * Idempotent: documents use fixed IDs and createOrReplace. Never targets "production".
 */
import {getCliClient} from 'sanity/cli'

const DATASET = 'v2-preview'
const client = getCliClient({apiVersion: '2026-10-01'}).withConfig({dataset: DATASET})
if (client.config().dataset !== DATASET) throw new Error('Refusing to seed anything but v2-preview')

const ref = (_ref: string) => ({_type: 'reference', _ref})
const key = (k: string) => ({_key: k})

const docs = [
  {_id: 'siteSettings', _type: 'siteSettings', email: 'hello@zurichjs.com', meetupGroupUrl: 'https://www.meetup.com/zurich-js/', association: 'Swiss JavaScript Group', uid: 'CHE-255.581.547'},
  {_id: 'meetupRating', _type: 'meetupRating', score: '4.9', count: 199, scale: 5, url: 'https://www.meetup.com/zurich-js/', source: 'Meetup group page, public snapshot', checkedAt: '2026-09-28'},
  {
    _id: 'conference',
    _type: 'conference',
    state: 'unannounced',
    headline: 'Our annual conference, with community events and workshops around it.',
    body: 'The next edition hasn’t been announced yet. The conference site has the latest.',
    cta: 'Visit conf.zurichjs.com',
    cfp: 'It opens when the next edition is announced.',
    url: 'https://conf.zurichjs.com',
  },
  {_id: 'partner.sample-venue', _type: 'partner', id: {_type: 'slug', current: 'sample-venue'}, name: 'Sample Venue AG', url: 'https://example.com'},
  {_id: 'speaker.anna-beispiel', _type: 'speaker', id: {_type: 'slug', current: 'anna-beispiel'}, name: 'Anna Beispiel', title: 'Frontend engineer', tagline: 'Forms and TypeScript', isVisible: true, bio: 'Sample speaker from the V2 design.'},
  {_id: 'speaker.max-muster', _type: 'speaker', id: {_type: 'slug', current: 'max-muster'}, name: 'Max Muster', title: 'Design systems lead', tagline: 'Design systems at scale', isVisible: true, bio: 'Sample speaker from the V2 design.'},
  {
    _id: 'talk.typesafe-forms',
    _type: 'talk',
    id: {_type: 'slug', current: 'typesafe-forms'},
    title: 'Type-safe forms without the ceremony',
    type: 'talk',
    durationMinutes: 25,
    level: 'Intermediate',
    language: 'English',
    speakers: [{...ref('speaker.anna-beispiel'), ...key('anna')}],
  },
  {
    _id: 'talk.design-system-shipping',
    _type: 'talk',
    id: {_type: 'slug', current: 'design-system-shipping'},
    title: 'What we learned shipping a design system across teams that did not ask for one',
    type: 'talk',
    durationMinutes: 35,
    level: 'All levels',
    language: 'English',
    speakers: [{...ref('speaker.max-muster'), ...key('max')}],
  },
  {
    _id: 'event.2026-11-forms-types',
    _type: 'events',
    id: {_type: 'slug', current: '2026-11-forms-types'},
    title: 'Forms, types and design systems',
    status: 'scheduled',
    datetime: '2026-11-18T17:30:00.000Z',
    endsAt: '2026-11-18T20:30:00.000Z',
    venue: {name: 'Sample Venue AG', street: 'Musterstrasse 1', zip: '8005', city: 'Zürich'},
    location: 'Sample Venue AG',
    address: 'Musterstrasse 1, 8005 Zürich',
    description: 'Two talks about building forms people can trust and the design systems that hold them together. Bring questions; there is time after each talk.',
    meetupUrl: 'https://www.meetup.com/zurich-js/',
    talks: [
      {...ref('talk.typesafe-forms'), ...key('t1')},
      {...ref('talk.design-system-shipping'), ...key('t2')},
    ],
    hosts: [{...ref('partner.sample-venue'), ...key('h1')}],
    practical: [
      {...key('cost'), _type: 'practicalInfo', label: 'Cost', value: 'Free. RSVP on Meetup so the host can plan food and drinks.'},
      {...key('lang'), _type: 'practicalInfo', label: 'Language', value: 'Talks are in English.'},
    ],
  },
]

const tx = docs.reduce((t, d) => t.createOrReplace(d as never), client.transaction())
const res = await tx.commit()
console.log(`Seeded ${res.results.length} documents into ${DATASET}.`)
