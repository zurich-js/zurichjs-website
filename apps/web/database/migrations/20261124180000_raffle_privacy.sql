alter table raffles
  add column notice_url text,
  add column retention_days int check (retention_days between 1 and 3650),
  add column erase_after timestamptz,
  add column erased_at timestamptz;

create function raffle_retention_clock() returns trigger language plpgsql as $$
begin
  if old.opened_at is not null and (new.notice_url,new.retention_days) is distinct from (old.notice_url,old.retention_days) then
    raise exception 'The approved notice and retention schedule are frozen.';
  end if;
  if new.stage in ('fulfilled','cancelled') and old.stage <> new.stage then
    new.erase_after := now() + make_interval(days => new.retention_days);
  end if;
  return new;
end $$;
create trigger raffle_retention_clock before update on raffles for each row execute function raffle_retention_clock();
create index raffle_retention_due on raffles(erase_after) where erased_at is null;
alter table raffle_entries add column notice_decision boolean;

create table raffle_deliveries (
  share_id uuid not null references raffle_shares(id),
  consent_id uuid not null references raffle_consents(id),
  delivered_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  primary key(share_id, consent_id)
);
