# Publish webhook → site rebuild

The V2 site is static, so publishing in the Studio must trigger a Netlify build. Set this up once in
**sanity.io/manage → project viqjrovw → API → Webhooks → Create webhook** (owner action):

| Setting | Value |
|---|---|
| Name | `Rebuild zurichjs.com` |
| URL | `https://<v2 site>/api/rebuild` (debounced, signature-checked) |
| Dataset | `production` |
| Trigger on | Create, Update, Delete |
| Filter | `_type in ["events", "talk", "speaker", "partner", "meetupRating", "conference", "siteSettings", "announcement"]` |
| Drafts | off (on only for the draft preview site's webhook) |
| Projection | `{_id, _type}` |
| HTTP method | POST |
| Secret | a random string, also set as `SANITY_WEBHOOK_SECRET` in Netlify |

With Drafts off, saving a draft never triggers a build; only publishing does. The draft preview site gets a second webhook with Drafts on. Several publishes within two minutes cause one build:
the `/api/rebuild` function debounces with Netlify Blobs (see zurichjs-website `docs/v2/RUNBOOK.md`). Requests without a valid signature, or signed more than 5 minutes ago, get a 401.
