# Improve Auto-Placement Algorithm

## Problem

The current auto-placement algorithm processes guests individually, scoring each guest against every available bed independently. It doesn't consider groups as units — a family of 5 might get split across rooms because each member is placed one at a time.

The monastery staff's manual workflow prioritizes groups by type and size, placing the hardest-to-fit groups first to ensure they get good room matches before beds fill up.

The algorithm should mirror this workflow: place groups as whole units, highest-priority first, then fill remaining beds with individuals.

## Research Validation

This approach is supported by established algorithms:
- **RoomTetris** (hotel industry) — proven optimal when largest/hardest reservations are placed first
- **Largest-first bin packing** — well-known heuristic for packing items into bins with constraints
- **Stable matching with groups** — academic research on assigning student groups to dormitories as units

## Design

### Step 1: Group Classification

Before placement, classify each group using the existing `indivGrp` CSV field combined with member data:

**Input signals:**
- `indivGrp` field from CSV ("individual", "group", "family/friends")
- `groupName` — shared group identifier
- Member ages — detect minors (< 18)
- Group size — from groupName membership count

**Classification (5 tiers):**

| Priority | Type | Detection Logic |
|----------|------|----------------|
| 1 (highest) | Family with minors | `indivGrp` contains "family" AND has members < 18 |
| 2 | Group with minors | `indivGrp` contains "group" AND has members < 18 |
| 3 | Family without minors | `indivGrp` contains "family", all members ≥ 18 |
| 4 | Group without minors | `indivGrp` contains "group", all members ≥ 18 |
| 5 (lowest) | Individuals | No `groupName` |

Within each tier, larger groups are placed first (they're hardest to fit).

**Fallback when `indivGrp` is missing:** If a guest has a `groupName` but no `indivGrp` value, classify based on whether the group has minors — treat as "family" if it has minors, "group" if all adults.

### Step 2: Group-First Placement Algorithm

Replace the current "score each guest individually" approach with a two-stage algorithm:

#### Stage 1: Place Groups (as units)

1. Classify all groups per Step 1
2. Sort groups by: priority tier (highest first), then size (largest first within same tier)
3. For each group:
   a. Find all rooms with enough available beds for the entire group
   b. Score each candidate room:
      - **Gender match** (hard constraint): room gender must accommodate all members
      - **Bunk requirements** (hard constraint): enough lower/single bunks for members who need them
      - **Room fit** (soft): prefer rooms where group fills most/all beds (minimize wasted space)
      - **Building consolidation** (soft): prefer rooms in already-occupied buildings
      - **Age compatibility** (soft, if enabled): prefer rooms where existing occupants have similar ages
   c. Place entire group in the highest-scoring room. Assign members to beds within the room greedily: members with bunk constraints (lower bunk required) get matching beds first, then remaining members fill whatever's left.
   d. If no room can fit the entire group, skip it and flag for user attention

#### Stage 2: Place Individuals

4. Process remaining ungrouped guests using the existing per-guest scoring algorithm
5. Sort individuals: lower-bunk-required first, then by any other tiebreakers

#### Constraint Relaxation (existing behavior, preserved)

- **Pass 1 (strict)**: All soft constraints active
- **Pass 2 (relaxed)**: Relax room-fit and age preferences
- **Pass 3 (emergency)**: Only enforce hard constraints (gender, bunk type)

Each pass runs both Stage 1 and Stage 2 with progressively relaxed scoring.

## Implementation Notes

### Files to modify
- `src/features/assignments/composables/useAutoPlacement.ts` — core algorithm changes
- `src/types/Settings.ts` — add group priority settings
- `src/stores/settingsStore.ts` — defaults for new settings
- `src/features/settings/components/AutoPlacementSettings.vue` — UI for group tier priorities

### New files
- `src/features/assignments/composables/useGroupClassification.ts` — group type inference logic

### Key assumption
- Auto-place only operates on **unassigned guests** — it never moves or reshuffles guests who are already assigned to beds. This matches the current behavior.

### Backward compatibility
- Existing per-guest scoring weights remain configurable
- All existing hard constraints (gender, bunk) are preserved
- Constraint relaxation passes are preserved

## Out of Scope (future enhancements)
- Group splitting across rooms (if group doesn't fit, flag it instead)
- Transparency UI — summary panel explaining algorithm decisions (separate task)
- Notes field parsing for group hints
- Manual group type tagging UI
- Timeline-aware placement (arrival/departure overlap)

## Success Criteria
- Groups are placed as whole units, never split when a fitting room exists
- Families/groups with minors are placed before adult-only groups
- Larger groups get priority over smaller groups of the same tier
- Groups that can't be placed are flagged, not silently dropped
- Solo guests fill remaining beds efficiently
