import { createReadStream } from 'fs';
import path from 'path';

import { createClient } from 'next-sanity';
import { v4 as uuidv4 } from 'uuid';

const sanityReadClient = createClient({
  projectId: 'viqjrovw',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});

const sanityWriteClient = createClient({
  projectId: 'viqjrovw',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

interface ExistingSpeakerProfile {
  _id: string;
  title?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  imageUrl?: string;
}

export interface SpeakerProfileUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
}

export interface ResolvedSpeakerProfile {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  biography: string;
  linkedinProfile: string;
  githubProfile: string;
  twitterHandle: string;
  existingSpeakerImageUrl: string | null;
  isExistingSpeaker: boolean;
  missingSpeakerFields: string[];
}

export interface SpeakerProfileInput {
  firstName: string;
  lastName: string;
  jobTitle: string;
  biography: string;
  linkedinProfile: string;
  githubProfile: string;
  twitterHandle: string;
}

export function extractGithubUsername(value?: string): string {
  if (!value) return '';

  try {
    const url = new URL(value);
    return url.pathname.replace(/^\/+|\/+$/g, '');
  } catch {
    return value.replace(/^@/, '').trim();
  }
}

export function extractTwitterHandle(value?: string): string {
  if (!value) return '';

  try {
    const url = new URL(value);
    const handle = url.pathname.replace(/^\/+|\/+$/g, '');
    return handle ? `@${handle.replace(/^@/, '')}` : '';
  } catch {
    const handle = value.replace(/^@/, '').trim();
    return handle ? `@${handle}` : '';
  }
}

function formatGithubProfile(value?: string): string {
  const username = extractGithubUsername(value);
  return username ? `https://github.com/${username}` : '';
}

function formatTwitterProfile(value?: string): string {
  const handle = extractTwitterHandle(value);
  return handle ? `https://twitter.com/${handle.replace('@', '')}` : '';
}

function getMissingSpeakerFields(profile: ResolvedSpeakerProfile): string[] {
  const missingFields: string[] = [];

  if (!profile.firstName.trim()) missingFields.push('First name');
  if (!profile.lastName.trim()) missingFields.push('Last name');
  if (!profile.email.trim()) missingFields.push('Email');
  if (!profile.jobTitle.trim()) missingFields.push('Job title');
  if (!profile.biography.trim()) missingFields.push('Biography');
  if (!profile.linkedinProfile.trim()) missingFields.push('LinkedIn profile');
  if (!profile.existingSpeakerImageUrl) missingFields.push('Profile image');

  return missingFields;
}

export async function getSpeakerByEmail(email: string): Promise<ExistingSpeakerProfile | null> {
  if (!email) return null;

  return sanityReadClient.fetch<ExistingSpeakerProfile | null>(
    `*[_type == "speaker" && email == $email][0]{
      _id,
      title,
      bio,
      linkedin,
      github,
      twitter,
      "imageUrl": image.asset->url
    }`,
    { email }
  );
}

export async function resolveSpeakerProfile(user: SpeakerProfileUser): Promise<ResolvedSpeakerProfile> {
  const email = user.primaryEmailAddress?.emailAddress || '';
  const existingSpeaker = await getSpeakerByEmail(email);

  const profile: ResolvedSpeakerProfile = {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email,
    jobTitle: existingSpeaker?.title || '',
    biography: existingSpeaker?.bio || '',
    linkedinProfile: existingSpeaker?.linkedin || '',
    githubProfile: extractGithubUsername(existingSpeaker?.github),
    twitterHandle: extractTwitterHandle(existingSpeaker?.twitter),
    existingSpeakerImageUrl: existingSpeaker?.imageUrl || null,
    isExistingSpeaker: !!existingSpeaker,
    missingSpeakerFields: [],
  };

  profile.missingSpeakerFields = getMissingSpeakerFields(profile);

  return profile;
}

export async function upsertSpeakerProfile(
  user: SpeakerProfileUser,
  input: SpeakerProfileInput,
  imageFile?: { filepath: string; originalFilename?: string | null } | null
): Promise<ResolvedSpeakerProfile> {
  const email = user.primaryEmailAddress?.emailAddress || '';

  if (!email) {
    throw new Error('Your account does not have a primary email address');
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const name = `${firstName} ${lastName}`.trim();

  if (!firstName || !lastName || !input.jobTitle.trim() || !input.biography.trim() || !input.linkedinProfile.trim()) {
    throw new Error('Missing required speaker profile fields');
  }

  const existingSpeaker = await getSpeakerByEmail(email);
  let imagePatch = null as null | { _type: 'image'; asset: { _type: 'reference'; _ref: string } };

  if (imageFile?.filepath) {
    const imageAsset = await sanityWriteClient.assets.upload('image', createReadStream(imageFile.filepath), {
      filename: path.basename(imageFile.originalFilename || 'speaker-image.jpg'),
    });

    imagePatch = {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: imageAsset._id,
      },
    };
  }

  const github = formatGithubProfile(input.githubProfile);
  const twitter = formatTwitterProfile(input.twitterHandle);

  if (existingSpeaker) {
    const patch = sanityWriteClient.patch(existingSpeaker._id).set({
      name,
      title: input.jobTitle.trim(),
      bio: input.biography.trim(),
      linkedin: input.linkedinProfile.trim(),
      github,
      twitter,
    });

    if (imagePatch) {
      patch.set({ image: imagePatch });
    }

    await patch.commit();
  } else {
    await sanityWriteClient.create({
      _type: 'speaker',
      id: {
        _type: 'slug',
        current: `speaker-${uuidv4()}`,
      },
      name,
      title: input.jobTitle.trim(),
      email,
      bio: input.biography.trim(),
      linkedin: input.linkedinProfile.trim(),
      talks: 0,
      image: imagePatch,
      github,
      twitter,
    });
  }

  const refreshedUser = {
    ...user,
    firstName,
    lastName,
  } as SpeakerProfileUser;

  return resolveSpeakerProfile(refreshedUser);
}
