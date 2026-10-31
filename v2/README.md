# ZurichJS V2 public site

Implementation of the Claude Design handoff `ZurichJS V2 Public Site v2` (see `../project/` and `../chats/chat1.md`), built as a Next.js 15 (pages router) + TypeScript + Tailwind project so it can be moved into `zurich-js/zurichjs-website` page by page.

```bash
pnpm install       # v2/ is its own pnpm root (see pnpm-workspace.yaml)
pnpm dev           # http://localhost:3000
pnpm build && pnpm start
pnpm typecheck
```

Images shared with the production site (`community/*`, `team/*`) are stored once in the repository's root `public/images` and copied in by `scripts/sync-assets.mjs` before `dev` and `build`.

## What is here

| Route | Screen |
|---|---|
| `/` | Home: black header + hero (next meetup, rating and award sentence, photo mosaic), what happens at a meetup, talks from past meetups, conference module, speakers, speak-at-a-meetup, hosts |
| `/events` | Event list with Upcoming/Past tabs, Meetups/Workshops filter and search (state in the URL) |
| `/events/[slug]` | Event detail. Upcoming states (RSVP open, RSVP soon, date TBC, full, postponed, cancelled), live/feedback mode for 48 h after doors with per-talk rating, then the recap view on the same URL |
| `/speakers`, `/speakers/[id]` | Directory with search; profile with upcoming talk and talk history |
| `/cfp` | Talk proposal: meetup vs conference, two-step form with inline errors, draft kept in localStorage, confirmation with stages |
| `/about`, `/about/why-zurichjs` | About page and the full "Why it's called ZurichJS" story |
| `/today` | Phone-first evening page: now/next, programme with "Now" marker and per-talk rating, evening feedback link, hosts, before-you-head-home |
| `/partners` | Replaces `/partnerships`: three ways to help, audience profile, inquiry form, conference packages link, host logos |
| `/workshops/[slug]` | Workshop template: on sale / few seats / sold out / past, checkout modal (tickets, invoice details, Stripe handoff), waitlist |
| `/feedback` | Event-level feedback (one required score, open questions, quote consent) |
| `/contact`, `/donate`, `/cfv`, `/media` | Contact routes + form, donation amounts with Twint/card, volunteer form, photo archive |
| `/policies/[slug]` | Code of conduct, privacy, terms, refunds in one template |
| `/404` | Search, next meetup, popular pages |

Legacy redirects (`/partnerships`, `/buy-us-a-coffee`, `/event-feedback`, `/community`) are in `next.config.mjs`.

## Structure

- `src/data/types.ts` – content model (events, talks, speakers, rating record, conference state).
- `src/data/content.ts` – **sample content** from the prototype (Swiss "Muster" speaker names, Sample Venue AG, placeholder logos and policy text). Replace with Sanity queries; nothing else needs to change.
- `src/lib/events.ts` – `resolveState()` turns editorial status + the clock into the displayed state; `presentEvent()` produces every label, banner and call to action.
- `src/components/layout` – `Layout` (black header surface + footer), `Header`, `Footer`, `PageOpening`.
- `src/components/ui` – `Button` variants, `Surface`, `Modal`, `StarRating`, `Monogram`, `Photo`, `LogoGrid`.
- `src/components/site` – homepage blocks, `EventRow`, `TalkRow`, `SpeakerCard`, `RatingSheet`.
- `src/pages/api/forms/[kind].ts` – form intake with validation. Email/Slack/Sanity forwarding and Stripe Checkout session creation are marked `TODO` there.

## Brand

Figtree variable font (self-hosted, `next/font/local`), `#000` opening and footer, `#FFF` content, `#F1E271` accent, `#19191B`/`#EDEDEF` supporting surfaces, `#268BCC` only for focus rings and the logo. One breakpoint at 800 px. No decorative borders, kickers or dividers; rounded pills and 24 px cards throughout.

## Previewing states (development only)

- Event page: `/events/<slug>?state=live|cancelled|postponed|full|tbc|notopen|past`
- Workshop: `/workshops/<slug>?ws=few|soldout|past`
- Tonight: `/today?at=2026-11-18T19:40:00%2B01:00`

These query parameters are ignored in production builds.

## Open items before launch

- Rating record (`RATING` in `content.ts`): Meetup's published score, checked 2026-09-28. Update by hand; set `score: null` to hide. The scale was not confirmed, so the UI does not print "/5".
- Forms post to the API route and succeed, but nothing is forwarded yet. Stripe Checkout for workshops and donations returns a stub.
- Policy wording, workshop price/trainer/seats, host logos and all speakers are sample content.
- Social buttons on About are text-only in brand colours; add the official platform logo files.
- `/media` lists photos from the sample events; wire to the real photo source.
- Tax-deductibility of donations is not claimed, pending a check with the association.
