# Content sources: community history, team and partners

The community page's timeline and team (`packages/content/src/community.ts`), the partner list seeded into Sanity (Studio `scripts/seed-partners.ts`) and the sponsor roles come from the sources below. Each item in the code names its source.

**This session had no network access** to zurichjs.com, conf.zurichjs.com, Sanity or ImageKit, so nothing here was checked against the live sites. Organisers: confirm the items marked **confirm** before launch.

## Sources

| Key           | Source                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| old-about     | The production site's `/about` page: `zurichjs-website` `origin/main`, `src/pages/about.tsx` (team bios, social links, milestones to January 2026). |
| old-today     | The production site's `/today` sponsors: `origin/main` `src/data/index.ts`, `getTodaysSponsors` (the September 2026 warm-up).                       |
| old-partners  | The production site's partner list: `origin/main` `src/data/index.ts`, `getPartners`, with logos from `public/images/partners`.                     |
| conf-about    | conf.zurichjs.com about page: `zurichjs-conf` `src/data/about-us.ts` (conference team, 14 volunteers).                                              |
| conf-blog     | "How ZurichJS got here", conf.zurichjs.com blog, 26 June 2026: `zurichjs-conf` `src/content/blog/how-zurichjs-got-here.mdx`.                        |
| conf-timeline | conf.zurichjs.com timeline: `zurichjs-conf` `src/data/timeline.ts`.                                                                                 |

## Timeline

| Milestone                                                                      | Source                         | Status                                                      |
| ------------------------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------- |
| July 2024, Faris and Bogdan meet at a Zürich ReactJS meetup                    | conf-blog                      |                                                             |
| 14 Nov 2024, first meetup, 34 developers at novu, Nico Martin speaks           | old-about                      |                                                             |
| Jan 2025, 100 LinkedIn followers, 80–90 active Meetup members                  | old-about                      |                                                             |
| Feb 2025, Evangelia from Thessaloniki; Web Zurich partnership                  | old-about                      |                                                             |
| Mar 2025, React Paris and Code Blossom partnerships, with CityJS and Grusp     | old-about                      |                                                             |
| Mar 2025, Vue Zurich joins; Adam Berecz speaks                                 | old-about                      |                                                             |
| Apr 2025, Smallpdf hosts the fourth meetup                                     | old-about                      |                                                             |
| May, June, July, Sep, Oct 2025 meetups                                         | old-about                      |                                                             |
| 18 Jun 2025, ZurichJS becomes official through the Swiss JavaScript Group      | conf-blog                      |                                                             |
| Nov 2025, one-year anniversary at Pause im Foifi, presented by Digitec Galaxus | old-about                      |                                                             |
| 14 Nov 2025, first ZurichJS Conf tickets on sale                               | conf-timeline                  | **confirm** the date tickets actually went on sale          |
| Jan 2026, Vue x Stripe meetup with Stripe and GetYourGuide                     | old-about                      |                                                             |
| June 2026, OSS Award at JSNation                                               | conf-blog, Site settings award |                                                             |
| Sep 2026, conference warm-up meetup at GetYourGuide with GYFF and FIN          | old-today                      | **confirm**; linked to event `sep-2026` if that slug exists |
| 9–12 Sep 2026, the first ZurichJS Conf at Technopark Zürich                    | conf-timeline                  | **confirm** it took place as planned                        |

Left out because no source confirms them: attendance at the conference (the conference site's "300–500 attendees", "19 speakers", "6 workshops" are planned figures, not results), a "Front-Conf warm-up" (commented out in the old site), and the 2nd anniversary (12 November 2026 has not happened yet).

## Team

| Person              | Role shown                    | Source                                                                   | Status                                                                               |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Faris Aziz          | Co-founder and lead organiser | old-about, conf-blog                                                     |                                                                                      |
| Bogdan Mihai Ilie   | Co-founder and lead organiser | old-about, conf-blog                                                     |                                                                                      |
| Nadja Hesselbjerg   | Core team                     | conf-blog ("joined the core team"); old-about said "Community Supporter" | **confirm** the role                                                                 |
| Enrique Ruiz Durazo | Official photographer         | old-about                                                                | **confirm** still current                                                            |
| Colin Schwarz       | ZurichJS Conf team            | conf-about                                                               | **confirm** role and a photo (the conference repo's photo could not be read offline) |
| 14 volunteers       | ZurichJS Conf 2026            | conf-about                                                               |                                                                                      |

Nobody was removed. Photos: Faris, Bogdan and Enrique were already in V2; Nadja's comes from the production site (`public/images/team/nadja.png`).

## Partners

All partners come from old-partners. The seed script marks as **current** what the old site presented as active: the four tiered sponsors (Vercel, Stripe, GYFF, FIN) and the community, conference and supporting partners. Venue hosts are listed as hosts, never as current sponsors. **Confirm** every "current" flag and add start and end dates in the Studio before publishing the partner drafts.

## Membership

| Item                                                                                   | Source                                      | Status                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fees: Basic CHF 14.50 / 50 / 175, Supporter CHF 21 / 75 / 250 (month / quarter / year) | old-membership (`src/pages/membership.tsx`) | matches; covered by the membership journey test                                                                                                                                                                                                                                                                                                           |
| Supporter benefit "Free or discounted workshops"                                       | old-membership; kept unchanged by the owner | **confirm** what it covers now. Checked 2026-11-02: the old site's standalone workshops gave a 20% discount to signed-in community accounts, not to association Supporters, and they are retired. conf.zurichjs.com lists conference workshops (10 September 2026, now past) and mentions no member or Supporter discount. No note was added to the page. |
