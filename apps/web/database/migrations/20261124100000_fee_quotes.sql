-- Payment-processing fees (docs/domains/sponsorship/fees.md): card tariffs the board enters, and the
-- quote each board offer freezes (base, surcharge, total, who covers the fees, tariff and policy
-- versions, formula). Amounts are integer rappen. Tariffs are append-only; a quote's figures never
-- change, only its status moves forward (open → paid, superseded or void).

create table fee_tariffs (
  version text primary key check (version ~ '^[A-Za-z0-9._-]{1,40}$'),
  method text not null default 'card' check (method in ('card')),
  currency text not null default 'chf' check (currency in ('chf')),
  rate_ppm int not null check (rate_ppm between 0 and 100000),
  fixed_minor int not null check (fixed_minor between 0 and 1000),
  note text check (note is null or length(note) <= 500),
  entered_by text not null check (length(entered_by) between 1 and 200),
  entered_at timestamptz not null default now()
);

create function fee_tariffs_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'fee_tariffs is append-only' using errcode = 'P0001';
end $$;

create trigger fee_tariffs_no_change before update or delete on fee_tariffs
  for each row execute function fee_tariffs_append_only();

create table payment_quotes (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  subject text not null check (subject in ('sponsorship', 'raffle')),
  subject_id text check (subject_id is null or length(subject_id) between 1 and 100),
  purpose text not null check (length(purpose) between 1 and 300),
  currency text not null default 'chf' check (currency in ('chf')),
  base_minor int not null check (base_minor > 0),
  surcharge_minor int not null check (surcharge_minor >= 0),
  total_minor int not null,
  fee_choice text not null check (fee_choice in ('absorb', 'pass_through')),
  tariff_version text references fee_tariffs (version),
  policy_version text check (policy_version is null or length(policy_version) between 1 and 40),
  formula text not null check (formula in ('none', 'gross-up-v1')),
  status text not null default 'open' check (status in ('open', 'paid', 'superseded', 'void')),
  created_by text not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  stripe_ref text,
  constraint quote_total check (total_minor = base_minor + surcharge_minor),
  constraint quote_choice check (
    (fee_choice = 'absorb' and surcharge_minor = 0 and tariff_version is null and policy_version is null and formula = 'none')
    or (fee_choice = 'pass_through' and tariff_version is not null and policy_version is not null and formula <> 'none')),
  constraint quote_paid check ((status = 'paid') = (paid_at is not null))
);

-- One open quote per thing being paid for.
create unique index payment_quotes_open_idx on payment_quotes (sponsor_id, subject, coalesce(subject_id, '')) where status = 'open';
create index payment_quotes_sponsor_idx on payment_quotes (sponsor_id, created_at desc);

-- Figures are frozen; the status only moves forward.
create function payment_quotes_frozen() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'payment_quotes rows are kept' using errcode = 'P0001';
  end if;
  if (new.sponsor_id, new.subject, new.subject_id, new.purpose, new.currency, new.base_minor, new.surcharge_minor, new.total_minor,
      new.fee_choice, new.tariff_version, new.policy_version, new.formula, new.created_by, new.created_at)
     is distinct from
     (old.sponsor_id, old.subject, old.subject_id, old.purpose, old.currency, old.base_minor, old.surcharge_minor, old.total_minor,
      old.fee_choice, old.tariff_version, old.policy_version, old.formula, old.created_by, old.created_at) then
    raise exception 'a quote''s figures are frozen' using errcode = 'P0001';
  end if;
  if old.status = 'paid' or (old.status in ('superseded', 'void') and new.status <> 'paid') then
    if new.status is distinct from old.status or new.paid_at is distinct from old.paid_at or new.stripe_ref is distinct from old.stripe_ref then
      raise exception 'a quote''s status only moves forward' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger payment_quotes_frozen before update or delete on payment_quotes
  for each row execute function payment_quotes_frozen();
