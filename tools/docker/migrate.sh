#!/bin/sh
# Applies apps/web/netlify/database/migrations to the local Docker database, in file
# order, each once (recorded in local_migrations), each in one transaction. Netlify
# applies the same files on every deploy; this is only for the local database.
# Run by the `migrate` service in docker-compose.yml on every `docker compose up`.
set -eu
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
dir="${MIGRATIONS_DIR:-/migrations}"
psql -v ON_ERROR_STOP=1 -q -c "create table if not exists local_migrations (name text primary key, applied_at timestamptz not null default now())"
applied=0
for f in $(ls "$dir"/*.sql 2>/dev/null | sort); do
  name=$(basename "$f")
  if [ "$(psql -At -c "select 1 from local_migrations where name = '$name'")" = "1" ]; then continue; fi
  echo "applying $name"
  psql -v ON_ERROR_STOP=1 -q --single-transaction -f "$f" -c "insert into local_migrations (name) values ('$name')"
  applied=$((applied + 1))
done
echo "migrations: $applied applied, database up to date"
