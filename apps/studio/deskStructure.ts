import {
  BlockContentIcon,
  CalendarIcon,
  CheckmarkCircleIcon,
  ClockIcon,
  CogIcon,
  CommentIcon,
  DocumentIcon,
  MasterDetailIcon,
  RocketIcon,
  StarIcon,
  UsersIcon,
  WarningOutlineIcon,
} from '@sanity/icons'
import type {DefaultDocumentNodeResolver, StructureBuilder} from 'sanity/structure'
import {ReadinessView} from './components/ReadinessView'

const now = 'now()'

/** Events open with the form plus a "Readiness" checklist of what the public page needs. */
export const defaultDocumentNode: DefaultDocumentNodeResolver = (S, {schemaType}) =>
  schemaType === 'events' ? S.document().views([S.view.form(), S.view.component(ReadinessView).title('Readiness')]) : S.document()

const singleton = (S: StructureBuilder, type: string, title: string, icon: React.ComponentType) =>
  S.listItem().title(title).icon(icon).child(S.document().schemaType(type).documentId(type).title(title))

const submissions = (S: StructureBuilder, title: string, filter: string, icon: React.ComponentType, order = 'submittedAt') =>
  S.listItem()
    .title(title)
    .icon(icon)
    .child(S.documentList().title(title).filter(`_type == "talkSubmission"${filter}`).defaultOrdering([{field: order, direction: 'desc'}]))

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      // Event workspace
      S.listItem()
        .title('Events')
        .icon(CalendarIcon)
        .child(
          S.list()
            .title('Events')
            .items([
              S.listItem()
                .title('Upcoming')
                .icon(CalendarIcon)
                .child(S.documentList().title('Upcoming').filter(`_type == "events" && (datetime >= ${now} || !defined(datetime))`).defaultOrdering([{field: 'datetime', direction: 'asc'}])),
              S.listItem()
                .title('Needs attention')
                .icon(WarningOutlineIcon)
                .child(
                  S.documentList()
                    .title('Upcoming events missing a Meetup link, venue or talks')
                    .filter(
                      `_type == "events" && datetime >= ${now} && status in [null, "scheduled", "full"] && (!defined(meetupUrl) || !(defined(venue.name) || defined(location)) || count(coalesce(talks, [])) == 0)`,
                    ),
                ),
              S.listItem()
                .title('Past')
                .icon(ClockIcon)
                .child(S.documentList().title('Past').filter(`_type == "events" && datetime < ${now}`).defaultOrdering([{field: 'datetime', direction: 'desc'}])),
              S.divider(),
              S.documentTypeListItem('events').title('All events'),
            ]),
        ),

      // Talk proposals and their review stages
      S.listItem()
        .title('Talk proposals')
        .icon(DocumentIcon)
        .child(
          S.list()
            .title('Talk proposals')
            .items([
              submissions(S, 'All proposals', '', DocumentIcon),
              submissions(S, 'Received', ' && status == "pending"', ClockIcon),
              submissions(S, 'Under review', ' && status == "under_review"', ClockIcon),
              submissions(S, 'Accepted', ' && status == "approved"', CheckmarkCircleIcon, 'reviewedAt'),
              submissions(S, 'Scheduled', ' && status == "scheduled"', CalendarIcon, 'reviewedAt'),
              submissions(S, 'Given', ' && status == "completed"', StarIcon, 'reviewedAt'),
              submissions(S, 'Not this time', ' && status == "rejected"', BlockContentIcon, 'reviewedAt'),
            ]),
        ),

      S.listItem().title('Talks').icon(MasterDetailIcon).child(S.documentTypeList('talk').title('Talks')),
      S.listItem().title('Speakers').icon(UsersIcon).child(S.documentTypeList('speaker').title('Speakers')),
      S.documentTypeListItem('partner').title('Partners and hosts'),

      S.divider(),
      S.listItem()
        .title('Feedback')
        .icon(CommentIcon)
        .child(
          S.list()
            .title('Feedback')
            .items([S.documentTypeListItem('comprehensiveFeedback').title('Evening feedback'), S.documentTypeListItem('feedback').title('Talk ratings')]),
        ),

      S.divider(),
      singleton(S, 'meetupRating', 'Meetup rating', StarIcon),
      singleton(S, 'conference', 'Conference module', RocketIcon),
      singleton(S, 'siteSettings', 'Site settings', CogIcon),

      // Anything else (announcement, stats)
      ...S.documentTypeListItems().filter(
        (item) =>
          !['events', 'talkSubmission', 'talk', 'speaker', 'partner', 'feedback', 'comprehensiveFeedback', 'meetupRating', 'conference', 'siteSettings'].includes(item.getId() ?? ''),
      ),
    ])
