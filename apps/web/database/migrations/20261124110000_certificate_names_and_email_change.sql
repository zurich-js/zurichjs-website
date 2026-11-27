
alter table certificates add column name text, add column organisation_name text;
update certificates c set name = m.name, organisation_name = m.organisation_name from members m where m.id = c.member_id;
alter table certificates
  alter column name set not null,
  add constraint certificates_name_length check (length(name) between 1 and 200),
  add constraint certificates_organisation_name_length check (organisation_name is null or length(organisation_name) between 1 and 200);

create or replace function member_issue_certificate(p_id uuid, p_start date, p_end date, p_invoice text, p_actor_kind member_actor_kind, p_actor_id text)
returns certificates
language plpgsql as $$
declare
  c certificates;
  m members;
begin
  if p_invoice is not null then
    perform pg_advisory_xact_lock(hashtextextended('certificate:' || p_invoice, 0));
    select * into c from certificates where stripe_invoice_id = p_invoice;
    if c.id is not null then
      return c;
    end if;
  end if;
  select * into m from members where id = p_id and anonymised_at is null;
  if m.id is null then
    perform member_missing_or_anonymised(p_id);
  end if;
  insert into certificates (member_id, number, level, period_start, period_end, stripe_invoice_id, name, organisation_name)
  values (p_id, 'ZJS-' || extract(year from p_start)::int || '-' || lpad(nextval('certificate_number_seq')::text, 4, '0'), m.level, p_start, p_end, p_invoice, m.name, m.organisation_name)
  returning * into c;
  insert into member_events (member_id, type, actor_kind, actor_id, payload)
  values (p_id, 'certificate_issued', p_actor_kind, p_actor_id, jsonb_strip_nulls(jsonb_build_object('number', c.number, 'invoice', p_invoice)));
  return c;
end;
$$;

create function member_change_email(p_id uuid, p_email citext, p_actor_kind member_actor_kind, p_actor_id text)
returns members
language plpgsql as $$
declare
  m members;
  previous citext;
begin
  select email into previous from members where id = p_id and anonymised_at is null for update;
  if previous is null then
    perform member_missing_or_anonymised(p_id);
  end if;
  update members set email = p_email, user_id = null where id = p_id returning * into m;
  insert into member_events (member_id, type, actor_kind, actor_id)
  values (m.id, 'email_changed', p_actor_kind, p_actor_id);
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
    user_id = null,
    stripe_customer_id = null,
    stripe_subscription_id = null,
    anonymised_at = now()
  where id = p_id;
  update certificates set name = 'Anonymised', organisation_name = null where member_id = p_id;
  if m.user_id is not null then
    delete from "user" where id = m.user_id;
  end if;
  insert into member_events (member_id, type, actor_kind, actor_id)
  values (p_id, 'anonymised', 'script', p_actor_id);
end;
$$;
