-- Recurring fee quotes (docs/domains/sponsorship/fees.md): a quote for a recurring sponsorship names
-- its billing interval, and is `accepted` once the sponsor agreed to it (at Checkout, or by confirming
-- a change on a running sponsorship). An accepted quote stays in force for every renewal until a
-- newer accepted quote supersedes it. `stripe_ref` holds the subscription item of the surcharge line.

alter table payment_quotes
  add column interval text check (interval is null or interval in ('month', 'quarter', 'year')),
  add column accepted_at timestamptz,
  add column accepted_by text check (accepted_by is null or length(accepted_by) between 1 and 200);

alter table payment_quotes drop constraint payment_quotes_status_check;
alter table payment_quotes add constraint payment_quotes_status_check check (status in ('open', 'accepted', 'paid', 'superseded', 'void'));
alter table payment_quotes add constraint quote_accepted check (status <> 'accepted' or (accepted_at is not null and interval is not null));

-- One quote in force per sponsorship.
create unique index payment_quotes_accepted_idx on payment_quotes (sponsor_id, subject, coalesce(subject_id, '')) where status = 'accepted';

create or replace function payment_quotes_frozen() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'payment_quotes rows are kept' using errcode = 'P0001';
  end if;
  if (new.sponsor_id, new.subject, new.subject_id, new.purpose, new.currency, new.base_minor, new.surcharge_minor, new.total_minor,
      new.fee_choice, new.tariff_version, new.policy_version, new.formula, new.created_by, new.created_at, new.interval)
     is distinct from
     (old.sponsor_id, old.subject, old.subject_id, old.purpose, old.currency, old.base_minor, old.surcharge_minor, old.total_minor,
      old.fee_choice, old.tariff_version, old.policy_version, old.formula, old.created_by, old.created_at, old.interval) then
    raise exception 'a quote''s figures are frozen' using errcode = 'P0001';
  end if;
  -- Forward only: open → accepted, paid, superseded or void; accepted → superseded; superseded or void → paid (a stale page paid).
  if new.status is distinct from old.status and not (
       (old.status = 'open')
    or (old.status = 'accepted' and new.status = 'superseded')
    or (old.status in ('superseded', 'void') and new.status = 'paid')) then
    raise exception 'a quote''s status only moves forward' using errcode = 'P0001';
  end if;
  if old.status = 'paid' and (new.paid_at is distinct from old.paid_at or new.stripe_ref is distinct from old.stripe_ref) then
    raise exception 'a quote''s status only moves forward' using errcode = 'P0001';
  end if;
  if old.accepted_at is not null and (new.accepted_at is distinct from old.accepted_at or new.accepted_by is distinct from old.accepted_by) then
    raise exception 'a quote''s acceptance is kept' using errcode = 'P0001';
  end if;
  return new;
end $$;
