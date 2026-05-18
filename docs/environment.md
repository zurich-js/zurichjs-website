# Environment configuration

This project uses Varlock for environment loading and validation, with 1Password as the shared secret store.

## Local development

Local development reads secrets from the 1Password desktop app through the 1Password CLI. Make sure:

1. `op --version` works.
2. `op vault list` works.
3. The 1Password desktop app is installed and unlocked.
4. 1Password app settings have developer/CLI integration enabled.
5. Your 1Password account has access to the shared ZurichJS vault.

The current ZurichJS vault id is:

```txt
areabvi5arolulsuqzrg6rfy3m
```

Use the item id from 1Password's "Copy Secret Reference" output for the target environment item.

## Vault structure

Use vault items as namespaces. Recommended item names:

```txt
zurichjs-website/development
zurichjs-website/preview
zurichjs-website/production
```

Each item should contain one field per environment variable:

```txt
CLERK_SECRET_KEY
JWT_SECRET
ZURICHJS_ADMIN_ORG_ID
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
SANITY_TOKEN
STRIPE_SECRET_KEY
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
GOOGLE_MAPS_API_KEY
IMAGEKIT_PRIVATE_KEY
PUSHOVER_TOKEN
PUSHOVER_USER
SLACK_BOT_TOKEN
SLACK_DEFAULT_CHANNEL
EMAIL_OCTOPUS_API_KEY
EMAIL_OCTOPUS_LIST_ID
```

Public or non-secret values can either live in 1Password for consistency or stay as literal values in `.env.local`.

## `.env.local`

Use `.env.local` to point project variables at 1Password secret references:

```sh
CLERK_SECRET_KEY=op("op://areabvi5arolulsuqzrg6rfy3m/<item-id>/CLERK_SECRET_KEY")
SANITY_TOKEN=op("op://areabvi5arolulsuqzrg6rfy3m/<item-id>/SANITY_TOKEN")
GOOGLE_MAPS_API_KEY=op("op://areabvi5arolulsuqzrg6rfy3m/<item-id>/GOOGLE_MAPS_API_KEY")
```

Prefer 1Password's "Copy Secret Reference" action for each field instead of hand-writing references. Paste that reference inside `op(...)`.

## CI and deploys

CI/deployed environments should not depend on a local 1Password desktop app. Use a 1Password service account token:

```sh
OP_SERVICE_ACCOUNT_TOKEN=ops_...
```

`OP_SERVICE_ACCOUNT_TOKEN` should be set in the CI/deployment platform, not committed. The same `op(op://...)` references can then resolve without desktop-app auth.

GitHub Actions loads CI variables with [1Password's `load-secrets-action`](https://github.com/marketplace/actions/load-secrets-from-1password). Add this repository secret in GitHub:

```txt
OP_SERVICE_ACCOUNT_TOKEN
```

The workflow reads references from [.github/1password.env.tpl](../.github/1password.env.tpl). That file contains only `op://` references, not raw secret values.
