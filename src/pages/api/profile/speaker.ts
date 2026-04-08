import { getAuth, clerkClient } from '@clerk/nextjs/server';
import formidable from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';

import { resolveSpeakerProfile, upsertSpeakerProfile } from '@/lib/cfp/speakerProfile';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);

  if (req.method === 'GET') {
    try {
      const profile = await resolveSpeakerProfile(user);
      return res.status(200).json(profile);
    } catch (error: unknown) {
      console.error('Error fetching speaker profile:', error);
      return res.status(500).json({
        error: 'Failed to fetch speaker profile',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (req.method === 'POST') {
    const form = formidable({
      keepExtensions: true,
      multiples: false,
    });

    try {
      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
        form.parse(req, (err: unknown, parsedFields: formidable.Fields, parsedFiles: formidable.Files) => {
          if (err) reject(err);
          resolve([parsedFields, parsedFiles]);
        });
      });

      const firstName = Array.isArray(fields.firstName) ? fields.firstName[0] : fields.firstName || '';
      const lastName = Array.isArray(fields.lastName) ? fields.lastName[0] : fields.lastName || '';
      const jobTitle = Array.isArray(fields.jobTitle) ? fields.jobTitle[0] : fields.jobTitle || '';
      const biography = Array.isArray(fields.biography) ? fields.biography[0] : fields.biography || '';
      const linkedinProfile = Array.isArray(fields.linkedinProfile)
        ? fields.linkedinProfile[0]
        : fields.linkedinProfile || '';
      const githubProfile = Array.isArray(fields.githubProfile) ? fields.githubProfile[0] : fields.githubProfile || '';
      const twitterHandle = Array.isArray(fields.twitterHandle) ? fields.twitterHandle[0] : fields.twitterHandle || '';
      const imageFile = Array.isArray(files.speakerImage) ? files.speakerImage[0] : files.speakerImage;
      await clerk.users.updateUser(userId, {
        firstName,
        lastName,
      });
      const refreshedUser = await clerk.users.getUser(userId);

      const profile = await upsertSpeakerProfile(
        refreshedUser,
        {
          firstName,
          lastName,
          jobTitle,
          biography,
          linkedinProfile,
          githubProfile,
          twitterHandle,
        },
        imageFile && imageFile.filepath ? imageFile : null
      );

      return res.status(200).json(profile);
    } catch (error: unknown) {
      console.error('Error updating speaker profile:', error);
      const statusCode =
        error instanceof Error && error.message === 'Missing required speaker profile fields' ? 400 : 500;

      return res.status(statusCode).json({
        error: 'Failed to update speaker profile',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default handler;
