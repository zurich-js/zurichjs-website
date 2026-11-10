#!/usr/bin/env sh
# pnpm local (and local:studio): the Docker stack in docker-compose.yml, with payments in
# Stripe's test mode. `stripe listen` forwards the membership lifecycle events (the list the
# production endpoint gets) to http://localhost:4321/api/membership/webhook.
#
# Needs the Stripe CLI (brew install stripe/stripe-cli/stripe) and, in .env or .env.local:
#   STRIPE_SECRET_KEY=sk_test_…            the sandbox's secret key (Developers › API keys); a live key is refused
#   STRIPE_MEMBER_PORTAL_CONFIG=bpc_…      from: STRIPE_SECRET_KEY=sk_test_… pnpm membership:stripe-setup --apply
#   STRIPE_SUPPORT_PRODUCT_ID=prod_…       optional, for /donate
#
# Slack: with SLACK_APP_TOKEN (the dev app, slack/manifest.dev.yml) it also starts tools/slack-dev.mjs.
#
# Arguments go to `docker compose up`; COMPOSE_PROFILES=studio adds the Studio.
set -eu
cd "$(dirname "$0")/.."

# .env, then .env.local (which wins). Both are git-ignored.
for f in .env .env.local; do
  if [ -f "$f" ]; then
    set -a
    # shellcheck disable=SC1090
    . "./$f"
    set +a
  fi
done

case "${STRIPE_SECRET_KEY:-}" in
  sk_test_* | rk_test_*) ;;
  sk_live_* | rk_live_*)
    echo "STRIPE_SECRET_KEY (.env or .env.local) is a live key. Local runs use test mode only." >&2
    exit 1
    ;;
  *)
    echo "Put the Stripe sandbox's secret key (sk_test_…) in .env or .env.local as STRIPE_SECRET_KEY: Stripe dashboard › Developers › API keys." >&2
    exit 1
    ;;
esac
if [ -z "${STRIPE_MEMBER_PORTAL_CONFIG:-}" ]; then
  echo "Add STRIPE_MEMBER_PORTAL_CONFIG=bpc_… to .env or .env.local (pnpm membership:stripe-setup --apply prints it)." >&2
  exit 1
fi
command -v stripe > /dev/null || {
  echo "Install the Stripe CLI first: brew install stripe/stripe-cli/stripe" >&2
  exit 1
}

STRIPE_MEMBERSHIP_WEBHOOK_SECRET=$(stripe listen --api-key "$STRIPE_SECRET_KEY" --print-secret)
export STRIPE_SECRET_KEY STRIPE_MEMBER_PORTAL_CONFIG STRIPE_MEMBERSHIP_WEBHOOK_SECRET

# Members linked to the old Docker Stripe mock (cus_mock_…, sub_mock_…) would make Stripe answer
# "No such customer": unlink them, so their next checkout creates a real test customer.
docker compose up -d --wait db > /dev/null
docker compose exec -T db psql -q -U postgres -d zurichjs -c "do \$\$ begin
  if to_regclass('members') is not null then
    update members set stripe_customer_id = null, stripe_subscription_id = null
    where stripe_customer_id like 'cus\_mock\_%' or stripe_subscription_id like 'sub\_mock\_%';
  end if;
end \$\$;"

# One listener only: each extra one delivers every event again, at the same moment. The CLI is
# a Node wrapper around the stripe binary, so stopping the wrapper's PID alone leaves the binary
# running; match on the forward URL instead, before starting and on exit.
WEBHOOK=http://localhost:4321/api/membership/webhook
stop_listeners() {
  pkill -f "stripe listen.*--forward-to $WEBHOOK" 2> /dev/null || true
  pkill -f "node tools/slack-dev.mjs" 2> /dev/null || true
}
stop_listeners
trap stop_listeners EXIT INT TERM

EVENTS=checkout.session.completed,invoice.paid,invoice.payment_failed,invoice.payment_action_required,customer.subscription.updated,customer.subscription.deleted
stripe listen --api-key "$STRIPE_SECRET_KEY" --events "$EVENTS" --forward-to "$WEBHOOK" &

# The ZurichJS Bot (dev) in Socket Mode, when its tokens are set (docs/v2/AUTOMATION.md, "Try it locally").
if [ -n "${SLACK_APP_TOKEN:-}" ]; then
  node tools/slack-dev.mjs http://localhost:4321 &
else
  echo "Slack bot: off (add the dev app's SLACK_APP_TOKEN to .env to talk to it in Slack)."
fi

# --remove-orphans drops the old `stripe` mock container from earlier runs.
docker compose up --remove-orphans "$@"
