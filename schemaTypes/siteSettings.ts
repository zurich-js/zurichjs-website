import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/** Contact details, social links, association details, the award and the support page's Twint QR. */
export default defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'contact', title: 'Contact', default: true},
    {name: 'social', title: 'Social'},
    {name: 'association', title: 'Association'},
    {name: 'award', title: 'Award'},
    {name: 'support', title: 'Support page'},
  ],
  fields: [
    defineField({name: 'email', title: 'Main email', type: 'string', group: 'contact', initialValue: 'hello@zurichjs.com', validation: (r) => r.required().email()}),
    defineField({name: 'partnersEmail', title: 'Partnerships email', type: 'string', group: 'contact', validation: (r) => r.email()}),
    defineField({name: 'meetupGroupUrl', title: 'Meetup group', type: 'url', group: 'social', initialValue: 'https://www.meetup.com/zurich-js/'}),
    defineField({name: 'linkedinUrl', title: 'LinkedIn', type: 'url', group: 'social'}),
    defineField({name: 'blueskyUrl', title: 'Bluesky', type: 'url', group: 'social'}),
    defineField({name: 'instagramUrl', title: 'Instagram', type: 'url', group: 'social'}),
    defineField({name: 'slackInviteUrl', title: 'Slack invite', type: 'url', group: 'social'}),
    defineField({name: 'association', title: 'Association name', type: 'string', group: 'association', initialValue: 'Swiss JavaScript Group'}),
    defineField({name: 'uid', title: 'UID', type: 'string', group: 'association', initialValue: 'CHE-255.581.547'}),
    defineField({
      name: 'award',
      title: 'Award',
      type: 'object',
      group: 'award',
      description: 'Shown with the rating in one sentence near the top of the home page.',
      fields: [
        defineField({name: 'title', title: 'Title', type: 'string', initialValue: '2026 Open Source Award winner'}),
        defineField({name: 'category', title: 'Category', type: 'string', initialValue: 'Most Impactful Contribution to the Community'}),
        defineField({name: 'url', title: 'Announcement link', type: 'url'}),
      ],
    }),
    defineField({
      name: 'twintQr',
      title: 'Twint QR code',
      type: 'image',
      group: 'support',
      description: 'Shown on /donate for one-off contributions. Leave empty to show only the email address. Upload the QR from the Twint business app; never a test code.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          initialValue: 'Twint QR code for a contribution to ZurichJS',
          validation: (r) => r.required(),
        }),
      ],
    }),
    defineField({
      name: 'twintNote',
      title: 'Line under the QR code',
      type: 'string',
      group: 'support',
      description: 'Optional, one short sentence, e.g. "Scan with the Twint app. Any amount helps."',
      validation: (r) => r.max(120),
    }),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
