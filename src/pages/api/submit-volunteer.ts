import formidable from "formidable";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { sendPlatformNotification } from "@/lib/notification";
import {
  emailSchema,
  formString,
  githubHandleSchema,
  linkedinSchema,
  parseJsonArrayField,
  requiredText,
  safeTextArraySchema,
} from "@/lib/validation/input";

// Disable the default body parser to handle form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

const volunteerApplicationSchema = z.object({
  firstName: requiredText(80),
  lastName: requiredText(80),
  email: emailSchema,
  linkedinProfile: linkedinSchema,
  githubProfile: githubHandleSchema,
  message: requiredText(3000),
  availability: z.enum(["weekly", "monthly", "events", "other"]),
  interests: safeTextArraySchema(80, 12),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Parse the multipart form data
  const form = formidable({
    keepExtensions: true,
    multiples: false,
    maxFields: 20,
    maxFieldsSize: 64 * 1024,
    maxFileSize: 2 * 1024 * 1024,
  });

  try {
    if (
      !rateLimitRequest(req, res, { key: "submit-volunteer", limit: 3, windowMs: 10 * 60 * 1000 })
    ) {
      return;
    }

    // Parse the form
    const [fields] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err: unknown, fields: formidable.Fields, files: formidable.Files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const parsed = volunteerApplicationSchema.safeParse({
      firstName: formString(fields.firstName),
      lastName: formString(fields.lastName),
      email: formString(fields.email),
      linkedinProfile: formString(fields.linkedinProfile),
      githubProfile: formString(fields.githubProfile),
      message: formString(fields.message),
      availability: formString(fields.availability),
      interests: parseJsonArrayField(fields.interests),
    });

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid volunteer application" });
    }

    const {
      firstName,
      lastName,
      email,
      linkedinProfile,
      githubProfile,
      message,
      availability,
      interests,
    } = parsed.data;
    const name = `${firstName} ${lastName}`;

    // Format the availability text for better readability
    let availabilityText = "Unknown";
    switch (availability) {
      case "weekly":
        availabilityText = "A few hours weekly";
        break;
      case "monthly":
        availabilityText = "A few hours monthly";
        break;
      case "events":
        availabilityText = "Only during events";
        break;
      case "other":
        availabilityText = "Other (see message)";
        break;
    }

    // Prepare detailed message for notification
    const detailedMessage = `
Volunteer Application from: ${name}
Email: ${email}
LinkedIn: ${linkedinProfile}
${githubProfile ? `GitHub: ${githubProfile}` : ""}
Availability: ${availabilityText}
Interests: ${interests.join(", ")}

Message:
${message}
`;

    // Send notification with submission details
    await sendPlatformNotification({
      title: "New Volunteer Application",
      message: detailedMessage,
      priority: 1,
      url: `mailto:${email}?subject=ZurichJS%20Volunteer%20Application`,
      url_title: "Reply via Email",
    });

    // Here you would typically store the volunteer in your database
    // For now, we're just sending the notification

    return res.status(200).json({ success: true, message: "Application submitted successfully" });
  } catch (error) {
    console.error("Error submitting volunteer application:", error);

    // Send failure notification
    await sendPlatformNotification({
      title: "Volunteer Application Failed",
      message: `Error processing volunteer application: ${error instanceof Error ? error.message : "Unknown error"}`,
      priority: 2,
    });

    return res.status(500).json({ error: "Failed to submit application" });
  }
}

export default handler;
