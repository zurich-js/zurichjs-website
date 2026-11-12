import { useEffect, useRef, useState } from 'preact/hooks';
import { cx } from '../recipes.ts';

export interface ArcSpeaker {
  id: string;
  name: string;
  /** The speaker's role (never a talk title). */
  role: string;
  talks: number;
  initials: string;
  photo?: { src: string; srcset?: string; position?: string };
}

const AUTO_MS = 3200; // auto-advance interval
const MOVE_MS = 520; // one move; steps asked for during it are ignored (debounce)
const GAP = 16; // px between neighbouring cards, measured along the arc
const SWIPE = 50; // px of horizontal travel that counts as a swipe
const SIDE_OPACITY = 0.55; // side cards are washed out, so the active one leads
const WHEEL = 40; // px of horizontal trackpad travel per step
/** The active card comes forward; the others step back a little more with each place. */
const scaleAt = (a: number) => (a === 0 ? 1 : Math.max(0.6, 0.9 - 0.06 * a));

/**
 * "Meet the speakers" as an arc. The active speaker sits at the top of the arc, in front:
 * full size with a shadow, the others smaller and fainter. Cards stay upright and only their path
 * curves: each is spaced from its neighbour by their scaled widths plus 16px, then dropped by the
 * height of a circle at that point. Turning them with the curve would close the gap at their bottoms.
 *
 * As many cards show as the width allows, washed out to 55% so the active card leads, fading further as
 * they near the edge of the stage.
 * No Pause button: pointing at a card, or focusing one, holds it; leaving the card starts it again.
 * Previous and Next are black circles at the screen edges, level with the active card; clicks, swipes and sideways trackpad scrolling all step
 * one card, and steps asked for during a move are ignored. The active card opens the speaker's page in
 * a new tab, with an arrow that says so on hover or focus. Side cards never take focus when clicked:
 * they only come forward. It only turns while visible, and never under reduced motion.
 */
export function SpeakerArc({ speakers }: { speakers: ArcSpeaker[] }) {
  const n = speakers.length;
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);
  const [inView, setInView] = useState(false);
  const [still, setStill] = useState(false); // reduced motion
  const [w, setW] = useState(1200);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const wheel = useRef(0);
  const lock = useRef(0);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);

  const go = (d: number) => {
    const now = performance.now();
    if (now < lock.current) return;
    lock.current = now + MOVE_MS;
    setActive((t) => (((t + d) % n) + n) % n);
  };
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    const ro = new ResizeObserver(([e]) => e && setW(e.contentRect.width));
    ro.observe(el);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      goRef.current(e.key === 'ArrowRight' ? 1 : -1);
    };
    el.addEventListener('keydown', onKey);
    // Sideways trackpad scrolling turns it; preventDefault keeps it from becoming the browser's back/forward.
    const st = stage.current;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical scrolling still scrolls the page
      e.preventDefault();
      wheel.current += e.deltaX;
      if (Math.abs(wheel.current) < WHEEL) return;
      goRef.current(wheel.current > 0 ? 1 : -1);
      wheel.current = 0;
    };
    st?.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      io.disconnect();
      ro.disconnect();
      el.removeEventListener('keydown', onKey);
      st?.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => {
    if (still || hold || !inView || n < 2) return;
    const id = window.setTimeout(() => goRef.current(1), AUTO_MS);
    return () => window.clearTimeout(id);
  }, [still, hold, inView, n, active]);

  if (!n) return null;

  // Geometry, in px from the stage width: card size, then the circle the cards sit on.
  const cardW = Math.min(300, Math.max(190, w * 0.22));
  const cardH = (cardW * 4) / 3;
  const R = cardW * 16; // the circle the path follows: very wide, so the arc is a gentle curve
  const widthAt = (a: number) => cardW * scaleAt(a);
  /** Distance from the active card's centre to the centre of the card `a` places away. */
  const along = (a: number) => {
    let s = 0;
    for (let k = 0; k < a; k++) s += widthAt(k) / 2 + GAP + widthAt(k + 1) / 2;
    return s;
  };
  const half = w / 2;
  /** Side cards stay clear while most of them shows, then fade as their inner edge nears the stage edge. */
  const fade = (x: number, a: number) => {
    const inner = (Math.abs(x) - widthAt(a) / 2) / half; // 1 = the card's inner edge is at the stage edge
    return Math.max(0, Math.min(1, (1.05 - inner) / 0.4));
  };
  /** How far the path has dropped at x: the height of the circle there. */
  const drop = (x: number) => {
    const c = Math.min(Math.abs(x), R * 0.98);
    return R - Math.sqrt(R * R - c * c);
  };
  // Tall enough for the lowest card that still shows (cards scale around their centre).
  let stageH = cardH;
  const SHADOW = 40; // room under the cards for the active card's shadow
  for (let a = 1; a <= 12 && fade(along(a), a) > 0; a++) stageH = Math.max(stageH, drop(along(a)) + (cardH * (1 + scaleAt(a))) / 2);

  const offset = (i: number) => {
    let o = (i - active + n) % n;
    if (o > n / 2) o -= n;
    return o;
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    moved.current = false;
  };
  const onUp = (e: PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) >= SWIPE && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
      moved.current = true;
      go(dx < 0 ? 1 : -1);
    }
  };

  const nav =
    'absolute z-20 -translate-y-1/2 size-control rounded-full bg-black text-white border border-black flex items-center justify-center cursor-pointer transition-colors hover:bg-white hover:text-black';

  return (
    <div ref={root} role="region" aria-roledescription="carousel" aria-label="ZurichJS speakers" class="relative w-full flex flex-col items-center">
      <div
        ref={stage}
        class="relative w-full overflow-hidden touch-pan-y overscroll-x-contain select-none"
        style={{ height: `${stageH + SHADOW}px` }}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => (swipe.current = null)}
        onFocusIn={() => setHold(true)}
        onFocusOut={(e) => !root.current?.contains(e.relatedTarget as Node | null) && setHold(false)}
      >
        {speakers.map((sp, i) => {
          const o = offset(i);
          const a = Math.abs(o);
          const isActive = o === 0;
          const x = Math.sign(o) * along(Math.min(a, 12));
          const y = drop(x);
          const scale = scaleAt(a);
          const opacity = isActive ? 1 : Math.min(SIDE_OPACITY, fade(x, a));
          return (
            <a
              key={sp.id}
              href={`/speakers/${sp.id}`}
              tabIndex={isActive ? 0 : -1}
              aria-hidden={isActive ? undefined : 'true'}
              {...(isActive ? { target: '_blank', rel: 'noopener' } : {})}
              draggable={false}
              // A side card only comes forward: keep focus off it, since it is hidden from assistive tech.
              onMouseDown={(e) => !isActive && e.preventDefault()}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHold(true)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && setHold(false)}
              onClick={(e) => {
                if (moved.current) e.preventDefault();
                else if (!isActive) {
                  e.preventDefault();
                  go(o);
                }
              }}
              class={cx(
                'group absolute left-1/2 top-0 overflow-hidden rounded-card bg-ink no-underline focus-visible:outline-offset-4',
                'transition-[transform,box-shadow,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                isActive ? 'shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)]' : 'shadow-none',
                opacity === 0 && 'pointer-events-none',
              )}
              style={{
                width: `${cardW}px`,
                height: `${cardH}px`,
                marginLeft: `${-cardW / 2}px`,
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                // Fully faded cards are hidden outright; partly washed-out ones get a white veil (below).
                visibility: opacity === 0 ? 'hidden' : undefined,
                zIndex: 10 - a,
              }}
            >
              {sp.photo ? (
                <img
                  src={sp.photo.src}
                  srcset={sp.photo.srcset}
                  sizes="300px"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  class="absolute inset-0 size-full object-cover pointer-events-none"
                  style={{ objectPosition: sp.photo.position ?? 'center 25%' }}
                />
              ) : (
                <span aria-hidden="true" class="absolute inset-0 flex items-center justify-center font-bold text-white text-title">
                  {sp.initials}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  class="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white text-black opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4.5 9.5 10 4M5 4h5v5" />
                  </svg>
                </span>
              )}
              {isActive && <span class="sr-only"> (opens in a new tab)</span>}
              <span class="absolute left-4 top-4 inline-flex items-center h-tag-sm px-2 rounded-tag bg-white text-black font-bold text-meta leading-none">
                {sp.talks === 1 ? '1 talk' : `${sp.talks} talks`}
              </span>
              <span aria-hidden="true" class="absolute inset-x-0 bottom-0 h-1/2 bg-black/70 [mask-image:linear-gradient(to_top,#000_40%,transparent)]" />
              <span class="absolute inset-x-0 bottom-0 p-5 flex flex-col gap-1 text-center">
                <span class="text-white font-bold text-card-title">{sp.name}</span>
                {sp.role && <span class="text-grey-light line-clamp-2 text-compact">{sp.role}</span>}
              </span>
              {/*
                The wash: a white veil over side cards rather than the card's own opacity, so on the white page it looks
                the same while the text underneath keeps its real contrast. A hovered side card shows in full.
              */}
              <span
                aria-hidden="true"
                class="absolute inset-0 bg-white pointer-events-none transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover:opacity-0!"
                style={{ opacity: 1 - opacity }}
              />
            </a>
          );
        })}
      </div>

      {n > 1 && (
        <>
          <button type="button" aria-label="Previous speaker" onClick={() => go(-1)} class={cx(nav, 'left-4')} style={{ top: `${cardH / 2}px` }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.5 4.5 7 10l5.5 5.5" />
            </svg>
          </button>
          <button type="button" aria-label="Next speaker" onClick={() => go(1)} class={cx(nav, 'right-4')} style={{ top: `${cardH / 2}px` }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7.5 4.5 13 10l-5.5 5.5" />
            </svg>
          </button>
        </>
      )}
      <p class="sr-only" aria-live={hold ? 'polite' : 'off'}>
        Speaker {active + 1} of {n}: {speakers[active]!.name}, {speakers[active]!.role}
      </p>
    </div>
  );
}
