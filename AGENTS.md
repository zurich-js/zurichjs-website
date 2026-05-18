# AGENTS.md

Guidance for coding agents working in this repository.

## Runtime

- Use `nvm use` before running Node-based commands.
- Use Corepack and pnpm, not npm or bun.
- The package manager is pinned in `package.json`: `pnpm@11.1.1`.
- The supported Node range is `>=22 <23`; `.nvmrc` currently pins `v22.17.1`.

Recommended local setup:

```bash
nvm use
corepack enable
corepack prepare pnpm@11.1.1 --activate
pnpm install
```

## Environment

- Env validation is handled by Varlock.
- Local secrets are resolved through the 1Password desktop app and CLI integration.
- Do not print `.env.local` or secret values.
- Use `docs/environment.md` for setup details.
- In CI/deployments, secrets should resolve through `OP_SERVICE_ACCOUNT_TOKEN`, not the desktop app.

## Commands

Safe checks for agents:

```bash
pnpm exec tsc --noEmit
pnpm exec oxlint <changed files>
```

Do not run `pnpm build` from an agent session unless the user explicitly asks for it. The user runs production builds locally with their nvm/Corepack/pnpm setup and working 1Password environment.

## Data Fetching

- This is a Next.js Pages Router app under `src/pages`.
- Prefer `getStaticProps` with ISR for public marketing/community pages when request-time personalization is not required.
- Keep homepage and listing queries narrow; avoid fetching full speaker/talk/event graphs for above-the-fold content.
- Use `publicReadClient` for public, published, read-only Sanity data that can be served from Sanity CDN.
- Use `client` for admin, writes, token-backed reads, or freshness-sensitive operations.

## Editing

- Keep changes scoped to the requested behavior.
- Do not revert unrelated user changes.
- Use `apply_patch` for manual edits.
- Prefer existing components and local patterns over introducing new dependencies.
