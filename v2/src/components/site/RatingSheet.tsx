import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StarRating } from '@/components/ui/StarRating';
import { submitForm } from '@/lib/forms';
import { track } from '@/lib/analytics';

export interface RateTarget {
  key: string; // agenda index or "event"
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
    track({ name: 'rating_submit', eventId, target: target.key });
    onRated(target.key, stars);
    setPhase('done');
  };

  return (
    <Modal open={!!target} onClose={close} labelledBy="rate-h">
      {target && phase !== 'done' && (
        <div className="flex flex-col gap-4">
          <h2 id="rate-h" className="m-0 text-[24px] leading-[1.25] font-bold text-pretty">
            {target.title}
          </h2>
          <div className="text-[16px] text-ink-2">{target.sub}</div>
          <StarRating value={stars} onChange={setStars} label="Rating from 1 to 5" />
          <label className="flex flex-col gap-1.5 text-[15px] font-bold">
            {target.key === 'event' ? 'Anything for the organisers? (optional)' : 'Anything for the speaker? (optional)'}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="border border-grey-line rounded-[14px] py-2.5 px-3 text-[16px] font-normal resize-y" />
          </label>
          {phase === 'error' && (
            <p role="alert" className="m-0 text-[15px] text-danger">
              We couldn’t save that. Please try again.
            </p>
          )}
          <div className="flex gap-2.5">
            <Button variant="white" className="flex-1" onClick={close}>
              Later
            </Button>
            <Button variant="black" className="flex-1" onClick={submit} disabled={!stars || phase === 'sending'}>
              {phase === 'sending' ? 'Sending…' : 'Send rating'}
            </Button>
          </div>
        </div>
      )}
      {target && phase === 'done' && (
        <div role="status" className="flex flex-col gap-3.5">
          <h2 id="rate-h" className="m-0 text-[26px] font-bold">
            Thanks, that helps.
          </h2>
          <p className="m-0 text-[17px] leading-[1.55]">Your rating goes to the speaker and the organisers.</p>
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
