-- Invited by the board from the admin area (owner, 12th November 2026): someone asked to
-- join, the board chose their level and cycle, and they get an email to finish joining
-- (sign in, accept the terms, pay with Stripe). Their record is `pending` until then.
alter type member_source add value if not exists 'invited';
