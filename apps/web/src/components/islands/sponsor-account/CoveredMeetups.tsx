/**
 * "Meetups you sponsor" on /partners/account: the meetups the sponsorship covers, loaded on their
 * own from GET /api/sponsorship/coverage, so a billing problem never hides them. Each meetup says
 * its state in words (upcoming, happened, cancelled, moved).
 */
import { useEffect, useState } from 'preact/hooks';
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

type Load = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; meetups: CoveredMeetup[]; checked: boolean };

export function CoveredMeetups({ once, contactEmail, onSignedOut }: { once: boolean; contactEmail: string; onSignedOut: () => void }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  const fetchCoverage = async () => {
    setLoad({ kind: 'loading' });
    const res = await fetch('/api/sponsorship/coverage', { credentials: 'same-origin' }).catch(() => null);
    if (res?.status === 401) return onSignedOut();
    const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; meetups?: CoveredMeetup[]; checked?: boolean }) : null;
    if (!res?.ok || !data?.ok) return setLoad({ kind: 'error', message: data?.error ?? 'We couldn’t load your meetups. Check your connection and try again.' });
    setLoad({ kind: 'ready', meetups: data.meetups ?? [], checked: data.checked !== false });
  };

  useEffect(() => {
    void fetchCoverage();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  return (
    <section aria-labelledby="h-covered" aria-busy={load.kind === 'loading'} class={cardClass('outline', 'lg')}>
      <Heading id="h-covered" size="subsection">
        Meetups you sponsor
      </Heading>
      {load.kind === 'loading' && (
        <p role="status" class="m-0 text-body text-ink-2">
          Loading your meetups…
        </p>
      )}
      {load.kind === 'error' && (
        <>
          <Notice tone="danger" live title={load.message} />
          <div>
            <Button variant="secondary" onClick={() => void fetchCoverage()}>
              Try again
            </Button>
          </div>
        </>
      )}
      {load.kind === 'ready' && !load.meetups.length && (
        <p class="m-0 text-body text-ink-2 text-pretty">
          {once
            ? 'The meetups in your plan show here once you have chosen them.'
            : `No meetups are confirmed for your sponsorship yet. We agree each meetup with you, then it shows here. Questions: ${contactEmail}.`}
        </p>
      )}
      {load.kind === 'ready' && load.meetups.length > 0 && (
        <>
          {!load.checked && <p class="m-0 text-compact text-grey-text text-pretty">We couldn’t check the latest news for these meetups. Dates are as we last saved them.</p>}
          <ul class="m-0 flex list-none flex-col gap-3 p-0">
            {load.meetups.map((m) => (
              <li key={m.eventId} class="flex flex-col gap-1 md:flex-row md:items-center md:justify-between md:gap-4">
                <div class="flex min-w-0 flex-col">
                  <span class="text-lead font-bold break-words">{m.title}</span>
                  <span class="text-compact text-ink-2">{longDate(m.date)}</span>
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
