/**
 * GROQ queries for the public site. They read the production document shapes
 * (type `events`, slug in `id`, `datetime`, free-text `location`/`address`)
 * and the additive V2 fields from docs/v2/CONTENT-MODEL-DIFF.md, so they work
 * before and after the Phase 3 schema migration.
 */
import { defineQuery } from 'groq';

const speakerFields = /* groq */ `
  "id": id.current, name, title, company, bio, location, interests, tagline,
  twitter, bluesky, github, linkedin, website, isVisible, _updatedAt, legacySlugs,
  "image": image.asset->url
`;

const talkFields = /* groq */ `
  _id, "id": id.current, title, description, type, durationMinutes, tags, level, language,
  "slidesUrl": slides.asset->url,
  "speakerIds": speakers[]->id.current
`;

export const EVENTS_QUERY = defineQuery(`
*[_type == "events" && defined(id.current)] | order(datetime desc) {
  _id, _updatedAt, "id": id.current, title, status, datetime, endsAt, dateText,
  location, address, venue, venueNote, description, meetupUrl,
  "image": image.asset->url,
  "photos": photos[]{ "src": asset->url, alt, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height },
  practical[]{ label, value },
  "hosts": hosts[]->id.current,
  supporters[]{ role, "partnerId": partner->id.current },
  photoCredit,
  agenda[]{ time, kind, title, note, "talk": talk->{ ${talkFields} } },
  "talks": talks[]->{ ${talkFields} },
  recap{ "talks": talks[]{ summary, format, "talk": talk->{ ${talkFields} } } }
}`);

export const SPEAKERS_QUERY = defineQuery(`
*[_type == "speaker" && defined(id.current) && isVisible != false] {
  ${speakerFields},
  "talks": *[_type == "talk" && references(^._id)]{
    ${talkFields},
    "eventIds": *[_type == "events" && references(^._id)].id.current,
    "legacyEventId": events->id.current
  }
}`);

export const PARTNERS_QUERY = defineQuery(`
*[_type == "partner" && defined(id.current)] | order(name asc) {
  "id": id.current, name, url, "logo": logo.asset->url, kinds, tier, current, since, until, description, allowReferrer
}`);

export const SINGLETONS_QUERY = defineQuery(`{
  "rating": *[_type == "meetupRating"][0]{ score, scale, count, url, source, checkedAt },
  "conference": *[_type == "conference"][0]{ state, headline, body, cta, cfp, url },
  "support": *[_type == "siteSettings"][0]{
    "twintQr": twintQr{ alt, "src": asset->url, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height },
    twintNote
  },
  "site": *[_type == "siteSettings"][0]{ slackInviteUrl, conferenceMediaFolder }
}`);
