# The local stack for zurichjs.com (docs/systems/local-development.md). `just` lists the recipes.
#
# Every recipe that needs settings goes through varlock, which reads .env.schema, .env and
# .env.local, resolves 1Password references on your machine and checks each value first.

# List the recipes
default:
    @just --list --unsorted

# Start the site, database, Mailpit, Stripe test mode and the Slack bridge; returns when the site answers
up *ARGS:
    just compose up -d --wait --remove-orphans {{ ARGS }}
    @just urls

# The same, plus the Sanity Studio on http://localhost:3333
studio *ARGS:
    COMPOSE_PROFILES=studio just compose up -d --wait --remove-orphans {{ ARGS }}
    @just urls

# Follow the logs (all services, or the ones you name: `just logs web stripe`)
logs *SERVICES:
    docker compose logs -f --tail 100 {{ SERVICES }}

# What is running
ps:
    docker compose --profile '*' ps -a

# Stop; the local database and the installs are kept
down:
    docker compose --profile '*' down --remove-orphans

# Stop and delete the local database, the Mailpit inbox and the container installs
reset:
    docker compose --profile '*' down --remove-orphans -v

# Resolve and check the environment without starting anything (secrets are masked)
env:
    pnpm exec varlock load

# Run any command with the checked environment: `just run pnpm membership:stripe-setup --apply`
run +CMD:
    pnpm exec varlock run -- {{ CMD }}

# docker compose with the checked environment: `just compose restart web`
compose *ARGS:
    #!/usr/bin/env sh
    set -eu
    # The Slack bridge runs only when a dev app's token is set (the `slack` profile in docker-compose.yml).
    exec pnpm exec varlock run -- sh -c '
      if [ -n "${SLACK_APP_TOKEN:-}${SLACK_CFP_APP_TOKEN:-}" ]; then
        export COMPOSE_PROFILES="${COMPOSE_PROFILES:+$COMPOSE_PROFILES,}slack"
      else
        echo "Slack bots: off (set SLACK_APP_TOKEN or SLACK_CFP_APP_TOKEN of a dev app in .env.local to talk to them in Slack)."
      fi
      exec docker compose "$@"
    ' compose {{ ARGS }}

[private]
urls:
    @echo ""
    @echo "  http://localhost:4321         the site"
    @echo "  http://localhost:4321/admin   the admin area"
    @echo "  http://localhost:8025         Mailpit, every email the site sends"
    @echo "  localhost:54322               Postgres (postgres / postgres, database zurichjs)"
    @echo ""
    @echo "  just logs   follow the logs        just down   stop"
