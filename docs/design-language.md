# STRATOS Design Language

This is the active interface language for the current app shell and core fitness surfaces.

## Core Character

- Atmosphere: dark stone, restrained, dense, deliberate.
- Main accent: pthalo green.
- Secondary accent: warm metal for reward, emphasis, and rare contrast.
- Mood: focused and calm, not glossy, playful, or high-saturation.

## Surface Hierarchy

- `stone-panel`: the heaviest surface. Use for hero cards, major review moments, and high-priority entry points.
- `stone-panel-hero`: a richer version of `stone-panel` for the primary card on a page.
- `stone-surface`: the default page module shell. Most cards and sections should land here.
- `stone-chip`: a lighter nested surface for rows, secondary controls, and grouped sub-items inside a larger module.
- `stone-inset`: a recessed treatment for inputs, logs, and areas that should feel embedded rather than elevated.

Rule: do not stack identical shells. A `stone-surface` should not usually contain another full `stone-surface` unless the depth change is intentional and obvious.

## Accent Rules

- Pthalo green is the primary interface accent: active states, key icons, progress, and primary action fills.
- Warm metal is the secondary accent: achievements, streaks, standout rewards, and selective emphasis.
- Avoid generic bright dashboard blues and greens inside analytics. Charts should use muted pthalo-led palettes that stay inside the stone system.

## Typography

- `app-kicker`: small uppercase label for section framing.
- `app-page-title`: tight, large, high-contrast title. One per page.
- Section titles: `text-2xl` or `text-3xl`, semibold, tracking-tight.
- Supporting copy: muted, concise, usually one sentence.

Rule: do not invent a new heading treatment for each module. Pages should feel authored from a small set of repeated text roles.

## Page Anatomy

Most pages should follow this order:

1. Header with kicker, title, and one short subtitle.
2. One clear lead surface that establishes the page’s main focus.
3. Supporting modules with consistent spacing and shell depth.
4. Detail/history modules last.

The Home page and Analytics page are the best current references.

## Controls

- Primary actions use `app-primary-action`.
- Secondary controls use `app-tonal-control`.
- Segmented controls and tabs should live inside a `stone-chip` or similarly light shell.
- Hover states should brighten subtly. They should not change the overall mood of the surface.

## Do / Avoid

- Do use large radii, soft borders, and restrained shadows.
- Do keep spacing generous enough for scanning, but not airy.
- Do make the first object on a page obviously more important than the rest.
- Avoid mixing old generic `Card` styling with stone surfaces on the same screen.
- Avoid rainbow chart palettes and semantically meaningless color variation.
- Avoid redundant labels where the container title already names the content.

## Source Files

- `src/index.css`
- `src/components/core/card.tsx`
- `src/components/core/tabs.tsx`
- `src/pages/Home.tsx`
- `src/pages/Analytics.tsx`
