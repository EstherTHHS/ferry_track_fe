# src/hooks/

Shared hooks used across two or more features. Feature-only hooks stay inside the feature folder instead. TanStack Query/mutation hooks live in the `query/` and `mutation/` subdirectories.

Pattern: `src/hooks/<name>.ts` (or `.tsx` if it renders JSX), exporting `use<Name>` — e.g. `useSessionSlug.ts`
