/**
 * Fetch helper for the admin area's islands (MembershipAdmin, SponsorsAdmin): same-origin
 * JSON calls to /api/membership/admin/*, answering the status and the parsed body. A
 * FormData body (a file upload) is sent as multipart, without the JSON content type.
 */
export type ApiBody<T> = T & { ok?: boolean; error?: string; field?: string };

export async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; body: ApiBody<T> }> {
  const json = !(init?.body instanceof FormData);
  const res = await fetch(path, { credentials: 'same-origin', ...init, headers: { ...(json ? { 'content-type': 'application/json' } : {}), ...init?.headers } });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as ApiBody<T> };
}

export const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
