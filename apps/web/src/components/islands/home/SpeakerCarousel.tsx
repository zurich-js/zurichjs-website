import { useEffect, useRef, useState } from 'preact/hooks';
import { buttonClass, cx } from '@zurichjs/design/recipes';

export interface CarouselSpeaker {
  id: string;
  name: string;
  meta: string;
  initials: string;
  /** Card image (already sized). */
  photo?: { src: string; srcset?: string; alt: string; position?: string };
}

interface Props {
  speakers: CarouselSpeaker[];
}

const SIDE = 3; // cards drawn on each side of the active one; further ones wait hidden
const AUTO_MS = 3200; // auto-advance interval
const SWIPE = 50; // px of horizontal travel that counts as a swipe
const WHEEL = 60; // px of horizontal wheel travel per step (trackpads)

/** Opacity and scale by distance from the active card: the neighbours stay visible, quieter. */
const look = (a: number) => (a === 0 ? { op: 1, s: 1 } : a === 1 ? { op: 0.5, s: 0.9 } : a === 2 ? { op: 0.28, s: 0.82 } : a === 3 ? { op: 0.12, s: 0.76 } : { op: 0, s: 0.7 });

/**
 * "Meet the speakers" (Bogdan's review, 4th November 2026): the full width of the screen, the active
 * speaker large in the middle, the neighbours at lower opacity on both sides, and every card moving
 * through those positions. Cards follow the conference's speaker cards: the photo with a dark fade,
 * the name and role in white, no yellow.
 *
 * Controls: Previous and Next on the left and right, a quiet Pause/Play under the active card,
 * the arrow keys, swiping on touch screens and horizontal trackpad scrolling. Horizontal gestures are
 * captured here (touch-action and overscroll-behavior), so they never trigger the browser's back or
 * forward navigation. It advances on its own only while visible, and never under reduced motion.
 */
export function SpeakerCarousel({ speakers }: Props) {
  const n = speakers.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false); // hover or focus inside
  const [inView, setInView] = useState(false);
  const [drag, setDrag] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const wheel = useRef({ acc: 0, until: 0 });
  const moved = useRef(false); // a drag happened: the click that follows must not open a card

  const step = (d: number) => setActive((t) => (((t + d) % n) + n) % n);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true);
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.4 });
    if (root.current) io.observe(root.current);
    // Horizontal trackpad scrolling turns the carousel; preventDefault keeps it from becoming back/forward.
    const el = stage.current;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical scrolling still scrolls the page
      e.preventDefault();
      const w = wheel.current;
      const now = performance.now();
      if (now < w.until) return; // one step per gesture burst
      w.acc += e.deltaX;
      if (Math.abs(w.acc) >= WHEEL) {
        stepRef.current(w.acc > 0 ? 1 : -1);
        w.acc = 0;
        w.until = now + 450;
      }
    };
    el?.addEventListener('wheel', onWheel, { passive: false });
    // The arrow keys work anywhere inside; hovering or focusing inside holds the rotation.
    const r = root.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      stepRef.current(e.key === 'ArrowRight' ? 1 : -1);
    };
    const holdOn = () => setHold(true);
    const holdOff = () => setHold(false);
    const focusOut = (e: FocusEvent) => {
      if (!r?.contains(e.relatedTarget as Node | null)) setHold(false);
    };
    r?.addEventListener('keydown', onKey);
    r?.addEventListener('mouseenter', holdOn);
    r?.addEventListener('mouseleave', holdOff);
    r?.addEventListener('focusin', holdOn);
    r?.addEventListener('focusout', focusOut);
    return () => {
      io.disconnect();
      el?.removeEventListener('wheel', onWheel);
      r?.removeEventListener('keydown', onKey);
      r?.removeEventListener('mouseenter', holdOn);
      r?.removeEventListener('mouseleave', holdOff);
      r?.removeEventListener('focusin', holdOn);
      r?.removeEventListener('focusout', focusOut);
    };
  }, []);

  // The timer restarts after every change, so a card never moves right after someone moved it.
  useEffect(() => {
    if (paused || hold || drag || !inView || n < 2) return;
    const id = window.setTimeout(() => stepRef.current(1), AUTO_MS);
    return () => window.clearTimeout(id);
  }, [paused, hold, drag, inView, n, active]);

  if (!n) return null;

  const offset = (i: number) => {
    let o = (i - active + n) % n;
    if (o > n / 2) o -= n;
    return o;
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    moved.current = false;
  };
  const onMove = (e: PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    if (!drag && Math.abs(dx) < 8) return;
    if (!drag && Math.abs(e.clientY - s.y) > Math.abs(dx)) {
      start.current = null; // a vertical gesture: let the page scroll
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    moved.current = true;
    setDrag(dx);
  };
  const onUp = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || s.id !== e.pointerId) return;
    const d = drag;
    setDrag(0);
    if (Math.abs(d) >= SWIPE) step(d < 0 ? 1 : -1);
  };
  // A drag that ended on a card must not also follow its link.
  const swallowClick = (e: MouseEvent) => {
    if (moved.current) e.preventDefault();
  };

  const current = speakers[active]!;
  // Interface controls: round icon-only primary buttons.
  const arrow = buttonClass({ iconOnly: true }, 'absolute top-1/2 -translate-y-1/2 z-20');

  return (
    <div ref={root} role="region" aria-roledescription="carousel" aria-label="ZurichJS speakers" class="relative w-full flex flex-col items-center gap-5">
      <div
        ref={stage}
        class="relative w-full h-[clamp(380px,46vw,500px)] overflow-hidden touch-pan-y overscroll-x-contain select-none [--card-w:clamp(230px,24vw,320px)] [--step:calc(var(--card-w)*0.96)]"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {speakers.map((sp, i) => {
          const o = offset(i);
          const a = Math.abs(o);
          const { op, s } = look(a);
          const isActive = o === 0;
          return (
            <a
              key={sp.id}
              href={`/speakers/${sp.id}`}
              tabIndex={isActive ? 0 : -1}
              aria-hidden={isActive ? undefined : 'true'}
              draggable={false}
              onClick={(e) => {
                swallowClick(e);
                if (!isActive && !e.defaultPrevented) {
                  // A side card brings itself to the middle instead of opening.
                  e.preventDefault();
                  step(o);
                }
              }}
              class={cx(
                'absolute left-1/2 top-1/2 w-(--card-w) aspect-[3/4] rounded-card overflow-hidden bg-ink no-underline focus-visible:outline-offset-4',
                'transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                a > SIDE && 'pointer-events-none',
              )}
              style={{
                transform: `translate(-50%, -50%) translateX(calc(${o} * var(--step) + ${drag}px)) scale(${s})`,
                opacity: op,
                zIndex: 10 - a,
              }}
            >
              {sp.photo ? (
                <img
                  src={sp.photo.src}
                  srcset={sp.photo.srcset}
                  sizes="(min-width: 800px) 320px, 70vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  class="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ objectPosition: sp.photo.position ?? 'center 25%' }}
                />
              ) : (
                <span aria-hidden="true" class="absolute inset-0 flex items-center justify-center text-[72px] font-bold text-white">
                  {sp.initials}
                </span>
              )}
              <span class="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,#000_0%,rgba(0,0,0,0.8)_45%,transparent_100%)]" aria-hidden="true" />
              <span class="absolute inset-x-0 bottom-0 p-5 flex flex-col gap-1 text-center">
                <span class="text-white font-bold text-card-title">{sp.name}</span>
                {sp.meta && <span class="text-grey text-compact line-clamp-2">{sp.meta}</span>}
              </span>
            </a>
          );
        })}

        {n > 1 && (
          <>
            <button type="button" aria-label="Previous speaker" onClick={() => step(-1)} class={cx(arrow, 'left-(--gut)')}>
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12.5 4.5 7 10l5.5 5.5" />
              </svg>
            </button>
            <button type="button" aria-label="Next speaker" onClick={() => step(1)} class={cx(arrow, 'right-(--gut)')}>
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M7.5 4.5 13 10l-5.5 5.5" />
              </svg>
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused} class={buttonClass({ variant: 'plain' })}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            {paused ? <path d="M3 1.5v11l9-5.5z" /> : <path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" />}
          </svg>
          {paused ? 'Play' : 'Pause'}
        </button>
      )}
      {/* Announced only when someone is in control: while it turns on its own, announcing would be noise. */}
      <p class="sr-only" aria-live={paused || hold ? 'polite' : 'off'}>
        Speaker {active + 1} of {n}: {current.name}
      </p>
    </div>
  );
}
