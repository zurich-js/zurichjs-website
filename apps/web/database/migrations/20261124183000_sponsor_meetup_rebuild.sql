alter table sponsors add column meetup_rebuild_id uuid;
create index sponsors_meetup_rebuild_pending on sponsors (meetup_rebuild_id) where meetup_rebuild_id is not null;

-- A move, including a soft removal, owes the static site a rebuild in the same transaction.
create function mark_sponsor_meetup_rebuild() returns trigger language plpgsql as $$
declare
  before_id uuid;
  after_id uuid;
begin
  if tg_op <> 'INSERT' and to_jsonb(old)->>'removed_at' is null then before_id := old.sponsor_id; end if;
  if tg_op <> 'DELETE' and to_jsonb(new)->>'removed_at' is null then after_id := new.sponsor_id; end if;
  if before_id is not distinct from after_id and old.event_id is not distinct from new.event_id then return null; end if;
  update sponsors set meetup_rebuild_id = gen_random_uuid()
    where id in (before_id, after_id) and cycle = 'once' and status in ('active', 'past_due', 'ending');
  return null;
end;
$$;

create trigger sponsor_meetup_rebuild after insert or update or delete on sponsor_meetups
  for each row execute function mark_sponsor_meetup_rebuild();
