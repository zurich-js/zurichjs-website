alter table payment_quotes add column plan_change jsonb;

create function keep_plan_offer() returns trigger language plpgsql as $$
begin
  if old.plan_change is not null and new.plan_change is distinct from old.plan_change then
    raise exception 'Plan offer terms are frozen';
  end if;
  return new;
end $$;
create trigger keep_plan_offer before update of plan_change on payment_quotes
for each row execute function keep_plan_offer();

create function freeze_plan_quote(offer jsonb, retry boolean)
returns table(current_quote jsonb, previous_quote jsonb, reused boolean)
language plpgsql as $$
declare frozen record; result payment_quotes;
begin
  perform id from sponsors where id=(offer->>'sponsorId')::uuid for update;
  if not exists (select 1 from payment_quotes where id=(offer->'planChange'->>'previousQuote')::uuid
    and sponsor_id=(offer->>'sponsorId')::uuid and status='accepted' and fee_choice='pass_through') then
    raise exception 'The current fee changed before the offer was saved.';
  end if;
  select * into strict frozen from freeze_payment_quote(offer,false);
  update payment_quotes set plan_change=offer->'planChange' where id=(frozen.current_quote->>'id')::uuid returning * into result;
  return query select to_jsonb(result), frozen.previous_quote, false;
end $$;
