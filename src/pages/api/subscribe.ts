import type { APIContext } from 'astro';

export const prerender = false;

// EmailOctopus API details
const API_KEY = process.env.EMAIL_OCTOPUS_API_KEY;
const LIST_ID = process.env.EMAIL_OCTOPUS_LIST_ID;
const API_URL = 'https://emailoctopus.com/api/1.6';

export async function POST({ request }: APIContext) {
  const { email } = await request.json();

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Make request to EmailOctopus API
    const response = await fetch(`${API_URL}/lists/${LIST_ID}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: API_KEY,
        email_address: email,
        status: 'SUBSCRIBED',
        // You can add more fields if needed
        // fields: {
        //   FirstName: firstName,
        //   LastName: lastName,
        // },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle EmailOctopus specific errors
      if (data.error?.code === 'MEMBER_EXISTS_WITH_EMAIL_ADDRESS') {
        return new Response(JSON.stringify({ error: 'You are already subscribed!' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(data.error?.message || 'Failed to subscribe');
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to subscribe. Please try again later.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
