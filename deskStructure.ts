// deskStructure.js
import {
  MasterDetailIcon,
  DocumentIcon,
  CheckmarkCircleIcon,
  ClockIcon,
  BlockContentIcon,
  CalendarIcon,
  UsersIcon,
} from '@sanity/icons'
import { StructureBuilder } from 'sanity/structure'

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      // Talk Submissions menu with different views
      S.listItem()
        .title('Talk Submissions')
        .icon(DocumentIcon)
        .child(
          S.list()
            .title('Talk Submissions')
            .items([
              // All submissions
              S.listItem()
                .title('All Submissions')
                .icon(DocumentIcon)
                .child(
                  S.documentList()
                    .title('All Submissions')
                    .filter('_type == "talkSubmission"')
                    .defaultOrdering([{field: 'submittedAt', direction: 'desc'}])
                ),
              
              // Pending submissions
              S.listItem()
                .title('Pending Review')
                .icon(ClockIcon)
                .child(
                  S.documentList()
                    .title('Pending Review')
                    .filter('_type == "talkSubmission" && status == "pending"')
                    .defaultOrdering([{field: 'submittedAt', direction: 'desc'}])
                ),
              
              // Approved submissions
              S.listItem()
                .title('Approved')
                .icon(CheckmarkCircleIcon)
                .child(
                  S.documentList()
                    .title('Approved Submissions')
                    .filter('_type == "talkSubmission" && status == "approved"')
                    .defaultOrdering([{field: 'reviewedAt', direction: 'desc'}])
                ),
              
              // Rejected submissions
              S.listItem()
                .title('Rejected')
                .icon(BlockContentIcon)
                .child(
                  S.documentList()
                    .title('Rejected Submissions')
                    .filter('_type == "talkSubmission" && status == "rejected"')
                    .defaultOrdering([{field: 'reviewedAt', direction: 'desc'}])
                ),
              
              // Scheduled submissions
              S.listItem()
                .title('Scheduled')
                .icon(CalendarIcon)
                .child(
                  S.documentList()
                    .title('Scheduled Submissions')
                    .filter('_type == "talkSubmission" && status == "scheduled"')
                    .defaultOrdering([{field: 'reviewedAt', direction: 'desc'}])
                ),
            ])
        ),

      // Regular Talk documents list
      S.listItem()
        .title('Talks')
        .icon(MasterDetailIcon)
        .child(
          S.documentList()
            .title('Talks')
            .filter('_type == "talk"')
        ),

      // Speakers list
      S.listItem()
        .title('Speakers')
        .icon(UsersIcon)
        .child(
          S.documentList()
            .title('Speakers')
            .filter('_type == "speaker"')
        ),

      // Add other document types here
      ...S.documentTypeListItems().filter(
        (listItem) =>
          !['talkSubmission', 'talk', 'speaker'].includes(listItem.getId() || '')
      )
    ])

export default structure