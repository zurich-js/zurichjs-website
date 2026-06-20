# ZurichJS Website

ZurichJS is a Next.js website for the Zurich JavaScript community. It publishes meetups, workshops, speakers, partners, CFP flows, feedback forms, merchandise/support checkout, and admin tooling for community operations.

## Tech Stack

- Next.js Pages Router with React, TypeScript, and Tailwind CSS.
- Sanity for CMS-backed content and form submissions.
- Clerk for authentication, user profiles, and admin access control.
- Stripe for ticketing, support payments, coupons, and Tap to Pay admin flows.
- ImageKit for media gallery assets.
- PostHog, Google Analytics, Inspectlet, and LinkedIn Insight for analytics.
- Slack and Pushover for operational notifications.

## Data And Storage

Sanity is the primary content store. `src/sanity/client.ts` configures the read client and `src/sanity/queries.ts` contains GROQ queries for events, talks, speakers, stats, feedback analytics, and UTM views. Write paths create or update Sanity documents for CFP submissions, speaker profiles, event feedback, and speaker feedback using `SANITY_TOKEN`.

Some site data is local and versioned with the app. Partners live in `src/data/index.ts`; workshops live in `src/data/workshops.ts`; public images and static assets live under `public/`.

Clerk owns authentication and user metadata. Admin pages are protected by `src/proxy.ts`, which checks the active Clerk organization against `ZURICHJS_ADMIN_ORG_ID`. Profile, referral, coupon, and credit flows read or update Clerk users through server-side API routes.

Stripe owns prices, products, coupons, Checkout Sessions, Payment Links, Payment Intents, and Terminal connection tokens. The app stores Stripe IDs in Sanity or static configuration and creates payment flows through API routes under `src/pages/api/stripe`, `src/pages/api/admin`, and checkout-specific handlers.

ImageKit owns gallery media. `src/pages/api/imagekit/list.ts` lists ImageKit files, groups them by folder, and returns optimized thumbnail URLs for the media page.

Client-side persistence is limited to browser state such as referral tokens, processed referral markers, dismissed announcements, and local feedback-submission markers in `localStorage`.

## Rendering Strategy

The app uses a mix of rendering modes:

- Static generation with ISR for content-heavy marketing and community pages. The homepage uses `getStaticProps` with a 10-minute revalidation window.
- Static dynamic routes for event and speaker detail pages. Event pages build known Sanity events and use `fallback: "blocking"` for newly added events.
- Server-side rendering for freshness-sensitive pages such as `/events`, feedback entry points, and admin analytics.
- Client-side fetching for interactive flows, including checkout, admin tables, profile forms, media loading, notifications, and feedback submission.
- API routes provide all server-side integration boundaries for Sanity writes, Stripe operations, Clerk user operations, ImageKit listing, notifications, maps, newsletter signup, and generated Open Graph images.

## Project Layout

- `src/pages` contains public pages, dynamic routes, admin pages, and API routes.
- `src/components` contains shared UI, layout, sections, CFP forms, workshop widgets, checkout helpers, and admin components.
- `src/sanity` contains CMS client setup and GROQ query helpers.
- `src/data` contains static application data.
- `src/lib` contains integration clients and server-side helpers.
- `src/hooks` contains client-side analytics, checkout, referral, and profile hooks.
- `src/utils` contains formatting, structured data, token, encoding, and thumbnail utilities.
- `docs` contains implementation notes for larger operational features.

## Local Development

Use Node 22 and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` and fill only the services needed for the flow you are testing. Public pages can run with fewer secrets; Sanity writes, payments, authentication, notifications, ImageKit, maps, and newsletter actions require their corresponding environment variables.

## Scripts

```bash
pnpm dev            # Start the Next.js dev server
pnpm build          # Create a production build
pnpm start          # Run the production server
pnpm lint           # Run oxlint and ESLint
pnpm lint:fix       # Apply available lint fixes
pnpm format         # Format with oxfmt
pnpm format:check   # Check formatting
```

## Operational Notes

- Admin access requires Clerk authentication and membership in the configured ZurichJS organization.
- Sanity reads use the published perspective. Mutating routes use uncached clients with `SANITY_TOKEN`.
- Event date queries compare against the start of the current day in the Europe/Zurich timezone so same-day events remain visible until local midnight.
- `next.config.mjs` allows remote images from ImageKit, Sanity, Google Maps, QR Server, and the configured Supabase host.
- The app is built for deployment on Vercel or any Node-compatible Next.js host with the required environment variables.
