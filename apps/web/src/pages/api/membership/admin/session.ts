/** Whether this browser is signed in to the admin area. GET → 200 { ok: true, signedIn, configured }. */
import type { APIRoute } from 'astro';
import { adminPassword, isAdmin } from '../../../../server/admin-auth.ts';
import { json, methodNotAllowed, type Env } from '../../../../server/http.ts';

export const prerender = false;

export const handleAdminSession = (request: Request, env: Env = process.env) => json(200, { ok: true, configured: !!adminPassword(env), signedIn: isAdmin(request, env) });

export const GET: APIRoute = ({ request }) => handleAdminSession(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
