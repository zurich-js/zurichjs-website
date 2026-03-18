import type { APIContext } from 'astro';
import { createClient } from '@sanity/client';
import { v4 as uuidv4 } from 'uuid';

import { sendPlatformNotification } from '@/lib/notification';

export const prerender = false;

// Initialize Sanity client
const sanityClient = createClient({
  projectId: "viqjrovw",
  dataset: "production",
  apiVersion: '2024-01-01',
  token: import.meta.env.SANITY_TOKEN,
  useCdn: false,
});

export async function POST(context: APIContext) {
  let submitterInfo = 'Unknown user';

  try {
    // Send notification that submission process has started
    await sendPlatformNotification({
      title: 'CFP Submission Started',
      message: 'A new CFP submission process has started.',
      priority: 0,
    });

    // Parse the multipart form data using native Web API
    const formData = await context.request.formData();

    // Extract values from form fields
    const firstName = formData.get('firstName')?.toString() || '';
    const lastName = formData.get('lastName')?.toString() || '';
    const name = `${firstName} ${lastName}`;
    const jobTitle = formData.get('jobTitle')?.toString() || '';
    const biography = formData.get('biography')?.toString() || '';
    const email = formData.get('email')?.toString() || '';
    const linkedinProfile = formData.get('linkedinProfile')?.toString() || '';
    const githubProfile = formData.get('githubProfile')?.toString() || '';
    const twitterHandle = formData.get('twitterHandle')?.toString() || '';
    const title = formData.get('title')?.toString() || '';
    const description = formData.get('description')?.toString() || '';
    const talkLength = formData.get('talkLength')?.toString() || '';
    const talkLevel = formData.get('talkLevel')?.toString() || '';
    const topicsRaw = formData.get('topics')?.toString() || '[]';
    const topics = JSON.parse(topicsRaw);

    submitterInfo = `${firstName} ${lastName} (${email})`;

    // Send notification with submission details
    await sendPlatformNotification({
      title: 'CFP Submission Processing',
      message: `Processing submission from ${name} (${email}):\n"${title}" - ${talkLength} minutes, ${talkLevel} level`,
      priority: 0,
    });

    // Validate required fields
    if (!firstName || !lastName || !email || !linkedinProfile || !jobTitle || !biography || !title || !description) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!topics || topics.length === 0) {
      return new Response(JSON.stringify({ error: 'Please select at least one topic' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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
    const speakerImage = formData.get('speakerImage') as File | null;
    let imageAsset = null;

    if (speakerImage && speakerImage.size > 0) {
      // Convert File to buffer for Sanity upload
      const buffer = Buffer.from(await speakerImage.arrayBuffer());
      imageAsset = await sanityClient.assets.upload('image', buffer, {
        filename: speakerImage.name || 'speaker-image.jpg',
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
        bio: biography,
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
      if (twitterHandle) {
        speakerDoc.twitter = `https://twitter.com/${twitterHandle.replace('@', '')}`;
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
      if (biography) updateFields.bio = biography;
      if (linkedinProfile) updateFields.linkedin = linkedinProfile;

      if (githubProfile) {
        updateFields.github = `https://github.com/${githubProfile}`;
      }

      if (twitterHandle) {
        updateFields.twitter = `https://twitter.com/${twitterHandle.replace('@', '')}`;
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
      bio: biography,
      description,
      durationMinutes,
      level: talkLevel,
      tags: topics,
      speakers: [speakerRef],
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    const { _id } = await sanityClient.create(talkDoc);

    // Send success notification
    await sendPlatformNotification({
      title: 'CFP Submission Successful',
      message: `Talk "${title}" by ${name} (${email}) was successfully submitted.\nTopics: ${topics.join(', ')}\nDuration: ${durationMinutes} minutes\nLevel: ${talkLevel}`,
      priority: 1,
      url: `https://zurichjs.sanity.studio/structure/talkSubmissions;allSubmissions;${_id}`,
      url_title: 'View Submission',
    });

    return new Response(JSON.stringify({ success: true, message: 'Talk submitted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error submitting talk:', error);

    // Send failure notification with submitter info
    await sendPlatformNotification({
      title: 'CFP Submission Failed',
      message: `Error processing submission from ${submitterInfo}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      priority: 2,
    });

    return new Response(JSON.stringify({ error: 'Failed to submit talk' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
