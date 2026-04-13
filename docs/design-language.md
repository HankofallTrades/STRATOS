# STRATOS Design Language

This is the active interface language for the current app shell and core fitness surfaces.

## Core Character

- Atmosphere: dark stone, restrained, dense, deliberate.
- Main accent: pthalo green.
- Secondary accent: warm metal for reward, emphasis, and rare contrast.
- Mood: focused and calm, not glossy, playful, or high-saturation.
- STRATOS is gracefully minimal by nature. Beauty should come from restraint, proportion, and material quality, not extra explanation or decoration.
- Everything must earn its place. Every word, icon, border, and gap should have a job.

## Surface Hierarchy

- `stone-panel`: the heaviest surface. Use for hero cards, major review moments, and high-priority entry points.
- `stone-panel-hero`: a richer version of `stone-panel` for the primary card on a page.
- `stone-surface`: the default page module shell. Most cards and sections should land here.
- `stone-chip`: a lighter nested surface for rows and dense control groups when a true depth change is needed.
- `stone-inset`: a recessed treatment for inputs, logs, and areas that should feel embedded rather than elevated.

Rule: do not stack shells just to make every item feel designed. A `stone-surface` should not usually contain another full `stone-surface`, and a large card should not be filled with mini-cards for simple metadata or basic choices.

Anti-pattern: `stone-panel` -> `stone-surface` -> bordered inner card for the same job. Auth and entry flows should usually have one dominant shell only. If the form itself is the focus, keep the outer layout quiet and let the form card be the only real boundary.

## Accent Rules

- Pthalo green is the primary interface accent: active states, key icons, progress, and primary action fills.
- Warm metal is the secondary accent: achievements, streaks, standout rewards, and selective emphasis.
- Avoid generic bright dashboard blues and greens inside analytics. Charts should use muted pthalo-led palettes that stay inside the stone system.

## Typography

- `app-kicker`: small uppercase label for section framing.
- `app-page-title`: tight, large, high-contrast title. Use it only when the page needs framing outside the lead surface.
- Section titles: `text-2xl` or `text-3xl`, semibold, tracking-tight.
- Supporting copy: muted, concise, usually one sentence.

Rule: do not invent a new heading treatment for each module. Pages should feel authored from a small set of repeated text roles.

## Copy Density

- Default to omission. If the control is self-explanatory, do not add copy around it.
- Every word matters. Cut filler, throat-clearing, and labels that only restate the obvious.
- Do not default to a kicker, title, and subtitle at the top of every page.
- If the lead surface already tells the user where they are and what to do, skip the extra page header.
- Avoid stacked explanation layers. If the title, module label, helper text, and button all say the same thing, cut at least one of them.
- In side rails and compact modules, prefer labels of one to three words. Add supporting copy only when the choice would otherwise be unclear.
- Conversation surfaces should not explain themselves three times. Use one clear status cue, one optional setup cue, and let the input or starters carry the rest.

Rule: if a screen still reads clearly after removing a sentence, remove it.

## Page Anatomy

Most pages should follow this order:

1. A clear entry point, which can be either a minimal page header or a lead surface.
2. One clear lead surface that establishes the page’s main focus.
3. Supporting modules with consistent spacing and shell depth.
4. Detail/history modules last.

The Home page and Analytics page are the best current references.

Rule: side-by-side modules should usually align at the top and size to their content. Do not stretch a shorter panel to match a taller neighbor unless the comparison is intentional.

## Controls

- Primary actions use `app-primary-action`.
- Secondary controls use `app-tonal-control`.
- Segmented controls and tabs should live inside a `stone-chip` or similarly light shell.
- Hover states should brighten subtly. They should not change the overall mood of the surface.
- Compact selectors must show full option labels without truncation. If the labels do not fit, reduce the column count or simplify the control content.
- Icons should usually sit directly in the layout. Do not put them in generic circles, pills, or badges unless the container itself communicates state.
- If an icon does not clarify state or action, remove it.

## Do / Avoid

- Do use large radii, soft borders, and restrained shadows.
- Do keep spacing generous enough for scanning, but not airy.
- Do make the first object on a page obviously more important than the rest.
- Avoid mixing old generic `Card` styling with stone surfaces on the same screen.
- Avoid rainbow chart palettes and semantically meaningless color variation.
- Avoid redundant labels where the container title already names the content.
- Avoid descriptive filler copy inside compact controls and side rails.
- Avoid explanatory text blocks that only narrate what the controls already say.
- Avoid dead air created by equal-height cards when one panel has much less content.
- Avoid decorative icon containers that add shape but no meaning.
- Avoid borders or surface breaks that do not create real hierarchy.
- Avoid turning metadata rows or option grids into card farms.
- Avoid card-within-card-within-card composition for a single task. If one module already frames the action, remove the extra shell.

## Source Files

- `src/index.css`
- `src/components/core/card.tsx`
- `src/components/core/tabs.tsx`
- `src/pages/Home.tsx`
- `src/pages/Analytics.tsx`
