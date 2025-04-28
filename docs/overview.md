# Project Overview: STRATOS

This document provides a high-level overview of the project structure to aid in development and feature additions.

**Core Technologies:**

*   **Framework/Library:** React
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **UI Components:** shadcn/ui
*   **Styling:** Tailwind CSS
*   **Backend/Database:** Supabase (implied by `supabase/` directory)
*   **State Management:** Redux Toolkit (implied by `src/hooks/redux.ts` and `src/state/store.ts`)

**Key Configuration Files:**

*   `package.json`: Manages Node.js dependencies, scripts (`dev`, `build`, `lint`), and project metadata.
*   `vite.config.ts`: Configures the Vite development server and build process.
*   `tsconfig.json` (and variants): Defines TypeScript compiler options for the project.
*   `tailwind.config.ts`: Configures Tailwind CSS, including theme customizations, plugins, and content paths.
*   `postcss.config.js`: Configures PostCSS, often used with Tailwind.
*   `components.json`: Likely configuration for `shadcn/ui` component management.
*   `eslint.config.js`: Configuration for ESLint code linting.
*   `supabase/config.toml`: Configuration for the Supabase instance.

**Source Code (`src/`) Structure:**

*   **`main.tsx`**: The main application entry point. Initializes React and renders the root component (`App`).
*   **`App.tsx`**: The root React component. Likely sets up routing, global layout, and providers (e.g., Redux store).
*   **`index.css` / `App.css`**: Global CSS styles and base styles.
*   **`pages/`**: Contains top-level components representing application pages/routes.
    *   `Index.tsx`: Main landing page or dashboard.
    *   `Analytics.tsx`: Page for viewing workout analytics.
    *   `Settings.tsx`: Page for application settings.
    *   `NotFound.tsx`: Page displayed for invalid routes.
*   **`components/`**: Reusable UI components.
    *   `core/`: Basic, general-purpose UI components (e.g., `Dialog`, `Toast`, `Toggle`). Likely contains base shadcn/ui components.
    *   `features/`: Components specific to certain application features.
    *   `layout/`: Components defining page structure and layout (e.g., Header, Sidebar, Footer).
*   **`lib/`**: Shared libraries, utilities, and external service integrations.
    *   `constants.ts`: Application-wide constant values.
    *   `integrations/`: Code for interacting with external services (e.g., `supabase/`).
    *   `types/`: TypeScript type definitions and interfaces.
    *   `utils/`: General utility functions used across the application.
    *   `workout/`: Logic specifically related to workout functionality.
*   **`state/`**: State management configuration and slices (likely Redux Toolkit).
    *   `store.ts`: Configures the main Redux store, combining reducers and middleware.
    *   `exercise/`: State logic related to exercises.
    *   `history/`: State logic related to workout history.
    *   `workout/`: State logic related to the active workout session.
*   **`hooks/`**: Custom React hooks for reusable logic and state access.
    *   `redux.ts`: Typed hooks (`useAppDispatch`, `useAppSelector`) for interacting with the Redux store.
    *   `use-mobile.tsx`: Hook to detect if the app is running on a mobile device.
    *   `use-toast.ts`: Hook for displaying toast notifications (likely integrates with `shadcn/ui` Toast).
    *   `useWorkoutTimer.ts`: Hook for managing workout timers.

**Other Important Directories:**

*   **`public/`**: Static assets (images, fonts, etc.) directly served by the webserver.
*   **`supabase/`**: Contains Supabase configuration (`config.toml`) and potentially database migrations or functions (though `.temp/` might be ignored artifacts).
*   **`docs/`**: Documentation files (if any).

**Adding New Features - General Workflow:**

1.  **Define Requirements:** Clearly outline the feature's functionality and UI.
2.  **Create Page (if necessary):** Add a new component in `src/pages/`.
3.  **Add Route:** Update routing logic (likely in `src/App.tsx` or a dedicated routing file) to include the new page.
4.  **Develop Components:**
    *   Create feature-specific components in `src/components/features/`.
    *   Utilize or create core components in `src/components/core/`.
    *   Use layout components from `src/components/layout/`.
5.  **Manage State:**
    *   Define necessary state slices in `src/state/`.
    *   Use `useAppSelector` and `useAppDispatch` hooks (`src/hooks/redux.ts`) to interact with the state in components.
6.  **Implement Logic:**
    *   Add utility functions in `src/lib/utils/`.
    *   Create feature-specific logic modules (e.g., in `src/lib/` or within feature components).
    *   Encapsulate reusable logic in custom hooks in `src/hooks/`.
7.  **Data Interaction:**
    *   Add functions to interact with Supabase (or other backends) in `src/lib/integrations/`.
    *   Update Supabase schema/config in `supabase/` if needed.
8.  **Add Types:** Define necessary TypeScript types in `src/lib/types/`.
9.  **Styling:** Use Tailwind CSS utility classes for styling. Add custom styles to relevant CSS files if necessary.
10. **Testing:** Add unit/integration tests (if applicable).
11. **Dependencies:** Add any new required libraries to `package.json` using `npm install` or `bun install`.
