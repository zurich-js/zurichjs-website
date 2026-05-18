# ZurichJS Website

Next.js Pages Router site for ZurichJS events, workshops, speakers, partners, and community pages.

## Local Setup

Use the Node version pinned in `.nvmrc` and the package manager pinned in `package.json`.

```bash
nvm use
corepack enable
corepack prepare pnpm@11.1.1 --activate
pnpm install
```

The project expects Node `>=22 <23` and pnpm `11.x`.

## Environment Variables

Environment loading and validation are handled by Varlock with 1Password integration.

Local development expects:

- 1Password desktop app installed and unlocked
- 1Password CLI available as `op`
- 1Password CLI integration enabled in the desktop app
- `.env.local` containing the local Varlock/1Password references

See [docs/environment.md](docs/environment.md) for the full environment setup, vault structure, and CI/deployment notes.

## Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

Run these locally before pushing larger changes:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

`pnpm build` requires a working local environment because static generation reads Sanity and Varlock validates configured secrets.

## Project Notes

- Routing lives under `src/pages`.
- API routes live under `src/pages/api`.
- Shared Sanity queries live in `src/sanity/queries.ts`.
- Public read-only Sanity queries can use the CDN-backed `publicReadClient`.
- Admin/write/fresh-data paths should keep using the non-CDN `client`.
- Static/local data such as partners and workshop definitions lives under `src/data`.
