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
tmmfnpw44donfysxwyb5v6s4y4
```

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
SANITY_TOKEN
STRIPE_SECRET_KEY
GOOGLE_MAPS_API_KEY
IMAGEKIT_PRIVATE_KEY
PUSHOVER_TOKEN
PUSHOVER_USER
SLACK_BOT_TOKEN
EMAIL_OCTOPUS_API_KEY
JWT_SECRET
```

Public or non-secret values can either live in 1Password for consistency or stay as literal values in `.env.local`.

## `.env.local`

Use `.env.local` to point project variables at 1Password secret references:

```sh
CLERK_SECRET_KEY=op(op://tmmfnpw44donfysxwyb5v6s4y4/zurichjs-website%2Fdevelopment/CLERK_SECRET_KEY)
SANITY_TOKEN=op(op://tmmfnpw44donfysxwyb5v6s4y4/zurichjs-website%2Fdevelopment/SANITY_TOKEN)
GOOGLE_MAPS_API_KEY=op(op://tmmfnpw44donfysxwyb5v6s4y4/zurichjs-website%2Fdevelopment/GOOGLE_MAPS_API_KEY)
```

Prefer 1Password's "Copy Secret Reference" action for each field instead of hand-writing references. Paste that reference inside `op(...)`.

## CI and deploys

CI/deployed environments should not depend on a local 1Password desktop app. Use a 1Password service account token:

```sh
OP_SERVICE_ACCOUNT_TOKEN=ops_...
```

`OP_SERVICE_ACCOUNT_TOKEN` should be set in the CI/deployment platform, not committed. The same `op(op://...)` references can then resolve without desktop-app auth.
