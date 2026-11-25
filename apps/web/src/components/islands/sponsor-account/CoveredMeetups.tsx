/**
 * "Meetups you sponsor" on /partners/account: the meetups the sponsorship covers, loaded on their
 * own from GET /api/sponsorship/coverage. The page shows this section even when the sponsorship
 * itself could not be loaded. Each meetup says its state in words and links to its page.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Heading } from '@zurichjs/design/islands/Heading';
import { Notice } from '@zurichjs/design/islands/Notice';
import { Tag } from '@zurichjs/design/islands/Tag';
import { cardClass } from '@zurichjs/design/recipes';
import type { TagTone } from '@zurichjs/design/recipes';
import { longDate } from '../../../server/dates.ts';
import type { CoveredMeetup, CoveredState } from '../../../server/sponsor-coverage.ts';

const STATE: Record<CoveredState, { label: string; tone: TagTone }> = {
  upcoming: { label: 'Upcoming', tone: 'black' },
  past: { label: 'Happened', tone: 'grey' },
  cancelled: { label: 'Cancelled', tone: 'grey' },
  moved: { label: 'Postponed', tone: 'grey' },
  unknown: { label: 'No longer listed', tone: 'grey' },
};

type MeetupWithRaffles = CoveredMeetup & { raffles?: { id: string; prize: string }[] };
type Load = { kind: 'loading' } | { kind: 'none' } | { kind: 'error'; message: string } | { kind: 'ready'; once: boolean; meetups: MeetupWithRaffles[]; checked: boolean };

type Answer = { ok?: boolean; error?: string; once?: boolean; meetups?: MeetupWithRaffles[]; checked?: boolean };

export function CoveredMeetups({ contactEmail, onSignedOut }: { contactEmail: string; onSignedOut: () => void }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const signedOut = useRef(onSignedOut);
  signedOut.current = onSignedOut;

  useEffect(() => {
    const request = new AbortController();
    setLoad({ kind: 'loading' });
    void (async () => {
      const res = await fetch('/api/sponsorship/coverage', { credentials: 'same-origin', signal: request.signal }).catch(() => null);
      const data = res ? ((await res.json().catch(() => ({}))) as Answer) : null;
      if (request.signal.aborted) return;
      if (res?.status === 401) return signedOut.current();
      if (res?.status === 404) return setLoad({ kind: 'none' });
      if (!res?.ok || !data?.ok) return setLoad({ kind: 'error', message: data?.error ?? 'We couldn’t load your meetups. Check your connection and try again.' });
      setLoad({ kind: 'ready', once: data.once === true, meetups: data.meetups ?? [], checked: data.checked !== false });
    })();
    return () => request.abort();
  }, [attempt]);

  if (load.kind === 'none') return null;
  return (
    <section aria-labelledby="h-covered" aria-busy={load.kind === 'loading'} class={cardClass('outline', 'lg')}>
      <Heading id="h-covered" size="subsection">
        Meetups you sponsor
      </Heading>
      <p role="status" class="m-0 text-body text-ink-2 text-pretty empty:hidden">
        {load.kind === 'loading' && 'Loading your meetups…'}
        {load.kind === 'ready' &&
          !load.meetups.length &&
          (load.once
            ? 'The meetups in your plan show here once you have chosen them.'
            : `No meetups are confirmed for your sponsorship yet. We agree each meetup with you, then it shows here. Questions: ${contactEmail}.`)}
      </p>
      {load.kind === 'error' && (
        <>
          <Notice tone="danger" live title={load.message} />
          <div>
            <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          </div>
        </>
      )}
      {load.kind === 'ready' && load.meetups.length > 0 && (
        <>
          {!load.checked && <p class="m-0 text-compact text-grey-text text-pretty">We couldn’t check the latest news for these meetups. Dates are as we last saved them.</p>}
          <ul class="m-0 flex list-none flex-col gap-3 p-0">
            {load.meetups.map((m) => (
              <li key={m.eventId} class="flex flex-col gap-1 md:flex-row md:items-center md:justify-between md:gap-4">
                <div class="flex min-w-0 flex-col">
                  {m.url ? (
                    <a href={m.url} class="text-lead font-bold break-words text-black">
                      {m.title}
                    </a>
                  ) : (
                    <span class="text-lead font-bold break-words">{m.title}</span>
                  )}
                  <span class="text-compact text-ink-2">{longDate(m.date)}</span>
                  {m.raffles?.map((r) => (
                    <a key={r.id} href={`/partners/account#raffle-${encodeURIComponent(r.id)}`}>
                      Raffle: {r.prize}
                    </a>
                  ))}
                </div>
                <Tag tone={STATE[m.state].tone}>{STATE[m.state].label}</Tag>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
