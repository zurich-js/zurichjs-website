alter table stripe_events add column lease uuid, add column prepared boolean not null default false;

create table member_deliveries (
  key text primary key,
  member_id uuid not null references members(id) on delete cascade,
  operation text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index member_deliveries_pending on member_deliveries(operation) where payload is not null;

create table member_checkout_attempts (
  member_id uuid primary key references members(id) on delete cascade,
  attempt jsonb not null
);

create function member_clear_payment_work() returns trigger language plpgsql as $$
begin
  delete from member_deliveries where member_id=new.id;
  delete from member_checkout_attempts where member_id=new.id;
  return new;
end $$;
create trigger member_clear_payment_work after update of anonymised_at on members
for each row when (old.anonymised_at is null and new.anonymised_at is not null)
execute function member_clear_payment_work();

create table member_invoice_outcomes (
  invoice text primary key,
  member_id uuid not null references members(id),
  subscription_id text not null,
  outcome text not null check (outcome in ('paid','failed'))
);
