# STRATOS

STRATOS is a personal operating system for training, recovery, and daily execution. The current product center is fitness: workouts, analytics, nutrition, sunlight, and an AI coach. Habits, goals, and broader life-OS pieces are in progress.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Redux Toolkit + React Query
- Supabase Auth + Postgres
- Vercel-style serverless endpoint for Coach

## Local Development

### Prerequisites

- Node.js 20+
- npm
- Docker Desktop or another running Docker daemon

### 1. Install dependencies

```sh
npm install
```

### 2. Start local Supabase

```sh
npm run supabase:start
```

This repo is configured for local Supabase development. Docker is required for this step.

### 3. Create `.env.local`

Start from the example file:

```sh
cp .env.example .env.local
```

Then run:

```sh
npm run supabase:status
```

Copy the `API_URL` value into `VITE_SUPABASE_URL` and the `ANON_KEY` value into `VITE_SUPABASE_ANON_KEY`.
Copy the `SERVICE_ROLE_KEY` value into `SUPABASE_SERVICE_ROLE_KEY`.
Set `USER_SECRET_ENCRYPTION_KEY` to a long random secret used only by the server.

Important:

- `VITE_*` variables are shipped to the browser. Only put public values there.
- Service-role keys, personal access tokens, and similar shared secrets must stay server-side and must not use the `VITE_` prefix.

### 4. Apply migrations

```sh
npm run supabase:reset
```

There is currently no demo seed file. You will create your own local account and data.

### 5. Start the app

```sh
npm run dev
```

The app runs at [http://localhost:8080](http://localhost:8080).

The login screen exposes email signup by default so you can create an account directly.

## Coach Setup

The app runs without a hosted AI provider, but the Coach screen needs one of these:

- Local model runtime:
  Set `VITE_LLM_PROVIDER=local` and `LOCAL_LLM_URL=http://127.0.0.1:11434/v1/chat/completions`
- Hosted BYOK providers:
  Set `VITE_LLM_PROVIDER` to `openrouter`, `openai`, `anthropic`, or `google`, then paste your own provider API key into Settings after you log in.

Hosted-provider keys are user-provided for Coach, sent to the server once on save, encrypted at rest in Supabase, and decrypted only inside the Coach server runtime when a request needs them.

## Project Structure

```
src/
├── domains/              # Feature-first organization
│   └── <domain>/
│       ├── ui/           # Domain components and screens
│       ├── hooks/        # React orchestration for the domain
│       ├── data/         # Repositories, types, pure domain logic
│       └── index.ts      # Domain public surface
├── components/
│   ├── core/             # Shared UI primitives
│   └── layout/           # Global shell/navigation components
├── hooks/                # Shared app-level hooks
├── lib/                  # Cross-domain utilities and integrations
├── pages/                # Thin route-level composition
├── state/                # Redux store and slices
└── main.tsx              # Application entry point
```

The codebase is currently migrating from older `view/controller/model` naming to `ui/hooks/data`. The rename is complete; tightening the actual boundaries is the next phase.

## Development Commands

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint
- `npm run supabase:start` — Start local Supabase services
- `npm run supabase:stop` — Stop local Supabase services
- `npm run supabase:reset` — Rebuild the local database from migrations
- `npm run supabase:status` — Print local Supabase URLs and keys

## Security Notes

- The current app only needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on the client.
- Shared private keys must stay server-side.
- Coach BYOK keys are stored encrypted in Supabase and accessed only through server-side code using the service-role key.
- The browser only receives credential status metadata such as whether a key exists and its last four characters.
- The plaintext provider key is not stored in browser storage and is not returned to the client after save.
- Before making the repo public, rotate any secret that was ever committed and rewrite git history to remove it.

## License

MIT
