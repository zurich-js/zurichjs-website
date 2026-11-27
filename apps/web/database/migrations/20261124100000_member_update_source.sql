
create or replace function member_update(p_id uuid, p_patch jsonb, p_actor_kind member_actor_kind, p_actor_id text)
returns members
language plpgsql as $$
declare
  m members;
  unknown text[];
begin
  select array_agg(k) into unknown from jsonb_object_keys(p_patch) k
  where k not in ('user_id', 'kind', 'name', 'organisation_name', 'level', 'cycle', 'category', 'paid_until', 'payment_mode', 'notes', 'joined_at', 'source');
  if unknown is not null then
    raise exception 'member_update cannot change %', array_to_string(unknown, ', ') using errcode = 'P0001';
  end if;
  update members set
    user_id = case when p_patch ? 'user_id' then p_patch->>'user_id' else user_id end,
    kind = case when p_patch ? 'kind' then (p_patch->>'kind')::member_kind else kind end,
    name = case when p_patch ? 'name' then p_patch->>'name' else name end,
    organisation_name = case when p_patch ? 'organisation_name' then p_patch->>'organisation_name' else organisation_name end,
    level = case when p_patch ? 'level' then (p_patch->>'level')::member_level else level end,
    cycle = case when p_patch ? 'cycle' then (p_patch->>'cycle')::member_cycle else cycle end,
    category = case when p_patch ? 'category' then (p_patch->>'category')::member_category else category end,
    paid_until = case when p_patch ? 'paid_until' then (p_patch->>'paid_until')::date else paid_until end,
    payment_mode = case when p_patch ? 'payment_mode' then (p_patch->>'payment_mode')::member_payment_mode else payment_mode end,
    notes = case when p_patch ? 'notes' then p_patch->>'notes' else notes end,
    joined_at = case when p_patch ? 'joined_at' then (p_patch->>'joined_at')::date else joined_at end,
    source = case when p_patch ? 'source' then (p_patch->>'source')::member_source else source end
  where id = p_id and anonymised_at is null
  returning * into m;
  if m.id is null then
    perform member_missing_or_anonymised(p_id);
  end if;
  insert into member_events (member_id, type, actor_kind, actor_id, payload)
  values (m.id, 'updated', p_actor_kind, p_actor_id, jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p_patch) k)));
  return m;
end;
$$;
