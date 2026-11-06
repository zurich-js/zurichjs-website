// schemas/talkSubmission.ts
import { defineType } from 'sanity';

export default defineType({
  name: 'talkSubmission',
  title: 'Talk Submission',
  type: 'document',
  fields: [
    { 
      name: 'id', 
      title: 'ID', 
      type: 'slug' 
    },
    { 
      name: 'title', 
      title: 'Title', 
      type: 'string',
      validation: Rule => Rule.required()
    },
    { 
      name: 'description', 
      title: 'Description', 
      type: 'text',
      validation: Rule => Rule.required()
    },
    { 
      name: 'durationMinutes', 
      title: 'Duration (minutes)', 
      type: 'number',
      validation: Rule => Rule.required(),
      options: {
        list: [
          // Lightning 10 and full talks 20 minutes (owner, 4th November 2026). Older submissions keep 5, 25 or 35.
          {title: 'Lightning (10 min)', value: 10},
          {title: 'Full talk (20 min)', value: 20},
        ]
      }
    },
    {
      name: 'level',
      title: 'Experience Level',
      type: 'string',
      options: {
        list: [
          {title: 'Beginner', value: 'beginner'},
          {title: 'Intermediate', value: 'intermediate'},
          {title: 'Advanced', value: 'advanced'}
        ]
      }
    },
    {
      name: 'tags',
      title: 'Topics/Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags'
      },
      validation: Rule => Rule.required().min(1)
    },
    {
      name: 'speakers',
      title: 'Speakers',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'speaker' }] }],
      validation: Rule => Rule.required()
    },
    {
      name: 'firstTalk',
      title: 'First talk',
      type: 'boolean',
      description: 'The speaker has not given a talk before. Offer help preparing.',
      readOnly: true,
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          // Stored values are unchanged so existing documents and the current site keep working;
          // the titles follow the V2 review stages (received, accepted, scheduled, given).
          {title: 'Received', value: 'pending'},
          {title: 'Under review', value: 'under_review'},
          {title: 'Accepted', value: 'approved'},
          {title: 'Scheduled', value: 'scheduled'},
          {title: 'Given', value: 'completed'},
          {title: 'Not this time', value: 'rejected'}
        ],
        layout: 'radio'
      },
      initialValue: 'pending'
    },
    {
      name: 'reviewNotes',
      title: 'Review Notes',
      type: 'text',
      description: 'Internal notes about this submission (not visible to submitter)'
    },
    {
      name: 'submittedAt',
      title: 'Submitted At',
      type: 'datetime'
    },
    {
      name: 'reviewedAt',
      title: 'Reviewed At',
      type: 'datetime'
    },
    {
      name: 'convertedToTalk',
      title: 'Converted to Talk',
      type: 'boolean',
      description: 'Whether this submission has been converted to a talk document',
      initialValue: false
    },
    {
      name: 'talkReference',
      title: 'Talk Reference',
      type: 'reference',
      to: [{type: 'talk'}],
      description: 'Reference to the talk document if this submission was approved and scheduled'
    }
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'status',
      speaker: 'speakers.0.name',
      duration: 'durationMinutes',
    },
    prepare(selection) {
      const {title, subtitle, speaker, duration} = selection;
      return {
        title: title,
        subtitle: `${subtitle} - ${duration} min - ${speaker || 'Unknown speaker'}`
      };
    }
  }
});