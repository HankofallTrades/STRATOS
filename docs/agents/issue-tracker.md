# Issue tracker: Linear

Issues and specs for this repo live in **Linear**, workspace `daimodus`, team **StratOS**
(key `I`, id `0e2ffda0-5e9d-4581-bbb7-c74df50fd586`), project **Stratos**
(`https://linear.app/daimodus/project/stratos-cb8a882a5679`).

Access is through the **Linear MCP server** (`mcp__*__linear__*` tools), not a CLI.
If the MCP server is not connected in the current session, say so and stop rather
than falling back to `gh` — GitHub Issues is not used for this repo.

Every issue this repo's skills create must set:

- `team: "StratOS"` (or the team id above)
- `project: "Stratos"`

Without the project, the issue lands loose in the team and falls out of the queue.

Note the near-collision: the **team** is `StratOS` and the **project** is `Stratos`.
They differ only in case, and `save_issue` resolves both by name. If a lookup is
ambiguous or fails, pass the team id above instead of the name.

## Conventions

- **Create an issue**: `save_issue` with `team`, `project`, `title`, `description`
  (Markdown, literal newlines). Omit `id` when creating.
- **Update an issue**: `save_issue` with `id` set to the identifier (e.g. `I-42`).
  For edits to a long description, prefer `patch` over rewriting the whole body.
- **Read an issue**: `get_issue` for the issue, `list_comments` for its discussion.
- **List issues**: `list_issues` with `project: "Stratos"` plus `state`, `label`, or
  `assignee` filters. Ask for the fields you need via `fields`, e.g.
  `["id","title","description","status","labels","assignee","url","parentId"]`.
- **Comment**: `save_comment` with `issueId` and `body`. Reply in-thread with `parentId`.
- **Apply labels**: `save_issue` with `labels`. Note this **replaces the whole label
  set** — read the current labels first and pass them back along with the new one,
  or you will silently drop existing labels.
- **Close**: `save_issue` with `state: "Done"` (or `"Canceled"` for work that will not
  be done), plus a `save_comment` explaining why. Check `list_issue_statuses` for the
  team's actual state names before guessing.

## Pull requests as a request surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs on
`HankofallTrades/STRATOS` as feature requests; `/triage` reads this flag.)_

The code lives on GitHub while the tracker lives in Linear, so GitHub PRs and issues
are **not** the request queue. Ignore GitHub Issues entirely for triage purposes.

## When a skill says "publish to the issue tracker"

Create a Linear issue in team `StratOS`, project `Stratos`.

## When a skill says "fetch the relevant ticket"

`get_issue` on the identifier, then `list_comments` on the same issue. Read both
before acting; the deciding context is often in the comments, not the description.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: one issue in project `Stratos` labelled `wayfinder:map`, holding the
  Notes / Decisions-so-far / Fog body.
- **Child ticket**: an issue with `parentId` set to the map's identifier. Label
  `wayfinder:<type>` (`research` / `prototype` / `grilling` / `task`). Remember that
  `labels` replaces the set, so include `wayfinder:<type>` alongside any others.
- **Blocking**: Linear's native issue relations. `save_issue` with
  `blockedBy: ["I-12"]` / `blocks: [...]`; remove with `removeBlockedBy` /
  `removeBlocks`. These are append-only, so adding one never clears the rest.
- **Frontier query**: `list_issues` with `parentId: <map>` and an open `state`, then
  drop any ticket with an unfinished blocker or an existing `assignee`; first in map
  order wins.
- **Claim**: `save_issue` with `assignee: "me"` — the session's first write.
- **Resolve**: `save_comment` with the answer, set `state` to `Done`, then append a
  context pointer to the map's Decisions-so-far (`save_issue` on the map with a
  `patch` append).

## Labels do not exist until created

The team currently defines only `Feature`, `Improvement`, and `Bug`. Passing an
unknown label name to `save_issue` creates it. That is fine for the triage vocabulary
in `triage-labels.md`, but do not invent label names outside that file.
