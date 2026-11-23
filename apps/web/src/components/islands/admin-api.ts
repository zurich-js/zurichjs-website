/**
 * Fetch helper for the admin area's islands (MembershipAdmin, SponsorsAdmin): same-origin
 * JSON calls to /api/membership/admin/*, answering the status and the parsed body. A
 * FormData body (a file upload) is sent as multipart, without the JSON content type.
 *
 * It always settles. When the site cannot be reached it answers status 0 with a sentence in
 * `error`; a body that is not JSON (a platform error page) is `{}`, so callers fall back to
 * their own message. Reads give up after READ_DEADLINE_MS. Writes have no deadline here: the
 * server may still be saving (its outbound calls have up to 50 s), and Netlify answers by 60 s.
 */
export type ApiBody<T> = T & { ok?: boolean; error?: string; field?: string };

export const READ_DEADLINE_MS = 20_000;

export const UNREACHABLE = 'We couldn’t reach the site. Check your connection and try again.';
const UNREACHABLE_WRITE = 'We couldn’t reach the site, so we don’t know whether this was saved. Reload the page to check before you try again.';

export async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; body: ApiBody<T> }> {
  const json = !(init?.body instanceof FormData);
  const read = !init?.method || init.method === 'GET';
  const signals = [init?.signal, read ? AbortSignal.timeout(READ_DEADLINE_MS) : null].filter((s): s is AbortSignal => !!s);
  try {
    const res = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      signal: signals.length ? AbortSignal.any(signals) : undefined,
      headers: { ...(json ? { 'content-type': 'application/json' } : {}), ...init?.headers },
    });
    const text = await res.text();
    return { status: res.status, body: parse<ApiBody<T>>(text) };
  } catch {
    return { status: 0, body: { error: read ? UNREACHABLE : UNREACHABLE_WRITE } as ApiBody<T> };
  }
}

const parse = <B>(text: string): B => {
  try {
    const value: unknown = JSON.parse(text);
    return (value && typeof value === 'object' ? value : {}) as B;
  } catch {
    return {} as B;
  }
};

export const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
