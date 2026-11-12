/**
 * GROQ over the Sanity HTTP query API for functions, like
 * @zurichjs/content's `groq()` but with an injectable fetch for tests and a
 * shorter timeout (a person is waiting on the response).
 */
import { sanityConfig } from '@zurichjs/content';
import type { Env } from './http.ts';

export function groqQuery(env: Env, fetchImpl: typeof fetch = fetch) {
  const { projectId, dataset, apiVersion, token } = sanityConfig(env);
  return async function query<T>(groq: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`);
    url.searchParams.set('query', groq);
    url.searchParams.set('perspective', 'published');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v));
    const res = await fetchImpl(url, { headers: token ? { authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Sanity query failed: HTTP ${res.status}`);
    return ((await res.json()) as { result: T }).result;
  };
}
