# Publish webhook → site rebuild

The V2 site is static, so publishing in the Studio must trigger a Netlify build. Set this up once in
**sanity.io/manage → project viqjrovw → API → Webhooks → Create webhook** (owner action):

| Setting | Value |
|---|---|
| Name | `Rebuild zurichjs.com` |
| URL | `https://<v2 site>.netlify.app/api/rebuild` (debounced function from Phase 4), or the Netlify build hook URL directly |
| Dataset | `production` |
| Trigger on | Create, Update, Delete |
| Filter | `_type in ["events", "talk", "speaker", "partner", "meetupRating", "conference", "siteSettings", "announcement"] && !(_id in path("drafts.**"))` |
| Projection | `{_id, _type}` |
| HTTP method | POST |
| Secret | a random string, also set as `SANITY_WEBHOOK_SECRET` in Netlify |

Drafts never trigger builds (the filter excludes `drafts.**`). Several publishes within two minutes cause one build:
the `/api/rebuild` function debounces with Netlify Blobs (see zurichjs-website `docs/v2/RUNBOOK.md`).
