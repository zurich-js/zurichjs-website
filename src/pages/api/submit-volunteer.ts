import type { APIContext } from 'astro';

import { sendPlatformNotification } from '@/lib/notification';

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    // Send notification that submission process has started
    await sendPlatformNotification({
      title: 'Volunteer Application Started',
      message: 'A new volunteer application process has started.',
      priority: 0,
    });

    // Parse the multipart form data using native Web API
    const formData = await context.request.formData();

    // Extract values from form fields
    const firstName = formData.get('firstName')?.toString() || '';
    const lastName = formData.get('lastName')?.toString() || '';
    const name = `${firstName} ${lastName}`;
    const email = formData.get('email')?.toString() || '';
    const linkedinProfile = formData.get('linkedinProfile')?.toString() || '';
    const githubProfile = formData.get('githubProfile')?.toString() || '';
    const message = formData.get('message')?.toString() || '';
    const availability = formData.get('availability')?.toString() || '';
    const interestsRaw = formData.get('interests')?.toString() || '[]';
    const interests = JSON.parse(interestsRaw);

    // Validate required fields
    if (!firstName || !lastName || !email || !linkedinProfile || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!interests || interests.length === 0) {
      return new Response(JSON.stringify({ error: 'Please select at least one area of interest' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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

    return new Response(JSON.stringify({ success: true, message: 'Application submitted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error submitting volunteer application:', error);

    // Send failure notification
    await sendPlatformNotification({
      title: 'Volunteer Application Failed',
      message: `Error processing volunteer application: ${error instanceof Error ? error.message : 'Unknown error'}`,
      priority: 2,
    });

    return new Response(JSON.stringify({ error: 'Failed to submit application' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
