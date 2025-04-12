import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import ConvertSubmissionToTalkAction from './actions/convertSubmissionToTalk'
import { schemaTypes } from './schemaTypes'
import { structure } from './deskStructure'

export default defineConfig({
  name: 'default',
  title: 'Zurich JS',

  projectId: 'viqjrovw',
  dataset: 'production',

  plugins: [
    structureTool({
      structure,
    }),
    visionTool()
  ],
  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'talkSubmission') {
        return [...prev, ConvertSubmissionToTalkAction];
      }
      return prev;
    },
  },
  schema: {
    types: schemaTypes,
  },
})
