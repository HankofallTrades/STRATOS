# The Coach API base is build-time, and its CORS allowlist is never wildcarded

The iOS wrap bundles web assets into the binary, so the app runs on
`capacitor://localhost` with no same-origin `/api`. A relative `/api/coach`
resolves to the app's own scheme and never leaves the device. The Coach is the
only thing the wrap calls over the network, and two halves must agree:

- **Client.** `resolveCoachApiUrl` (`agent/apiBase.ts`) returns the relative path
  when no base is configured, an absolute URL when one is. `vite.config.ts`
  supplies it: empty for web, so its request stays same-origin and unchanged, and
  the **stable production alias** (not a per-deployment URL) for `build:ios`, so
  the binary survives redeploys of `main`. `VITE_COACH_API_BASE_URL` overrides.
- **Server.** `agent/cors.ts` holds the allowlist, `api/coach.ts` applies it —
  answering the `OPTIONS` preflight and echoing the granted origin.
  `capacitor://localhost` is always allowed; `COACH_ALLOWED_ORIGINS` adds more.

## Consequences

- **Never widen the allowlist to `*`.** The request body carries the caller's
  Supabase access token and their BYOK provider key.
- The client substitution is build-time text replacement, so `transport.ts` must
  reference `import.meta.env.VITE_COACH_API_BASE_URL` as one whole static
  expression. Passing `import.meta.env` wholesale (as the Supabase config reader
  does) defers the lookup to runtime and silently yields the relative path in the
  native bundle — a wrap that cannot reach the Coach, with no error at build time.
  To check a build, grep `dist/assets` for `VITE_COACH_API_BASE_URL:`: web shows
  `""`, iOS shows the absolute origin.
- The Coach dev middleware in `vite.config.ts` has no CORS handling and needs
  none — the web target is same-origin, and a wrap cannot point at it anyway
  because iOS App Transport Security blocks the cleartext `http://localhost` it
  serves. Verify the wrap's Coach against a deployed https origin, not `npm run dev`.
- BYOK provider keys live in `localStorage` (`data/providerKeyStore.ts`), the same
  store the Supabase session uses, so they survive an app kill for the same reason.
