import type { APIContext } from 'astro';

export const prerender = false;

export async function GET({ url }: APIContext) {
  // Get the location from query parameters
  const location = url.searchParams.get('location');

  // Check if location is provided
  if (!location) {
    return new Response(JSON.stringify({ error: 'Single location parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Process the location (in a real app, you might call Google Maps API here)
  const encodedLocation = encodeURIComponent(location);
  const responseString = `https://maps.googleapis.com/maps/api/staticmap?center=${encodedLocation}&zoom=15&size=600x300&markers=color:yellow%7C${encodedLocation}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  // Return the response as a string
  return new Response(JSON.stringify({
    url: responseString
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
