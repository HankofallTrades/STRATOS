# StratOS — Operating System for Life

StratOS is a personal operating system that helps you operate your life with intent. It brings together body (fitness, nutrition, sunlight), systems (habits, goals, routines), and guidance (AI coach) into one cohesive daily workspace.

This repository is the new home for StratOS. The fitness-only application has been preserved in a separate fork so it can evolve independently and be monetized on its own.

## Vision

- **Unify**: One place to see and act on what matters today.
- **Close the loop**: Plan, do, reflect. Turn data into decisions.
- **Delight**: Fast, tactile, mobile-first interactions that get out of your way.

## Pillars

- **Body**: Fitness tracking, weekly cardio targets, protein intake, sun exposure
- **Systems**: Habits, goals, and routines with clear weekly/daily focus
- **Guidance**: Context-aware coaching that learns from your profile and history

Note: RPG-style “character sheet” concepts are exciting but explicitly out-of-scope for MVP.

## Status

- Current state: Working fitness and wellness foundation (from the original app)
- In-progress: OS-level UX, habits/goals primitives, unified daily dashboard
- Deferred: Character sheet RPG stats, complex program design

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: Redux Toolkit with persistence
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Custom LLM client

## Getting Started (Development)

1. Clone the repo
   ```sh
   git clone <YOUR_GIT_URL>
   cd STRATOS
   ```
2. Install dependencies
   ```sh
   npm install
   ```
3. Environment variables
   Create a `.env.local` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Database setup
   ```sh
   npx supabase db reset
   ```
5. Start the dev server
   ```sh
   npm run dev
   ```

The app will be available at `http://localhost:5173`.

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── core/             # shadcn/ui base components
│   ├── features/         # Feature-specific components
│   └── layout/           # Layout components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and integrations
│   ├── integrations/     # Supabase client and API functions
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper functions
├── pages/                # Page components
├── state/                # Redux store and slices
└── main.tsx              # Application entry point
```

## Fitness-Only Fork

The fitness tracker is maintained separately as its own project ("StratOS Fit"). It preserves the original experience and roadmap focused purely on training, analytics, and simple nutrition/wellness logging. Link to its repo will be added when published.

## Development Commands

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint

## License

MIT

---

Built for people who want to run their lives like a high-performance system.
