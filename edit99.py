def rep(p, old, new):
    s=open(p).read()
    assert s.count(old)==1, (p, old[:70])
    open(p,'w').write(s.replace(old,new))
p='src/components/islands/MemberAccount.tsx'
rep(p,"import { READ_DEADLINE_MS } from './read-deadline.ts';","import { READ_DEADLINE_MS, timeoutSignal } from './read-deadline.ts';")
rep(p,"""    const res = await fetch('/api/membership/me', { credentials: 'same-origin', signal: AbortSignal.timeout(READ_DEADLINE_MS) }).catch(() => null);""",
"""    const res = await fetch('/api/membership/me', { credentials: 'same-origin', signal: timeoutSignal(READ_DEADLINE_MS) }).catch(() => null);""")
rep(p,"""    if (res.status === 503) return setView({ kind: 'unavailable' });
    const body = (await res.json().catch(() => ({}))) as Partial<Me> & { ok?: boolean; error?: string };
    if (!res.ok""","""    const body = ((await res.json().catch(() => null)) ?? {}) as Partial<Me> & { ok?: boolean; error?: string };
    // "Not configured" is the route's own JSON 503; a platform error page is an outage, with Try again.
    if (res.status === 503 && body.ok === false) return setView({ kind: 'unavailable' });
    if (!res.ok""")
p='src/components/islands/SponsorAccount.tsx'
rep(p,"import { READ_DEADLINE_MS } from './read-deadline.ts';","import { READ_DEADLINE_MS, timeoutSignal } from './read-deadline.ts';")
rep(p,"""    const res = await fetch('/api/sponsorship/me', { credentials: 'same-origin', signal: AbortSignal.timeout(READ_DEADLINE_MS) }).catch(() => null);""",
"""    const res = await fetch('/api/sponsorship/me', { credentials: 'same-origin', signal: timeoutSignal(READ_DEADLINE_MS) }).catch(() => null);""")
rep(p,"""    if (res.status === 503) return setView({ kind: 'unavailable' });
    const data = (await res.json().catch(() => ({}))) as Partial<Me> & { ok?: boolean; error?: string };
    if (!res.ok""","""    const data = ((await res.json().catch(() => null)) ?? {}) as Partial<Me> & { ok?: boolean; error?: string };
    // "Not configured" is the route's own JSON 503; a platform error page is an outage, with Try again.
    if (res.status === 503 && data.ok === false) return setView({ kind: 'unavailable' });
    if (!res.ok""")
rep(p,"""  const scheduled = !!pending && pending.tier === tier && pending.cycle === cycle;
  const unchanged = timing === 'none' || scheduled;""","""  const scheduled = !!pending && pending.tier === tier && pending.cycle === cycle;
  // A change from the renewal replaces whatever is scheduled, so it waits until Stripe has said what that is.
  const unchecked = timing === 'renewal' && !!ctx.me.pendingChangeUnknown;
  const unchanged = timing === 'none' || scheduled || unchecked;""")
rep(p,"""  const effect =
    timing === 'none'
      ? 'This is your current plan.'
      : scheduled && pending""","""  const effect =
    timing === 'none'
      ? 'This is your current plan.'
      : unchecked
        ? `${plan} would apply from your next renewal, but we couldn’t check for a change already waiting for it. Check again before you confirm.`
        : scheduled && pending""")
rep(p,"""        {!unchanged && (
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Changing…' : signedLabel(sig, 'Sign and change', 'Confirm the change')}
          </Button>
        )}
        <Button variant="secondary" onClick={onCancel}>""","""        {!unchanged && (
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Changing…' : signedLabel(sig, 'Sign and change', 'Confirm the change')}
          </Button>
        )}
        {unchecked && (
          <Button variant="primary" onClick={() => void ctx.reload()}>
            Check again
          </Button>
        )}
        <Button variant="secondary" onClick={onCancel}>""")
print("ok")
