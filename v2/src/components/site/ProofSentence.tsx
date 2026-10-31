import { AWARD, RATING } from '@/data/content';

/**
 * Rating and award in one plain sentence, after the main action. The rating part
 * disappears when the record has no score; the award stays.
 */
export function ProofSentence() {
  const showRating = !!RATING.score;
  return (
    <p className="m-0 text-[clamp(18px,1.6vw,20px)] leading-[1.6] text-white max-w-[560px] text-pretty">
      {showRating && (
        <span>
          Rated <b className="text-yellow">{RATING.score}</b> on Meetup from{' '}
          <a href={RATING.url} target="_blank" rel="noopener" title={`${RATING.source}, checked ${RATING.checkedAt}`}>
            {RATING.count} ratings
          </a>
          , and{' '}
        </span>
      )}
      <span>
        {showRating ? 'winner' : 'Winner'} of the <b className="text-yellow">2026 Open Source Award</b> for{' '}
        <a href={AWARD.url} target="_blank" rel="noopener">
          {AWARD.category}
        </a>
        .
      </span>
    </p>
  );
}
