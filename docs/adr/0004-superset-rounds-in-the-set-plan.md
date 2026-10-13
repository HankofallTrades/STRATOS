# Pre-open fixed superset rounds in the Set Plan

[I-45](https://linear.app/daimodus/issue/I-45/supersets-a-grouping-concept-and-a-cursor-that-alternates-between)
uses fixed adjacent A/B pairs, confirmed during implementation. Store pair
identity on workout exercises and retain paired instances separately when saving;
merging them by catalog exercise would discard membership. Open a shared number
of rounds at pairing: the largest existing count or last-session count of either
member, with three for a member with no history. Per-exercise auto-add cannot
maintain pairing while the webview is suspended, so paired exercises stop
auto-adding and Add Set explicitly extends both members. The web orders the plan;
Swift walks that order unchanged, allowing the existing first-open cursor rule
to serve both ordinary exercises and supersets.

Removing a set from a pair removes its counterpart only when both are unlogged;
break the pair before removing logged sets. Replacing a member with cardio or
breathwork breaks the pair. Drop sets, giant sets and timed rotation formats
remain outside this change.
