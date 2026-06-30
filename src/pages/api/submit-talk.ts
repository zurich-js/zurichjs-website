import { createReadStream } from "fs";
import path from "path";

import { clerkClient, getAuth } from "@clerk/nextjs/server";
import formidable from "formidable";
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "next-sanity";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { TALK_TOPICS } from "@/components/cfp/constants";
import { rateLimitRequest } from "@/lib/api/rateLimit";
import { getSpeakerByEmail } from "@/lib/cfp/speakerProfile";
import { sendPlatformNotification } from "@/lib/notification";
import {
  emailSchema,
  formString,
  githubHandleSchema,
  linkedinSchema,
  parseJsonArrayField,
  requiredText,
  twitterHandleSchema,
} from "@/lib/validation/input";

// pages/api/submit-talk.ts

// Initialize Sanity client
const sanityClient = createClient({
  projectId: "viqjrovw",
  dataset: "production",
  apiVersion: "2024-01-01", // Use the latest API version
  token: process.env.SANITY_TOKEN,
  useCdn: false, // We need fresh data and ability to write
});

// Disable the default body parser to handle form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

const talkSubmissionSchema = z.object({
  submissionMode: z.enum(["guest", "authenticated"]).optional().default("guest"),
  firstName: requiredText(80),
  lastName: requiredText(80),
  jobTitle: requiredText(160),
  biography: requiredText(3000),
  email: emailSchema,
  linkedinProfile: linkedinSchema,
  githubProfile: githubHandleSchema,
  twitterHandle: twitterHandleSchema,
  title: requiredText(180),
  description: requiredText(5000),
  // Must stay in sync with the options rendered in
  // src/components/cfp/CFPForm/TalkSection.tsx
  talkLength: z.enum(["5", "25", "35"]),
  talkLevel: z.enum(["beginner", "intermediate", "advanced"]),
  topics: z.array(z.enum(TALK_TOPICS)).min(1).max(8),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Parse the multipart form data
  const form = formidable({
    keepExtensions: true,
    multiples: false,
    maxFields: 30,
    maxFieldsSize: 128 * 1024,
    maxFileSize: 5 * 1024 * 1024,
  });

  // Keep a reference to the parsed fields so the catch block can build a
  // helpful error notification without re-parsing the (already consumed) body.
  let parsedFields: formidable.Fields | null = null;

  try {
    if (!rateLimitRequest(req, res, { key: "submit-talk", limit: 3, windowMs: 10 * 60 * 1000 })) {
      return;
    }

    const { userId } = getAuth(req);

    // Parse the form
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
      (resolve, reject) => {
        form.parse(req, (err: unknown, fields: formidable.Fields, files: formidable.Files) => {
          if (err) reject(err);
          resolve([fields, files]);
        });
      },
    );

    parsedFields = fields;

    const parsed = talkSubmissionSchema.safeParse({
      submissionMode: formString(fields.submissionMode) || "guest",
      firstName: formString(fields.firstName),
      lastName: formString(fields.lastName),
      jobTitle: formString(fields.jobTitle),
      biography: formString(fields.biography),
      email: formString(fields.email),
      linkedinProfile: formString(fields.linkedinProfile),
      githubProfile: formString(fields.githubProfile),
      twitterHandle: formString(fields.twitterHandle),
      title: formString(fields.title),
      description: formString(fields.description),
      talkLength: formString(fields.talkLength),
      talkLevel: formString(fields.talkLevel),
      topics: parseJsonArrayField(fields.topics),
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const invalidFields = Object.keys(fieldErrors);

      // Surface which fields failed so this is debuggable from logs/notifications
      // instead of a generic "Invalid talk submission".
      console.warn("Talk submission validation failed:", invalidFields);

      await sendPlatformNotification({
        title: "CFP Submission Rejected (validation)",
        message: `A talk submission was rejected due to invalid fields: ${invalidFields.join(", ")}`,
        priority: 1,
      });

      return res.status(400).json({
        error: "Invalid talk submission",
        fields: fieldErrors,
        message: `Please double-check the following: ${invalidFields.join(", ")}.`,
      });
    }

    const {
      submissionMode,
      jobTitle,
      biography,
      linkedinProfile,
      githubProfile,
      twitterHandle,
      title,
      description,
      talkLength,
      talkLevel,
      topics,
    } = parsed.data;
    let { firstName, lastName, email } = parsed.data;
    let name = `${firstName} ${lastName}`;

    if (userId && submissionMode === "authenticated") {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);

      firstName = user.firstName || firstName;
      lastName = user.lastName || lastName;
      email = user.primaryEmailAddress?.emailAddress || email;
      name = `${firstName} ${lastName}`;
    }

    // Send notification with submission details
    await sendPlatformNotification({
      title: "CFP Submission Processing",
      message: `Processing submission from ${name} (${email}):\n"${title}" - ${talkLength} minutes, ${talkLevel} level`,
      priority: 0,
    });

    // Convert talk length to integer
    const durationMinutes = parseInt(talkLength || "0", 10);

    // Generate unique IDs
    const speakerId = `speaker-${uuidv4()}`;
    const talkId = `talk-${uuidv4()}`;

    // Check if speaker already exists by email
    const existingSpeakers = await getSpeakerByEmail(email);
    const shouldPatchExistingSpeaker = !(
      userId &&
      submissionMode === "authenticated" &&
      existingSpeakers
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
      imageAsset = await sanityClient.assets.upload(
        "image",
        createReadStream(speakerImage.filepath),
        {
          filename: path.basename(speakerImage.originalFilename || "speaker-image.jpg"),
        },
      );
    }

    if (!existingSpeakers) {
      // Create new speaker document
      speakerDoc = {
        _type: "speaker",
        id: {
          _type: "slug",
          current: speakerId,
        },
        name,
        title: jobTitle,
        email,
        bio: biography,
        linkedin: linkedinProfile,
        talks: 0,
        image: null as null | { _type: string; asset: { _type: string; _ref: string } },
        github: "",
        twitter: "",
      };

      // Add image if uploaded
      if (imageAsset) {
        speakerDoc.image = {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: imageAsset._id,
          },
        };
      }

      // Add social links if provided
      if (githubProfile) {
        speakerDoc.github = `https://github.com/${githubProfile}`;
      }
      if (typeof twitterHandle === "string") {
        speakerDoc.twitter = `https://twitter.com/${twitterHandle.replace("@", "")}`;
      }

      // Create the speaker in Sanity
      const createdSpeaker = await sanityClient.create(speakerDoc);
      speakerRef = {
        _type: "reference",
        _ref: createdSpeaker._id,
      };
    } else {
      // Use existing speaker reference
      speakerRef = {
        _type: "reference",
        _ref: existingSpeakers._id,
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

      if (typeof twitterHandle === "string") {
        updateFields.twitter = `https://twitter.com/${twitterHandle.replace("@", "")}`;
      }

      // Update image if a new one was uploaded
      if (imageAsset) {
        updateFields.image = {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: imageAsset._id,
          },
        };
      }

      // Only update if there are fields to update
      if (shouldPatchExistingSpeaker && Object.keys(updateFields).length > 0) {
        await sanityClient.patch(existingSpeakers._id).set(updateFields).commit();
      }
    }

    // Create the talk submission document
    const talkDoc = {
      _type: "talkSubmission",
      id: {
        _type: "slug",
        current: talkId,
      },
      title,
      bio: biography,
      description,
      durationMinutes,
      level: talkLevel,
      tags: topics,
      speakers: [speakerRef],
      status: "pending",
      submittedAt: new Date().toISOString(),
    };

    const { _id } = await sanityClient.create(talkDoc);

    // Send success notification
    await sendPlatformNotification({
      title: "CFP Submission Successful",
      message: `Talk "${title}" by ${name} (${email}) was successfully submitted.\nTopics: ${topics.join(", ")}\nDuration: ${durationMinutes} minutes\nLevel: ${talkLevel}`,
      priority: 1,
      url: `https://zurichjs.sanity.studio/structure/talkSubmissions;allSubmissions;${_id}`,
      url_title: "View Submission",
    });

    return res.status(200).json({ success: true, message: "Talk submitted successfully" });
  } catch (error) {
    console.error("Error submitting talk:", error);

    // Build submitter info from the already-parsed fields. The request body is a
    // stream that has already been consumed, so we cannot re-parse it here.
    let submitterInfo = "Unknown user";
    if (parsedFields) {
      const firstName = formString(parsedFields.firstName);
      const lastName = formString(parsedFields.lastName);
      const submitterEmail = formString(parsedFields.email);

      if (firstName && lastName && submitterEmail) {
        submitterInfo = `${firstName} ${lastName} (${submitterEmail})`;
      }
    }

    // Send failure notification with submitter info
    await sendPlatformNotification({
      title: "CFP Submission Failed",
      message: `Error processing submission from ${submitterInfo}: ${error instanceof Error ? error.message : "Unknown error"}`,
      priority: 2,
    });

    return res.status(500).json({ error: "Failed to submit talk" });
  }
}

export default handler;
