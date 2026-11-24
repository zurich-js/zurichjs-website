/**
 * Fetch helper for the admin area's islands (MembershipAdmin, SponsorsAdmin): same-origin
 * JSON calls to /api/membership/admin/*, answering the status and the parsed body. A
 * FormData body (a file upload) is sent as multipart, without the JSON content type.
 *
 * Every call settles. Reads give up after READ_DEADLINE_MS and writes after WRITE_DEADLINE_MS,
 * which is past Netlify's 60 s: by then the server has answered or been stopped. No answer is
 * status 0 with a sentence in `error`. A body that is not JSON (a platform error page) is `{}`
 * for a read, so callers fall back to their own message. A write that got no JSON answer from a
 * 5xx page gets UNKNOWN_WRITE instead, since the server may have saved before the page was sent.
 */
export type ApiBody<T> = T & { ok?: boolean; error?: string; field?: string };

export const READ_DEADLINE_MS = 20_000;
export const WRITE_DEADLINE_MS = 65_000;

export const UNREACHABLE = 'We couldn’t reach the site. Check your connection and try again.';
const UNREACHABLE_WRITE = 'We couldn’t reach the site, so we don’t know whether this was saved. Reload the page to check before you try again.';
export const UNKNOWN_WRITE = 'The site did not confirm this, so we don’t know whether it was saved. Reload the page to check before you try again.';

/**
 * Aborts after `ms`, or when `own` aborts. Built on AbortController and a timer, so it works in
 * browsers without AbortSignal.timeout or AbortSignal.any.
 */
export function timeoutSignal(ms: number, own?: AbortSignal | null): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  if (own?.aborted) controller.abort();
  else own?.addEventListener('abort', () => controller.abort(), { once: true });
  return controller.signal;
}

export async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; body: ApiBody<T> }> {
  const json = !(init?.body instanceof FormData);
  const read = !init?.method || init.method === 'GET';
  try {
    const res = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      signal: timeoutSignal(read ? READ_DEADLINE_MS : WRITE_DEADLINE_MS, init?.signal),
      headers: { ...(json ? { 'content-type': 'application/json' } : {}), ...init?.headers },
    });
    const body = parse<ApiBody<T>>(await res.text());
    if (!read && res.status >= 500 && !body) return { status: res.status, body: { error: UNKNOWN_WRITE } as ApiBody<T> };
    return { status: res.status, body: body ?? ({} as ApiBody<T>) };
  } catch {
    return { status: 0, body: { error: read ? UNREACHABLE : UNREACHABLE_WRITE } as ApiBody<T> };
  }
}

/** The JSON object in `text`, or null when it is not one. */
const parse = <B>(text: string): B | null => {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' ? (value as B) : null;
  } catch {
    return null;
  }
};

export const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
