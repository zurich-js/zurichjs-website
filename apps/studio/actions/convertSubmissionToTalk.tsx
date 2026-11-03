// actions/convertSubmissionToTalk.tsx
import { useState, useEffect } from 'react';
import type { DocumentActionProps } from 'sanity';
import { useDocumentOperation, useClient } from 'sanity';

export default function ConvertSubmissionToTalkAction(props: DocumentActionProps) {
  const { id, type, draft, published, onComplete } = props;
  const doc = draft || published;
  const [isConverting, setIsConverting] = useState(false);
  const { patch, commit } = useDocumentOperation(id, type);
  const client = useClient();

  // Reset converting state when the document changes
  useEffect(() => {
    if (isConverting && doc?.convertedToTalk) {
      setIsConverting(false);
    }
  }, [doc]);

  // Only show for approved talk submissions that haven't been converted yet
  if (type !== 'talkSubmission' || !doc || doc.status !== 'approved' || doc.convertedToTalk) {
    return null;
  }

  return {
    label: isConverting ? 'Converting...' : 'Convert to Talk',
    icon: () => <span>🔄</span>,
    onHandle: async () => {
      setIsConverting(true);
      
      try {
        // Create a new talk document
        const talkDoc = {
          _type: 'talk',
          id: doc.id,
          title: doc.title,
          description: doc.description,
          durationMinutes: doc.durationMinutes,
          speakers: doc.speakers,
          tags: doc.tags,
          type: doc.level === 'beginner' ? 'Lightning Talk' :
                doc.level === 'advanced' ? 'Deep Dive' : 'Standard Talk',
        };

        // Create the talk document using the Sanity client
        const createdTalk = await client.create(talkDoc);

        // Update the submission document to mark it as converted
        patch.execute([{
          set: {
            convertedToTalk: true,
            talkReference: {
              _type: 'reference',
              _ref: createdTalk._id,
            },
            status: 'scheduled',
          }
        }]);
        
        // Commit the changes
        commit.execute();

        // Signal that the action is completed
        if (onComplete) {
          onComplete();
        }

        return {
          type: 'success',
          title: 'Success!',
          message: 'The submission has been converted to a talk.'
        };
      } catch (err: any) {
        console.error('Error converting submission to talk:', err);
        
        setIsConverting(false);
        
        // Signal that the action is completed
        if (onComplete) {
          onComplete();
        }
        
        return {
          type: 'error',
          title: 'Conversion failed',
          message: err?.message || 'Failed to convert submission'
        };
      }
    },
  };
}