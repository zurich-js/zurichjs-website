# UI primitives

Every visual variant (size, intent, state, invalid, disabled) is defined once here, in a cva recipe that the Astro component and the Preact island both import. Pages and feature components compose these primitives and only add layout. Rules: `AGENTS.md`, "UI and design system rules". Plan and primitive list: `docs/v2/UI-AUDIT.md`.

Until a primitive has moved here, it lives in `packages/design/src/components`, `packages/design/src/islands` or `packages/design/src/recipes.ts`.
