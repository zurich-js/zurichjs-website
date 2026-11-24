create table raffle_mail (
  key text primary key,
  entry_id uuid not null references raffle_entries(id),
  kind text not null check(kind in ('entry','winner','recovery')),
  nonce text,
  lease uuid,
  leased_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index raffle_mail_pending on raffle_mail(created_at) where sent_at is null;
create table raffle_management_grants (
  token_hash text primary key, entry_id uuid not null references raffle_entries(id)
);
create table raffle_claims (
  raffle_id uuid not null, seq int not null, decision text not null check(decision in ('claimed','expired')),
  actor text not null, at timestamptz not null default now(),
  primary key(raffle_id,seq), foreign key(raffle_id,seq) references raffle_draws(raffle_id,seq)
);
create table raffle_fulfilments (
  raffle_id uuid primary key, seq int not null, note text, at timestamptz not null default now(),
  foreign key(raffle_id,seq) references raffle_claims(raffle_id,seq)
);
