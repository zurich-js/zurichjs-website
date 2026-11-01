---
name: rating-refresh
description: Update the Meetup rating shown on the home page from text an organiser pastes from the Meetup group page. Never scrapes. Use when someone says the Meetup rating changed or pastes rating text.
---

# Rating refresh

The `meetupRating` record holds Meetup's public group score. There is no Meetup API access, and scraping is not allowed, so a person checks the page and pastes it.

1. **Get the rating text:** ask for it from https://www.meetup.com/zurich-js/, for example "4.9 (199 ratings)". Don't fetch the page yourself.
2. **Read the values:** `score` exactly as shown ("4.9") and `count` as a whole number. If either is unclear, ask.
3. **Update the draft** with `score` and `count`, set `checkedAt` to today (YYYY-MM-DD) and `source` to "Meetup group page, public snapshot". Keep `scale` as it is.
4. **Show the sentence the site will print:** "Rated <score> on Meetup from <count> ratings, and winner of …". Never "/5".
5. **To hide the rating,** clear `score`. The site then drops the rating and keeps the award.
6. **A person publishes,** in the Studio.
