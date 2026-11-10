#!/usr/bin/env sh
# pnpm local:stripe: the Docker stack (docker-compose.yml) with Stripe's test mode in place of the mock.
#
# Needs the Stripe CLI (https://docs.stripe.com/stripe-cli) and, in .env.local:
#   STRIPE_SECRET_KEY=sk_test_…            test mode only; a live key is refused
#   STRIPE_MEMBER_PORTAL_CONFIG=bpc_…      from: STRIPE_SECRET_KEY=sk_test_… pnpm membership:stripe-setup --apply
#   STRIPE_SUPPORT_PRODUCT_ID=prod_…       optional, for /donate
#
# `stripe listen` forwards the membership lifecycle events (the same list the production
# endpoint gets) to http://localhost:4321/api/membership/webhook. Real test cards work in
# Checkout, and `stripe trigger` or a test clock in the dashboard plays renewals and declines.
set -eu
cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
fi

case "${STRIPE_SECRET_KEY:-}" in
  sk_test_* | rk_test_*) ;;
  sk_live_* | rk_live_*)
    echo "STRIPE_SECRET_KEY in .env.local is a live key. Local runs use test mode only." >&2
    exit 1
    ;;
  *)
    echo "Put a test-mode STRIPE_SECRET_KEY (sk_test_…) in .env.local. Stripe dashboard › Developers › API keys, test mode." >&2
    exit 1
    ;;
esac
command -v stripe > /dev/null || {
  echo "Install the Stripe CLI first: brew install stripe/stripe-cli/stripe" >&2
  exit 1
}

EVENTS=checkout.session.completed,invoice.paid,invoice.payment_failed,invoice.payment_action_required,customer.subscription.updated,customer.subscription.deleted
STRIPE_MEMBERSHIP_WEBHOOK_SECRET=$(stripe listen --api-key "$STRIPE_SECRET_KEY" --print-secret)
export STRIPE_SECRET_KEY STRIPE_MEMBERSHIP_WEBHOOK_SECRET

stripe listen --api-key "$STRIPE_SECRET_KEY" --events "$EVENTS" --forward-to http://localhost:4321/api/membership/webhook &
LISTEN=$!
trap 'kill $LISTEN 2> /dev/null || true' EXIT INT TERM

docker compose -f docker-compose.yml -f docker-compose.stripe.yml up "$@"
