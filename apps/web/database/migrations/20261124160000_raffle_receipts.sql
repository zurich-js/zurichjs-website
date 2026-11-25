create unique index raffle_ledger_receipt_ref on raffle_ledger(kind,reference)
  where reference is not null and kind in ('payment','refund');

create table raffle_unmatched_payments (
  session_id text primary key, link_id text, quote_ref text, raffle_ref text,
  amount_minor bigint not null, currency text not null, recorded_at timestamptz not null default now()
);
