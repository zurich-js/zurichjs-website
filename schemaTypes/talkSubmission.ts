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
          {title: 'Lightning (5 min)', value: 5},
          {title: 'Standard (25 min)', value: 25},
          {title: 'Deep Dive (35 min)', value: 35},
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
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: 'Pending Review', value: 'pending'},
          {title: 'Approved', value: 'approved'},
          {title: 'Rejected', value: 'rejected'},
          {title: 'Scheduled', value: 'scheduled'},
          {title: 'Completed', value: 'completed'}
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