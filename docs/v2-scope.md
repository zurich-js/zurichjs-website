# ZurichJS meetup site V2 scope

Locked from the current-site review on 23 Sep 2026. This is the meetup site only. The conference stays on `conf.zurichjs.com`.

V2 is a public front door for the monthly meetup: what is happening next, who has spoken, how to propose a talk, how to sponsor or host, and how to join the list. RSVP stays on Meetup.com. The site does not sell tickets.

## In this release

| Surface | Behavior |
| --- | --- |
| Home | Next meetup, short pitch, list signup, links into the archive |
| Events | Upcoming and past. Detail page: talks, speakers, venue, time, calendar, link to the Meetup RSVP |
| Speakers | Index and profile, fed by the same content as events |
| Call for papers | Meetup talks only. Guest submit. Email captured with consent |
| Partnerships | Tiers plus an inquiry form |
| Verein | Inquiry form only. No checkout, no member portal |
| About, contact, policies | Code of conduct, privacy, terms, refunds |
| One support page | A single way to give money. Replaces `/donate` and `/buy-us-a-coffee` |
| One feedback form | After a meetup. Public link. No accounts, no speaker dashboards |
| Announcement banner | One active message from the CMS |
| Newsletter / list signup | See below |
| SEO and LLMO | Sitemap, canonicals, Event and Person structured data, and `llms.txt` generated from the CMS. Landing pages for Zurich JS and AI meetups stay, using the same facts as the rest of the site |

Content lives in the CMS (Sanity, unless we move it). Organizers edit events, talks, speakers, and announcements there. The website has no admin CRM.

Inquiries (partners, Verein, and a volunteer form if we still recruit that way) are stored as records and notified to Slack. A Slack-only message is not the system of record.

## The list, instead of accounts

No logins, profiles, surveys, credits, coupons, or referral links in this release.

The asset to carry into the next conference is a permissioned email list. One list. Every signup stores email, source, timestamp, and what they consented to.

Sources: footer and home signup, CFP, partnership inquiry, Verein inquiry, support page, feedback form when they leave an email.

Consent is explicit and split:

- ZurichJS meetup news
- ZurichJS conference news

A meetup signup does not opt someone into conference mail. The conference can import the conference-consent segment later. Points, rewards, and ticket recognition belong to that conference project, where there is something to redeem.

EmailOctopus is the current tool. Keep it if it can store those two consents and the source. Switch tools before building accounts.

## Out of this release

- Pro meetups and any event checkout. Deprecated.
- Workshops. Still part of the community later. No catalog, no ticket pages, no nav item until one is scheduled.
- T-shirts and any merch store.
- User accounts, the onboarding survey, referrals, credits, rewards, invite links, and Clerk-assigned coupons.
- `/today`, the conference waitlist, and any other page that recreates `conf.zurichjs.com`.
- Tap to Pay, cash reservations, payment links, and the admin junk drawer (Gmail export, UTM builder, activity scores).
- The second feedback system and speaker token dashboards.
- Media gallery, until someone is ready to keep it updated.
- Meetup.com RSVP. The site links to it.

## Later, in this order

1. Workshops, as one CMS template, when the next one is actually scheduled.
2. Merch, as its own small store, when there is a run of stock.
3. Verein automation, after the inquiry form has a real queue.
4. Conference loyalty, built on the conference site against the consented list. The meetup site stays logged-out.

## Success

Someone can land on the site, understand the next meetup, RSVP on Meetup, browse past talks, submit a talk, or ask about sponsoring. Someone who wants mail can join with a clear choice about conference email. Organizers can publish an event without a code change.
