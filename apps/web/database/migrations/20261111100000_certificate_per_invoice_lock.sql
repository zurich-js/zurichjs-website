-- One certificate per paid invoice, also when Stripe delivers the same invoice twice at the
-- same moment (it delivers at least once; two listeners locally do the same). Before, both
-- calls passed the "already issued?" check and the second insert failed on the unique
-- invoice id, so the webhook answered 500. A transaction-level lock on the invoice makes the
-- second call wait and then return the first one's certificate. A lock rather than
-- `on conflict do nothing`, because that would still take a number from the sequence and
-- leave a gap in the certificate numbers.
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
  insert into certificates (member_id, number, level, period_start, period_end, stripe_invoice_id)
  values (p_id, 'ZJS-' || extract(year from p_start)::int || '-' || lpad(nextval('certificate_number_seq')::text, 4, '0'), m.level, p_start, p_end, p_invoice)
  returning * into c;
  insert into member_events (member_id, type, actor_kind, actor_id, payload)
  values (p_id, 'certificate_issued', p_actor_kind, p_actor_id, jsonb_strip_nulls(jsonb_build_object('number', c.number, 'invoice', p_invoice)));
  return c;
end;
$$;
