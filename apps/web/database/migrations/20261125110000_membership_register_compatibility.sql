create or replace function member_update(p_id uuid, p_patch jsonb, p_actor_kind member_actor_kind, p_actor_id text)
returns members
language plpgsql as $$
declare
  m members;
  unknown text[];
begin
  select array_agg(k) into unknown from jsonb_object_keys(p_patch) k
  where k not in ('user_id', 'kind', 'name', 'organisation_name', 'level', 'cycle', 'category', 'paid_until', 'payment_mode', 'notes', 'joined_at', 'source',
                  'birth_date', 'street', 'postal_code', 'city', 'phone');
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
    source = case when p_patch ? 'source' then (p_patch->>'source')::member_source else source end,
    birth_date = case when p_patch ? 'birth_date' then (p_patch->>'birth_date')::date else birth_date end,
    street = case when p_patch ? 'street' then p_patch->>'street' else street end,
    postal_code = case when p_patch ? 'postal_code' then p_patch->>'postal_code' else postal_code end,
    city = case when p_patch ? 'city' then p_patch->>'city' else city end,
    phone = case when p_patch ? 'phone' then p_patch->>'phone' else phone end
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

create or replace function member_anonymise(p_id uuid, p_actor_id text, p_retention interval default interval '1 year')
returns void
language plpgsql as $$
declare
  m members;
begin
  if p_retention < interval '1 year' then
    raise exception 'member_retention_too_short' using errcode = 'P0001';
  end if;
  select * into m from members where id = p_id for update;
  if m.id is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if m.anonymised_at is not null then
    raise exception 'member_already_anonymised' using errcode = 'P0001';
  end if;
  if m.status <> 'ended' or m.ended_at > now() - p_retention then
    raise exception 'member_retention_not_reached' using errcode = 'P0001';
  end if;
  update members set
    email = 'anonymised-' || m.id || '@members.invalid',
    name = 'Anonymised',
    kind = 'person',
    organisation_name = null,
    notes = null,
    birth_date = null,
    street = null,
    postal_code = null,
    city = null,
    phone = null,
    user_id = null,
    stripe_customer_id = null,
    stripe_subscription_id = null,
    anonymised_at = now()
  where id = p_id;
  update certificates set name='Anonymised', organisation_name=null where member_id=p_id;
  if m.user_id is not null then
    delete from "user" where id = m.user_id;
  end if;
  insert into member_events (member_id, type, actor_kind, actor_id)
  values (p_id, 'anonymised', 'script', p_actor_id);
end;
$$;

create or replace function member_issue_certificate(p_id uuid, p_start date, p_end date, p_invoice text, p_actor_kind member_actor_kind, p_actor_id text)
returns certificates
language plpgsql as $$
declare
  c certificates;
  m members;
begin
  select * into m from members where id = p_id and anonymised_at is null for update;
  if m.id is null then
    perform member_missing_or_anonymised(p_id);
  end if;
  if p_invoice is not null then
    perform pg_advisory_xact_lock(hashtextextended('certificate:' || p_invoice, 0));
    select * into c from certificates where stripe_invoice_id = p_invoice;
    if c.id is not null then
      return c;
    end if;
  end if;
  insert into certificates (member_id, number, level, period_start, period_end, stripe_invoice_id, name, organisation_name)
  values (p_id, 'ZJS-' || extract(year from p_start)::int || '-' || lpad(nextval('certificate_number_seq')::text, 4, '0'), m.level, p_start, p_end, p_invoice, m.name, m.organisation_name)
  returning * into c;
  insert into member_events (member_id, type, actor_kind, actor_id, payload)
  values (p_id, 'certificate_issued', p_actor_kind, p_actor_id, jsonb_strip_nulls(jsonb_build_object('number', c.number, 'invoice', p_invoice)));
  return c;
end;
$$;

alter table member_deliveries add column sequence bigint generated always as identity;
