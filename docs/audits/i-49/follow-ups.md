# I-49 follow-ups

Created 2026-10-14: [I-50](https://linear.app/daimodus/issue/I-50), [I-51](https://linear.app/daimodus/issue/I-51), [I-52](https://linear.app/daimodus/issue/I-52), [I-53](https://linear.app/daimodus/issue/I-53). Parent I-49; team StratOS; project Stratos. Preserve fixed A/B pairs and shared round semantics throughout.

## High — Show current A/B set and round progression

Evidence: 03-a1.png, 05-b2-first.png. After A1 no cue identifies B1; all A rows precede all B rows.

Add compact next member/exercise/round from existing Set Plan cursor. Retain out-of-order logging. Check A1→B1→A2→B2 and B2 before A2; completed rows never become current. Labels: Improvement, ready-for-agent.

## High — Prevent workout clipping at 320px

Evidence: 09-small.png, 12-small-viewport.png. Break apart right edge x339, completion right edge x325, viewport x320; scrollWidth remains 320. Warmup/Finish overflow too.

At 390px a browser-local “Single-Arm Half-Kneeling Cable External Shoulder Rotation” fixture also expands/clips the group (15-long-name.png). Fix shared layout sizing; check paired/unpaired, full names, 320/390px and desktop. All controls reachable without horizontal clipping. Labels: Bug, ready-for-agent.

## Medium — Make Add Round visible and unambiguous

Evidence: 02-paired.png, 07-added-round.png. Bare + duplicates independent Add Set appearance; only aria-label states scope.

Provide one visible group Add Round action or equally clear treatment. Each click adds exactly one row to both; preserve logged values/shared count. Labels: Improvement, ready-for-agent.

## Medium — Enlarge set targets and identify member/round

Evidence: 03-a1.png, 07-added-round.png; DOM measurements/accessibility snapshot. Completion/Add Round 32×32; Pair/Break apart 36px high. Completion names omit exercise/round/state.

Comfortable 44px touch areas without overlap. Accessible names include exercise/member, round and completion state. Verify keyboard, screen reader and 320/390px layout. Native VoiceOver untested. Labels: Improvement, ready-for-agent.
