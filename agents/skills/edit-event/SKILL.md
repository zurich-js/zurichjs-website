---
name: edit-event
description: Change an existing ZurichJS meetup in Sanity as a draft (venue, date or doors time, status such as full, postponed or cancelled, description, Meetup link, good-to-know lines, programme) and show exactly what changed. Use when someone says "change the venue of the next meetup", "it's full", "move it to 19:00", "cancel November".
---

# Edit event

1. **Find the event.** "The next meetup" means the soonest upcoming one. If two could match, ask which one. Never guess.
2. **Read it first,** so you know the current values and can show "before → after".
3. **Change only what was asked.** The URL slug never changes; that needs the owner.
4. **Status changes:**

   | Status      | Means                                    |
   | ----------- | ---------------------------------------- |
   | `full`      | RSVP closed, waitlist on Meetup          |
   | `postponed` | new date not known yet                   |
   | `cancelled` | the page says so, the event stays listed |
   | `rsvp-soon` | the Meetup link is not there yet         |

   Don't delete an event: cancel it.

5. **Venue changes:** set the name, street, postcode and city together. Reuse the exact spelling of a venue used before. Ask for directions if the entrance is unusual.
6. **Time changes:** times are Zurich local time, and the date stays unless the person says otherwise.
7. **Save as a draft, then show each changed field as before → after.** Mention anything the page still needs before publishing.
8. **A person publishes.** Publishing rebuilds the site in about 4 minutes. If the event is today, also say that people who already RSVP'd on Meetup need to hear about the change there.
