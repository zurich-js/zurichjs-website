import type { APIContext } from 'astro';

export const prerender = false;

type Data = {
  name: string;
};

export async function GET(_context: APIContext) {
  return new Response(JSON.stringify({ name: "John Doe" } as Data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
