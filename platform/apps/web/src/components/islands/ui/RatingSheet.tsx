import { submitForm } from '@zurichjs/forms/client';
import { useState } from 'preact/hooks';
import { track } from '~/lib/analytics';
import { Button } from './Button';
import { Modal } from './Modal';
import { StarRating } from './StarRating';

export interface RateTarget {
  /** Talk document id, or "evening". */
  key: string;
  title: string;
  sub: string;
}

interface Props {
  eventId: string;
  target: RateTarget | null;
  /** Other talks still unrated, offered after a successful submit. */
  pending: RateTarget[];
  onRated: (key: string, stars: number) => void;
  onNext: (t: RateTarget) => void;
  onClose: () => void;
}

/** Rate one talk (or the evening) from 1 to 5 with an optional note for the speaker. */
export function RatingSheet({ eventId, target, pending, onRated, onNext, onClose }: Props) {
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<'rate' | 'sending' | 'done' | 'error'>('rate');

  const reset = () => {
    setStars(0);
    setNote('');
    setPhase('rate');
  };
  const close = () => {
    reset();
    onClose();
  };
  const submit = async () => {
    if (!target || !stars) return;
    setPhase('sending');
    const r = await submitForm('rating', { eventId, target: target.key, stars, note });
    if (!r.ok) return setPhase('error');
    track('rating_submit', { eventId, target: target.key });
    onRated(target.key, stars);
    setPhase('done');
  };

  return (
    <Modal open={!!target} onClose={close} labelledBy="rate-h">
      {target && phase !== 'done' && (
        <div class="flex flex-col gap-4">
          <h2 id="rate-h" class="m-0 text-[24px] leading-tight font-bold text-pretty">
            {target.title}
          </h2>
          <div class="text-[16px] text-ink-2">{target.sub}</div>
          <StarRating value={stars} onChange={setStars} label="Rating from 1 to 5" />
          <label class="flex flex-col gap-1.5 text-[15px] font-bold">
            {target.key === 'evening' ? 'Anything for the organisers? (optional)' : 'Anything for the speaker? (optional)'}
            <textarea
              value={note}
              onInput={(e) => setNote(e.currentTarget.value)}
              rows={3}
              class="border border-grey-line rounded-[14px] py-2.5 px-3 text-[16px] font-normal resize-y"
            />
          </label>
          {phase === 'error' && (
            <p role="alert" class="m-0 text-[15px] text-danger">
              We couldn’t save that. Please try again.
            </p>
          )}
          <div class="flex gap-2.5">
            <Button variant="white" class="flex-1" onClick={close}>
              Later
            </Button>
            <Button variant="black" class="flex-1" onClick={submit} disabled={!stars || phase === 'sending'}>
              {phase === 'sending' ? 'Sending…' : 'Send rating'}
            </Button>
          </div>
        </div>
      )}
      {target && phase === 'done' && (
        <div role="status" class="flex flex-col gap-3.5">
          <h2 id="rate-h" class="m-0 text-[26px] font-bold">
            Thanks, that helps.
          </h2>
          <p class="m-0 text-[17px] leading-[1.55]">Your rating goes to the speaker and the organisers.</p>
          <Button
            variant="black"
            onClick={() => {
              const next = pending[0];
              reset();
              if (next) onNext(next);
              else onClose();
            }}
          >
            {pending.length ? (pending.length === 1 ? 'Rate the other talk' : 'Rate the next talk') : 'Done'}
          </Button>
        </div>
      )}
    </Modal>
  );
}
