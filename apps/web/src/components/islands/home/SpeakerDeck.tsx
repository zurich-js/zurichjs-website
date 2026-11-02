import { useEffect, useRef, useState } from 'preact/hooks';
import { cx } from '@zurichjs/design/recipes';

export interface DeckSpeaker {
  id: string;
  name: string;
  meta: string;
  initials: string;
  /** Card image (already sized). */
  photo?: { src: string; srcset?: string; alt: string; position?: string };
}

interface Props {
  speakers: DeckSpeaker[];
}

const SWIPE = 80; // px of travel that sends a card to the back
const FLY = 700; // px a dismissed card travels
const VISIBLE = 3; // cards drawn in the stack

/**
 * "Meet the speakers" as a deck of cards. Swipe or drag the top card in any
 * direction (left, right, up or down) to send it to the back; Previous and Next
 * and the arrow keys do the same. Cards are told apart by colour, not shadows.
 */
export function SpeakerDeck({ speakers }: Props) {
  const n = speakers.length;
  const [top, setTop] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState<{ x: number; y: number; card: number } | null>(null);
  const [entering, setEntering] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  if (!n) return null;
  const idx = (k: number) => (((top + k) % n) + n) % n;
  const at = (k: number) => speakers[idx(k)]!;

  const next = (dir: { x: number; y: number } = { x: -1, y: 0 }) => {
    if (leaving) return;
    if (reduce.current) return setTop((t) => (t + 1) % n);
    const len = Math.hypot(dir.x, dir.y) || 1;
    setLeaving({ x: (dir.x / len) * FLY, y: (dir.y / len) * FLY, card: top });
    // The next card is already underneath; promote it now and let the old one fly off.
    setTop((t) => (t + 1) % n);
    window.setTimeout(() => setLeaving(null), 320);
  };
  const prev = () => {
    if (leaving) return;
    setTop((t) => (t - 1 + n) % n);
    if (!reduce.current) {
      setEntering(true);
      window.setTimeout(() => setEntering(false), 20);
    }
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || leaving) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    moved.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const d = { x: e.clientX - s.x, y: e.clientY - s.y };
    if (Math.hypot(d.x, d.y) > 6) moved.current = true;
    setDrag(d);
  };
  const onUp = (e: PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    const d = drag ?? { x: 0, y: 0 };
    setDrag(null);
    if (Math.hypot(d.x, d.y) > SWIPE) next(d);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next({ x: e.key === 'ArrowRight' ? 1 : 0, y: e.key === 'ArrowDown' ? 1 : 0 });
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prev();
    }
  };

  const card = (sp: DeckSpeaker, i: number, k: number, style: Record<string, string | number>, extra?: string, interactive = false) => (
    <a
      key={k < 0 ? `leaving-${sp.id}` : sp.id}
      href={`/speakers/${sp.id}`}
      tabIndex={interactive ? 0 : -1}
      aria-hidden={interactive ? undefined : 'true'}
      draggable={false}
      onClick={(e) => {
        if (moved.current) e.preventDefault();
      }}
      onPointerDown={interactive ? onDown : undefined}
      onKeyDown={interactive ? onKey : undefined}
      onPointerMove={interactive ? onMove : undefined}
      onPointerUp={interactive ? onUp : undefined}
      onPointerCancel={interactive ? onUp : undefined}
      class={cx(
        'absolute inset-0 rounded-card p-3 flex flex-col gap-3 no-underline text-black select-none',
        i % 2 === 0 ? 'bg-yellow' : 'bg-grey',
        interactive && 'cursor-grab active:cursor-grabbing touch-none focus-visible:outline-offset-4',
        extra,
      )}
      style={style}
    >
      <span class="block flex-1 min-h-0 rounded-[16px] overflow-hidden bg-white">
        {sp.photo ? (
          <img
            src={sp.photo.src}
            srcset={sp.photo.srcset}
            sizes="(min-width: 800px) 360px, 80vw"
            alt=""
            draggable={false}
            loading={k === 0 ? 'eager' : 'lazy'}
            decoding="async"
            class="w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: sp.photo.position ?? 'center 25%' }}
          />
        ) : (
          <span aria-hidden="true" class="w-full h-full flex items-center justify-center text-[72px] font-bold">
            {sp.initials}
          </span>
        )}
      </span>
      <span class="flex flex-col gap-0.5 px-1 pb-1">
        <span class="text-[21px] font-bold leading-tight">{sp.name}</span>
        <span class="text-[16px] text-ink-2 line-clamp-2 min-h-[2lh]">{sp.meta}</span>
      </span>
    </a>
  );

  const ease = 'transform 320ms cubic-bezier(.2,.7,.2,1), opacity 320ms';
  const stack = Array.from({ length: Math.min(VISIBLE, n) }, (_, k) => k).reverse();
  const current = at(0);

  return (
    <div class="flex flex-col md:flex-row md:items-center gap-6 md:gap-12" data-speaker-deck>
      <div class="relative w-[min(82vw,360px)] aspect-[4/5.2] mx-auto md:mx-0 mb-9 flex-none" role="group" aria-roledescription="card deck" aria-label="Speakers">
        {stack.map((k) => {
          const sp = at(k);
          const isTop = k === 0;
          const d = isTop && drag ? drag : { x: 0, y: 0 };
          const transform = isTop
            ? `translate(${d.x}px, ${d.y}px) rotate(${d.x / 18}deg)${entering ? ' translateX(-40px) scale(.96)' : ''}`
            : `translateY(${k * 18}px) scale(${1 - k * 0.06})`;
          return card(sp, idx(k), k, { transform, transformOrigin: 'center bottom', zIndex: VISIBLE - k, transition: drag && isTop ? 'none' : ease }, undefined, isTop);
        })}
        {leaving &&
          card(
            speakers[leaving.card]!,
            leaving.card,
            -1,
            { transform: `translate(${leaving.x}px, ${leaving.y}px) rotate(${leaving.x / 14}deg)`, opacity: 0, zIndex: VISIBLE + 1, transition: ease },
            'pointer-events-none',
          )}
      </div>

      <div class="flex flex-col gap-4 items-center md:items-start text-center md:text-left">
        <p class="m-0 text-[17px] text-ink-2">Swipe the card, or use the buttons, to meet everyone who has spoken at ZurichJS.</p>
        <div class="flex items-center gap-3">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous speaker"
            class="min-h-[48px] min-w-[48px] px-5 rounded-pill border-2 border-black bg-white font-bold text-[17px] cursor-pointer"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => next()}
            aria-label="Next speaker"
            class="min-h-[48px] min-w-[48px] px-5 rounded-pill border-2 border-black bg-black text-white font-bold text-[17px] cursor-pointer"
          >
            Next
          </button>
        </div>
        <p class="m-0 text-[15px] text-ink-2" aria-live="polite">
          {`${top + 1} of ${n}: ${current.name}`}
        </p>
      </div>
    </div>
  );
}
