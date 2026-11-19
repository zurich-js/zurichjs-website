-- Enthusiast and Advocate (bylaws Art. 4), added by the owner on 19th November 2026, after
-- Supporter so the enum order matches the level order in packages/membership/src/levels.ts.
alter type member_level add value if not exists 'enthusiast' after 'supporter';
alter type member_level add value if not exists 'advocate' after 'enthusiast';
