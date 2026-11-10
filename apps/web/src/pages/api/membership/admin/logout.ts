/** Admin sign-out: clears the admin session cookie. POST → 200 { ok: true }. */
import type { APIRoute } from 'astro';
import { clearedCookie } from '../../../../server/admin-auth.ts';
import { json, methodNotAllowed } from '../../../../server/http.ts';

export const prerender = false;

export const handleAdminLogout = (request: Request) => json(200, { ok: true }, { 'set-cookie': clearedCookie(request) });

export const POST: APIRoute = ({ request }) => handleAdminLogout(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
