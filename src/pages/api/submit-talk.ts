// pages/api/submit-talk.ts
import { createReadStream } from 'fs';
import path from 'path';

import { createClient } from '@sanity/client';
import formidable from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

import { sendPushoverNotification } from '@/lib/pushover';


// Initialize Sanity client
const sanityClient = createClient({
  projectId: "viqjrovw",
  dataset: "production",
  apiVersion: '2024-01-01', // Use the latest API version
  token: process.env.SANITY_TOKEN,
  useCdn: false, // We need fresh data and ability to write
});


// Disable the default body parser to handle form-data
export const config = {
  api: {
    bodyParser: false,
  },
};



export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse the multipart form data
  const form = formidable({
    keepExtensions: true,
    multiples: false,
  });

  try {
    // Send notification that submission process has started
    await sendPushoverNotification({
      title: 'CFP Submission Started',
      message: 'A new CFP submission process has started.',
      priority: 0,
    });

    // Parse the form
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err: unknown, fields: formidable.Fields, files: formidable.Files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Extract values from form fields
    const firstName = Array.isArray(fields.firstName) ? fields.firstName[0] : fields.firstName || '';
    const lastName = Array.isArray(fields.lastName) ? fields.lastName[0] : fields.lastName || '';
    const name = `${firstName} ${lastName}`;
    const jobTitle = Array.isArray(fields.jobTitle) ? fields.jobTitle[0] : fields.jobTitle || '';
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email || '';
    const linkedinProfile = Array.isArray(fields.linkedinProfile) ? fields.linkedinProfile[0] : fields.linkedinProfile || '';
    const githubProfile = Array.isArray(fields.githubProfile) ? fields.githubProfile[0] : fields.githubProfile || '';
    const twitterHandle = Array.isArray(fields.twitterHandle) ? fields.twitterHandle[0] : fields.twitterHandle || '';
    const title = Array.isArray(fields.title) ? fields.title[0] : fields.title || '';
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description || '';
    const talkLength = Array.isArray(fields.talkLength) ? fields.talkLength[0] : fields.talkLength || '';
    const talkLevel = Array.isArray(fields.talkLevel) ? fields.talkLevel[0] : fields.talkLevel || '';
    const topics = fields.topics ? JSON.parse((Array.isArray(fields.topics) ? fields.topics[0] : fields.topics).toString()) : [];

    // Send notification with submission details
    await sendPushoverNotification({
      title: 'CFP Submission Processing',
      message: `Processing submission from ${name} (${email}):\n"${title}" - ${talkLength} minutes, ${talkLevel} level`,
      priority: 0,
    });

    // Validate required fields
    if (!firstName || !lastName || !email || !linkedinProfile || !jobTitle || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!topics || topics.length === 0) {
      return res.status(400).json({ error: 'Please select at least one topic' });
    }
    
    // Convert talk length to integer
    const durationMinutes = parseInt(talkLength || '0', 10);

    // Generate unique IDs
    const speakerId = `speaker-${uuidv4()}`;
    const talkId = `talk-${uuidv4()}`;

    // Check if speaker already exists by email
    const existingSpeakers = await sanityClient.fetch(
      `*[_type == "speaker" && email == $email][0]`,
      { email }
    );

    let speakerRef;
    let speakerDoc;

    // Handle image upload to Sanity if present
    const speakerImage = Array.isArray(files.speakerImage) 
      ? files.speakerImage[0] 
      : files.speakerImage;
    let imageAsset = null;

    if (speakerImage && speakerImage.filepath) {
      // Upload the image to Sanity
      imageAsset = await sanityClient.assets.upload('image', createReadStream(speakerImage.filepath), {
        filename: path.basename(speakerImage.originalFilename || 'speaker-image.jpg'),
      });
    }

    if (!existingSpeakers) {
      // Create new speaker document
      speakerDoc = {
        _type: 'speaker',
        id: {
          _type: 'slug',
          current: speakerId
        },
        name,
        title: jobTitle,
        email,
        bio: '',
        linkedin: linkedinProfile,
        talks: 0,
        image: null as null | { _type: string; asset: { _type: string; _ref: string } },
        github: '',
        twitter: '',
      };

      // Add image if uploaded
      if (imageAsset) {
        speakerDoc.image = {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: imageAsset._id
          }
        };
      }
      
      // Add social links if provided
      if (githubProfile) {
        speakerDoc.github = `https://github.com/${githubProfile}`;
      }
      if (typeof twitterHandle === 'string') {
        speakerDoc.twitter = `https://twitter.com/${(twitterHandle).replace('@', '')}`;
      }

      // Create the speaker in Sanity
      const createdSpeaker = await sanityClient.create(speakerDoc);
      speakerRef = {
        _type: 'reference',
        _ref: createdSpeaker._id
      };
    } else {
      // Use existing speaker reference
      speakerRef = {
        _type: 'reference',
        _ref: existingSpeakers._id
      };
      
      // Update the existing speaker with new information if provided
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateFields = {} as any;
      
      if (jobTitle) updateFields.title = jobTitle;
      if (linkedinProfile) updateFields.linkedin = linkedinProfile;
      
      if (githubProfile) {
        updateFields.github = `https://github.com/${githubProfile}`;
      }
      
      if (typeof twitterHandle === 'string') {
        updateFields.twitter = `https://twitter.com/${(twitterHandle).replace('@', '')}`;
      }
      
      // Update image if a new one was uploaded
      if (imageAsset) {
        updateFields.image = {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: imageAsset._id
          }
        };
      }
      
      // Only update if there are fields to update
      if (Object.keys(updateFields).length > 0) {
        await sanityClient.patch(existingSpeakers._id)
          .set(updateFields)
          .commit();
      }
    }

    // Create the talk submission document
    const talkDoc = {
      _type: 'talkSubmission',
      id: {
        _type: 'slug',
        current: talkId
      },
      title,
      description,
      durationMinutes,
      level: talkLevel,
      tags: topics,
      speakers: [speakerRef],
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    const { _id } =await sanityClient.create(talkDoc);

    // Send success notification
    await sendPushoverNotification({
      title: 'CFP Submission Successful',
      message: `Talk "${title}" by ${name} (${email}) was successfully submitted.\nTopics: ${topics.join(', ')}\nDuration: ${durationMinutes} minutes\nLevel: ${talkLevel}`,
      priority: 1,
      url: `https://zurichjs.sanity.studio/structure/talkSubmissions;allSubmissions;${_id}`,
      url_title: 'View Submission',
    });

    return res.status(200).json({ success: true, message: 'Talk submitted successfully' });
  } catch (error) {
    console.error('Error submitting talk:', error);
    
    // Get form data for error notification if possible
    let submitterInfo = 'Unknown user';
    try {
      const [errorFields] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
        form.parse(req, (err: unknown, fields: formidable.Fields, files: formidable.Files) => {
          if (err) reject(err);
          resolve([fields, files]);
        });
      });
      
      if (errorFields.firstName && errorFields.lastName && errorFields.email) {
        submitterInfo = `${errorFields.firstName} ${errorFields.lastName} (${errorFields.email})`;
      }
    } catch (formError) {
      console.error('Could not parse form data for error notification:', formError);
    }
    
    // Send failure notification with submitter info
    await sendPushoverNotification({
      title: 'CFP Submission Failed',
      message: `Error processing submission from ${submitterInfo}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      priority: 2,
    });
    
    return res.status(500).json({ error: 'Failed to submit talk' });
  }
}