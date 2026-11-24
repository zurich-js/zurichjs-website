alter table payment_quotes add column applying_by text;

create or replace function freeze_payment_quote(offer jsonb, retry boolean)
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
  if prior.applying_by is not null then raise exception 'The sponsor is confirming this offer. Retry after confirmation.'; end if;
  if prior.link_state = 'creating' then
    raise exception 'Payment link creation is in progress. Retry the same offer first.';
  end if;
  if prior.id is not null then
    update payment_quotes set status = 'superseded',
      link_state = case when link_state = 'live' then 'closing' else link_state end
      where id = prior.id returning * into prior;
  end if;
  insert into payment_quotes (sponsor_id,subject,subject_id,purpose,base_minor,surcharge_minor,total_minor,
      fee_choice,tariff_version,policy_version,formula,created_by,link_request_id,interval)
    values ((offer->>'sponsorId')::uuid,offer->>'subject',offer->>'subjectId',offer->>'purpose',
      (offer->>'baseMinor')::int,(offer->>'surchargeMinor')::int,(offer->>'totalMinor')::int,
      offer->>'feeChoice',offer->>'tariffVersion',offer->>'policyVersion',offer->>'formula',offer->>'createdBy',(offer->>'requestId')::uuid,offer->>'interval')
    returning * into fresh;
  if offer->'invitation' is not null then
    insert into sponsor_notices(sponsor_id,key,body) values (fresh.sponsor_id,'fee-invitation:' || fresh.id,offer->'invitation');
  end if;
  return query select to_jsonb(fresh), case when prior.id is not null then to_jsonb(prior) end, false;
end $$;

create function confirm_recurring_quote(quote uuid, contact text, item text)
returns setof payment_quotes language plpgsql as $$
declare current_quote payment_quotes;
begin
  perform id from sponsors where id = (select sponsor_id from payment_quotes where id = quote) for update;
  select * into current_quote from payment_quotes where id = quote and subject = 'sponsorship' and interval is not null for update;
  if not found then return; end if;
  if current_quote.status = 'accepted' then return next current_quote; return; end if;
  if current_quote.status <> 'open' or (current_quote.applying_by is not null and current_quote.applying_by <> contact) then return; end if;
  update payment_quotes set status = 'superseded'
    where sponsor_id = current_quote.sponsor_id and subject = 'sponsorship' and status = 'accepted';
  return query update payment_quotes set status = 'accepted', accepted_at = now(), accepted_by = contact,
    stripe_ref = item, applying_by = null where id = quote returning *;
end $$;
