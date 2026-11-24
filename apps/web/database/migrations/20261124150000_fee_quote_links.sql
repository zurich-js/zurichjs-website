-- A quote owns its payment link, and every payment against a quote is recorded by its Stripe
-- session (docs/domains/sponsorship/fees.md, "Payment links" and "Payments").

alter table payment_quotes
  add column link_state text not null default 'none' check (link_state in ('none', 'creating', 'live', 'closing', 'closed')),
  add column link_id text check (link_id is null or length(link_id) between 1 and 100),
  add column link_url text check (link_url is null or link_url like 'https://%'),
  add constraint quote_link_live check (link_state <> 'live' or (link_id is not null and link_url is not null));

-- A link belongs to one quote, so an old link still maps to the quote it was made for.
create unique index payment_quotes_link_idx on payment_quotes (link_id) where link_id is not null;

-- Quotes made before this migration had their link on the sponsor only.
update payment_quotes q set link_state = 'live', link_id = s.payment_link_id, link_url = s.payment_link_url
from sponsors s
where q.sponsor_id = s.id and q.status = 'open' and q.subject = 'sponsorship' and s.payment_link_id is not null and s.payment_link_url like 'https://%';

create table quote_payments (
  session_id text primary key check (length(session_id) between 1 and 200),
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  subject text not null check (subject in ('sponsorship', 'raffle')),
  subject_id text check (subject_id is null or length(subject_id) between 1 and 100),
  quote_id uuid references payment_quotes (id),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  amount_minor int not null check (amount_minor >= 0),
  payment_link_id text,
  payment_intent_id text,
  outcome text not null check (outcome in ('matched', 'unquoted', 'review')),
  reason text check (reason is null or length(reason) <= 300),
  fee_minor int check (fee_minor is null or fee_minor >= 0),
  net_minor int,
  fee_checked_at timestamptz,
  resolution text check (resolution is null or resolution in ('accepted', 'dismissed')),
  resolved_by text,
  resolved_at timestamptz,
  resolution_note text check (resolution_note is null or length(resolution_note) <= 500),
  received_at timestamptz not null default now(),
  constraint quote_payment_review check (outcome = 'review' or resolution is null),
  constraint quote_payment_resolved check ((resolution is null) = (resolved_at is null)),
  constraint quote_payment_fee check ((fee_minor is null) = (net_minor is null))
);

create index quote_payments_sponsor_idx on quote_payments (sponsor_id, received_at desc);
create index quote_payments_review_idx on quote_payments (sponsor_id) where outcome = 'review' and resolution is null;
create index quote_payments_fee_idx on quote_payments (received_at) where fee_minor is null and payment_intent_id is not null;

alter table payment_quotes add column link_request_id uuid;
create unique index payment_quote_request_idx on payment_quotes(sponsor_id,link_request_id) where link_request_id is not null;

create function freeze_payment_quote(offer jsonb, retry boolean)
returns table(current_quote jsonb, previous_quote jsonb, reused boolean)
language plpgsql as $$
declare
  prior payment_quotes;
  fresh payment_quotes;
begin
  perform id from sponsors where id = (offer->>'sponsorId')::uuid for update;
  if offer->>'requestId' is not null then
    select * into prior from payment_quotes where sponsor_id=(offer->>'sponsorId')::uuid and link_request_id=(offer->>'requestId')::uuid;
    if found then
      if prior.status <> 'open' or (prior.base_minor,prior.fee_choice,prior.total_minor,prior.tariff_version,prior.policy_version,prior.purpose)
        is distinct from ((offer->>'baseMinor')::int,offer->>'feeChoice',(offer->>'totalMinor')::int,offer->>'tariffVersion',offer->>'policyVersion',offer->>'purpose') then
        raise exception 'This payment link request has been replaced.';
      end if;
      return query select to_jsonb(prior), null::jsonb, true;
      return;
    end if;
  end if;
  select * into prior from payment_quotes
   where sponsor_id = (offer->>'sponsorId')::uuid and subject = offer->>'subject'
     and subject_id is not distinct from (offer->>'subjectId') and status = 'open' for update;
  if retry and prior.link_state in ('none','creating')
     and (prior.purpose,prior.base_minor,prior.surcharge_minor,prior.fee_choice,prior.tariff_version,prior.policy_version)
     is not distinct from (offer->>'purpose',(offer->>'baseMinor')::int,(offer->>'surchargeMinor')::int,
                           offer->>'feeChoice',offer->>'tariffVersion',offer->>'policyVersion') then
    return query select to_jsonb(prior), null::jsonb, true;
    return;
  end if;
  if prior.link_state = 'creating' then
    raise exception 'Payment link creation is in progress. Retry the same offer first.';
  end if;
  if prior.id is not null then
    update payment_quotes set status = 'superseded',
      link_state = case when link_state = 'live' then 'closing' else link_state end
      where id = prior.id returning * into prior;
  end if;
  insert into payment_quotes (sponsor_id,subject,subject_id,purpose,base_minor,surcharge_minor,total_minor,
      fee_choice,tariff_version,policy_version,formula,created_by,link_request_id)
    values ((offer->>'sponsorId')::uuid,offer->>'subject',offer->>'subjectId',offer->>'purpose',
      (offer->>'baseMinor')::int,(offer->>'surchargeMinor')::int,(offer->>'totalMinor')::int,
      offer->>'feeChoice',offer->>'tariffVersion',offer->>'policyVersion',offer->>'formula',offer->>'createdBy',(offer->>'requestId')::uuid)
    returning * into fresh;
  return query select to_jsonb(fresh), case when prior.id is not null then to_jsonb(prior) end, false;
end $$;
