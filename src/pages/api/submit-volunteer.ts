import formidable from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';


import { withTelemetry } from '@/lib/multiplayer';
import { sendPlatformNotification } from '@/lib/notification';


// Disable the default body parser to handle form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(
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
    await sendPlatformNotification({
      title: 'Volunteer Application Started',
      message: 'A new volunteer application process has started.',
      priority: 0,
    });

    // Parse the form
    const [fields] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err: unknown, fields: formidable.Fields, files: formidable.Files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Extract values from form fields
    const firstName = Array.isArray(fields.firstName) ? fields.firstName[0] : fields.firstName || '';
    const lastName = Array.isArray(fields.lastName) ? fields.lastName[0] : fields.lastName || '';
    const name = `${firstName} ${lastName}`;
    const email = Array.isArray(fields.email) ? fields.email[0] : fields.email || '';
    const linkedinProfile = Array.isArray(fields.linkedinProfile) ? fields.linkedinProfile[0] : fields.linkedinProfile || '';
    const githubProfile = Array.isArray(fields.githubProfile) ? fields.githubProfile[0] : fields.githubProfile || '';
    const message = Array.isArray(fields.message) ? fields.message[0] : fields.message || '';
    const availability = Array.isArray(fields.availability) ? fields.availability[0] : fields.availability || '';
    const interests = fields.interests ? JSON.parse((Array.isArray(fields.interests) ? fields.interests[0] : fields.interests).toString()) : [];

    // Validate required fields
    if (!firstName || !lastName || !email || !linkedinProfile || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!interests || interests.length === 0) {
      return res.status(400).json({ error: 'Please select at least one area of interest' });
    }

    // Format the availability text for better readability
    let availabilityText = 'Unknown';
    switch (availability) {
      case 'weekly':
        availabilityText = 'A few hours weekly';
        break;
      case 'monthly':
        availabilityText = 'A few hours monthly';
        break;
      case 'events':
        availabilityText = 'Only during events';
        break;
      case 'other':
        availabilityText = 'Other (see message)';
        break;
    }

    // Prepare detailed message for notification
    const detailedMessage = `
Volunteer Application from: ${name}
Email: ${email}
LinkedIn: ${linkedinProfile}
${githubProfile ? `GitHub: ${githubProfile}` : ''}
Availability: ${availabilityText}
Interests: ${interests.join(', ')}

Message:
${message}
`;

    // Send notification with submission details
    await sendPlatformNotification({
      title: 'New Volunteer Application',
      message: detailedMessage,
      priority: 1,
      url: `mailto:${email}?subject=ZurichJS%20Volunteer%20Application`,
      url_title: 'Reply via Email',
    });

    // Here you would typically store the volunteer in your database
    // For now, we're just sending the notification

    return res.status(200).json({ success: true, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Error submitting volunteer application:', error);
    
    // Send failure notification
    await sendPlatformNotification({
      title: 'Volunteer Application Failed',
      message: `Error processing volunteer application: ${error instanceof Error ? error.message : 'Unknown error'}`,
      priority: 2,
    });
    
    return res.status(500).json({ error: 'Failed to submit application' });
  }
}

export default withTelemetry(handler, {
  spanName: 'submit-volunteer',
  attributes: {
    'api.category': 'general',
    'service': 'api',
  },
});
