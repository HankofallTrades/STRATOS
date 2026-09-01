# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker (Linear team `StratOS`, project `Stratos`).

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Linear specifics

- None of these five labels exist in the workspace yet — the team defines only
  `Feature`, `Improvement`, and `Bug`. Linear creates a label on first use, so the
  first `/triage` run will bring them into existence. Match the spelling above
  exactly so you don't end up with near-duplicates.
- `save_issue`'s `labels` field **replaces the full set**. Read the issue's current
  labels first, then pass the kept ones plus the new triage label. Removing a triage
  label means passing the set without it.
- These five are orthogonal to `Feature` / `Improvement` / `Bug`: an issue normally
  carries one type label and one triage label at a time.
