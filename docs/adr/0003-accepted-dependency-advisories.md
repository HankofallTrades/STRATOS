# Accepted dependency advisories — do not re-chase

After `npm audit fix`, roughly 14 advisories remain. All are dev-only or
non-exploitable in the shipped browser bundle, and none is fixable without a
breaking change. They are accepted deliberately; re-auditing them is wasted work.

- **`@vercel/node` chain** (`tar`, `undici`, `tsx`, `path-to-regexp`,
  `@vercel/nft`, `@mapbox/node-pre-gyp`, `ajv`, `@vercel/static-config`): a
  serverless-build toolchain pulled in solely for the two type imports in
  `api/coach.ts`. Even `@vercel/node@5` still ships these vulnerable transitives,
  so the only real fix is dropping the package — kept for deploy stability and
  standard typing.
- **`esbuild` / `vite`**: the esbuild advisory affects only the dev server
  (`npm run dev`). The fix is a `vite` 5→7 major with PWA and swc-plugin compat
  risk, deferred to its own pass.
- **`uuid`**: the advisory covers `v3`/`v5`/`v6` only; this app imports `v4`
  exclusively.

## Consequences

Revisit only when the `@vercel/node` dependency is dropped, or when the vite
major is taken on purpose. A new advisory outside this list is still worth
looking at.
