alter table raffles add column held_from text check(held_from in ('offered','ready','open','closed','drawn'));
update raffles r set held_from=(
  select e.payload->>'from' from raffle_events e
  where e.raffle_id=r.id and e.type='stage_changed' and e.payload->>'to'='on_hold'
  order by e.at desc,e.id desc limit 1
) where r.stage='on_hold';
