/**
 * Posts a form to the matching API route. Each route validates again on the
 * server and is the place to forward to email, Slack or Sanity.
 */
export type FormKind = 'cfp' | 'partners' | 'contact' | 'feedback' | 'rating' | 'waitlist' | 'checkout' | 'donate';

export async function submitForm<T extends object>(kind: FormKind, data: T): Promise<{ ok: true; id?: string; url?: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/forms/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    const json = (await res.json()) as { ok?: boolean; error?: string; id?: string; url?: string };
    if (!res.ok || !json.ok) return { ok: false, error: json.error ?? 'Something went wrong on our side. Please try again.' };
    return { ok: true, id: json.id, url: json.url };
  } catch {
    return { ok: false, error: 'We couldn’t reach the server. Check your connection and try again.' };
  }
}
