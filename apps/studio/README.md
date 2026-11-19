# ZurichJS Sanity Studio

The Sanity Studio for zurichjs.com (Sanity 6, project `viqjrovw`, dataset `production`). It lives in the website's pnpm workspace as `@zurichjs/studio`.

```bash
pnpm install                                            # from the repository root
pnpm --filter @zurichjs/studio dev                      # http://localhost:3333 (or `pnpm local:studio`, in Docker)
pnpm --filter @zurichjs/studio exec sanity build --yes  # the build CI runs
pnpm --filter @zurichjs/studio typegen                  # schema.json and packages/content/src/sanity.types.ts
```

After changing the schema or a query in `packages/content/src/queries.ts`, run typegen and commit `packages/content/src/sanity.types.ts` and `apps/studio/schema.json`. The Studio deploys itself when changes under `apps/studio` reach `main`; never run `sanity deploy` by hand.

Everything else (the editor workspace, migrations and content scripts, deploys, the publish webhook) is in [the Studio concept](../../docs/systems/studio.md). Field shapes are in the [events](../../docs/domains/events/content-model.md) and [content](../../docs/domains/content/content-model.md) content models.
