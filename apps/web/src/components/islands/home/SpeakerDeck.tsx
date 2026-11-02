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

const SWIPE = 80; // px of travel that counts as a swipe
const FLY = 700; // px a dismissed card travels (phones)
const SPREAD = 2; // cards each side of the centre on desktop
const AUTO_MS = 3800; // desktop rotation interval

/** Phones: a stack. k = 0 is the top card, 1 and 2 peek out underneath; the rest wait hidden. */
function stackTransform(o: number) {
  if (o < 0) return { t: 'translateY(0) scale(.88)', op: 0 };
  if (o > 2) return { t: 'translateY(36px) scale(.88)', op: 0 };
  return { t: `translateY(${o * 18}px) scale(${1 - o * 0.06})`, op: 1 };
}

/** Desktop: a fan. o = 0 in the middle, ±1 and ±2 spread out, tilted and set back. */
function fanTransform(o: number) {
  const a = Math.abs(o);
  if (a > SPREAD) return { t: `translateX(calc(${Math.sign(o) * 3} * var(--fan-step))) translateY(80px) rotate(${Math.sign(o) * 14}deg) scale(.7)`, op: 0 };
  return { t: `translateX(calc(${o} * var(--fan-step))) translateY(${a * a * 14}px) rotate(${o * 6}deg) scale(${1 - a * 0.08})`, op: 1 };
}

/**
 * "Meet the speakers" as a deck of cards.
 * Phones: a stack; swipe the top card in any direction to send it to the back.
 * Desktop: five cards fanned out that rotate on their own (paused on hover, on
 * focus, with the Pause button, or under reduced motion); drag sideways or click
 * a side card to turn the fan. Previous, Next and the arrow keys work everywhere.
 * Both layouts come from the same markup through CSS variables, so nothing jumps
 * when the island hydrates. Cards are told apart by colour, not shadows.
 */
export function SpeakerDeck({ speakers }: Props) {
  const n = speakers.length;
  const [top, setTop] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState<{ x: number; y: number; card: number } | null>(null);
  const [desktop, setDesktop] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false); // hover or focus inside
  const [inView, setInView] = useState(false); // rotate only while someone can see it
  const root = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce.current) setPaused(true);
    const mq = window.matchMedia('(min-width: 800px)');
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener('change', on);
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.5 });
    if (root.current) io.observe(root.current);
    return () => {
      mq.removeEventListener('change', on);
      io.disconnect();
    };
  }, []);

  const step = (d: number) => setTop((t) => (((t + d) % n) + n) % n);

  useEffect(() => {
    if (!desktop || paused || hold || !inView || n < 2) return;
    const id = window.setInterval(() => setTop((t) => (t + 1) % n), AUTO_MS);
    return () => window.clearInterval(id);
  }, [desktop, paused, hold, inView, n]);

  if (!n) return null;
  const idx = (k: number) => (((top + k) % n) + n) % n;

  const next = (dir: { x: number; y: number } = { x: -1, y: 0 }) => {
    if (leaving) return;
    if (desktop || reduce.current) return step(1);
    const len = Math.hypot(dir.x, dir.y) || 1;
    setLeaving({ x: (dir.x / len) * FLY, y: (dir.y / len) * FLY, card: top });
    step(1);
    window.setTimeout(() => setLeaving(null), 320);
  };
  const prev = () => {
    if (!leaving) step(-1);
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
    const d = { x: e.clientX - s.x, y: desktop ? 0 : e.clientY - s.y };
    if (Math.hypot(d.x, d.y) > 6) moved.current = true;
    setDrag(d);
  };
  const onUp = (e: PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    const d = drag ?? { x: 0, y: 0 };
    setDrag(null);
    if (Math.hypot(d.x, d.y) <= SWIPE) return;
    // Desktop: drag left for the next speaker, right for the previous one.
    if (desktop) return d.x < 0 ? next() : prev();
    next(d);
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

  // Every card has a slot relative to the top/centre one: -n/2 … n/2.
  const offset = (i: number) => {
    let o = (i - top + n) % n;
    if (o > n / 2) o -= n;
    return o;
  };
  const ease = 'transform 420ms cubic-bezier(.2,.7,.2,1), opacity 320ms';

  const card = (sp: DeckSpeaker, i: number, o: number, isLeaving = false) => {
    const isTop = o === 0 && !isLeaving;
    const near = Math.abs(o) <= SPREAD;
    const m = stackTransform(o);
    const d = fanTransform(o);
    const dragX = isTop && drag ? drag : null;
    const dragT = dragX ? `translate(${dragX.x}px, ${dragX.y}px) rotate(${dragX.x / 18}deg) ` : '';
    const fly = isLeaving && leaving ? `translate(${leaving.x}px, ${leaving.y}px) rotate(${leaving.x / 14}deg)` : '';
    const style = {
      '--m-t': fly || `${dragT}${m.t}`,
      '--m-o': isLeaving ? 0 : m.op,
      '--d-t': `${dragT}${d.t}`,
      '--d-o': d.op,
      transformOrigin: 'center bottom',
      zIndex: isLeaving ? 20 : 10 - Math.abs(o),
      transition: dragX ? 'none' : ease,
    } as Record<string, string | number>;
    return (
      <a
        key={isLeaving ? `leaving-${sp.id}` : sp.id}
        href={`/speakers/${sp.id}`}
        // The centre card is the one in the tab order; side cards are reachable with the arrows.
        tabIndex={isTop ? 0 : -1}
        aria-hidden={isTop ? undefined : 'true'}
        draggable={false}
        onClick={(e) => {
          if (moved.current) return e.preventDefault();
          // Desktop: a side card turns the fan instead of opening the profile.
          if (!isTop && desktop && near) {
            e.preventDefault();
            step(o);
          }
        }}
        onPointerDown={isTop ? onDown : undefined}
        onPointerMove={isTop ? onMove : undefined}
        onPointerUp={isTop ? onUp : undefined}
        onPointerCancel={isTop ? onUp : undefined}
        onKeyDown={isTop ? onKey : undefined}
        class={cx(
          'absolute inset-0 md:inset-auto md:left-1/2 md:top-2 md:w-[290px] md:h-[400px] md:-ml-[145px]',
          'rounded-card p-3 flex flex-col gap-3 no-underline text-black select-none',
          '[transform:var(--m-t)] [opacity:var(--m-o)] md:[transform:var(--d-t)] md:[opacity:var(--d-o)]',
          i % 2 === 0 ? 'bg-yellow' : 'bg-grey',
          isTop && 'cursor-grab active:cursor-grabbing touch-none focus-visible:outline-offset-4',
          !isTop && near && 'md:cursor-pointer',
          (isLeaving || !near) && 'pointer-events-none',
        )}
        style={style}
      >
        <span class="block flex-1 min-h-0 rounded-[16px] overflow-hidden bg-white">
          {sp.photo ? (
            <img
              src={sp.photo.src}
              srcset={sp.photo.srcset}
              sizes="(min-width: 800px) 290px, 80vw"
              alt=""
              draggable={false}
              loading={Math.abs(o) <= SPREAD ? 'eager' : 'lazy'}
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
  };

  // Draw only the cards that can be seen (or are about to move into view).
  const drawn = speakers.map((sp, i) => ({ sp, i, o: offset(i) })).filter((c) => Math.abs(c.o) <= SPREAD + 1);
  const current = speakers[idx(0)]!;

  return (
    <div
      ref={root}
      class="flex flex-col items-center gap-6 md:gap-8"
      data-speaker-deck
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocusIn={() => setHold(true)}
      onFocusOut={(e) => {
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) setHold(false);
      }}
    >
      <div
        class="relative w-[min(82vw,360px)] aspect-[4/5.2] mb-9 md:mb-0 md:w-full md:aspect-auto md:h-[470px] md:overflow-x-clip [--fan-step:clamp(130px,14vw,200px)]"
        role="group"
        aria-roledescription="card deck"
        aria-label="Speakers"
      >
        {drawn.map((c) => card(c.sp, c.i, c.o))}
        {leaving && card(speakers[leaving.card]!, leaving.card, 0, true)}
      </div>

      <div class="flex flex-col gap-4 items-center text-center">
        <p class="m-0 text-[17px] text-ink-2">
          <span class="md:hidden">Swipe the card, or use the buttons, to meet everyone who has spoken at ZurichJS.</span>
          <span class="hidden md:inline">Drag the cards, click one, or use the buttons to meet everyone who has spoken at ZurichJS.</span>
        </p>
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
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            class="hidden md:inline-flex items-center min-h-[48px] px-5 rounded-pill border-2 border-black bg-white font-bold text-[17px] cursor-pointer"
          >
            {paused ? 'Play' : 'Pause'}
          </button>
        </div>
        <p class="m-0 text-[15px] text-ink-2" aria-live={desktop && !paused && !hold && inView ? 'off' : 'polite'}>
          {`${top + 1} of ${n}: ${current.name}`}
        </p>
      </div>
    </div>
  );
}
