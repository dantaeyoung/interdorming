# Spec: Timeline View for Room Configuration

**Status:** Draft
**Date:** 2026-06-14
**Replaces:** the "All overrides" flat list shipped in PR #42 (`PresetsAndOverridesSection`). The Presets card stays.

## Purpose & User Problem

The "All overrides" flat list shipped in PR #42 hides the *narrative*. Reading a list of "Maple Hall → Closed from Jul 4 to Jul 11" doesn't tell the operator at a glance:

- **What configuration is the property in right now?**
- **When does it change next?**
- **Which periods are "Default" vs. some named retreat configuration?**

What the operator actually wants is a **Premiere-style horizontal timeline** where you can scan across the months and see colored segments labeling each period's active configuration. Click a segment → see what's in it and edit.

## Design (one bar, macro view)

```
Property:  [██ Default ██][Women's Retreat][████ Default ████][Winter Mode]
           Jan        Apr      Jul 4-11          Sep                  Dec
                                ▲ click
                                └── opens the overrides that produced this segment
```

A single horizontal bar across the visible date range. It's split into **segments** at every date where the active configuration changes — i.e. at every override's `effectiveFrom` and the day after every override's `effectiveTo`. Each segment is colored according to its configuration signature.

### Segment naming

For each segment, look at which presets are *fully covering* it (override.applicationId where every entry in that preset's application is active throughout the segment):

- **Zero presets fully covering and zero one-off overrides active** → label `Default`.
- **Exactly one preset fully covering, no other overrides** → label with the preset's name (e.g. `Women's Retreat`).
- **One preset + some one-offs**, or **multiple presets**, or **only one-offs** → label `Custom` with a hover tooltip listing the active overrides.

A small `+N` badge appears on a preset segment if extra one-off overrides are active in it (e.g. `Women's Retreat +1`).

### Color encoding (per config-version)

Each unique "configuration signature" — defined as the **sorted set of override IDs active in that segment** — gets one color from a rotating palette. Identical signatures → identical color (same color reused for two periods of `Default`, for example).

Color assignment is deterministic from the signature so the timeline looks the same across reloads. Implementation: hash the signature, modulo the palette length.

Palette: a small distinct-color set (≈8) that respects light/dark themes and ensures `Default` always gets the same neutral (e.g. light gray) for visual quiet.

A legend below the bar lists the visible signatures and what they mean ("Default", "Women's Retreat", "Custom: MA3 closed + Maple Hall coed").

### Time range

User-set, defaults to **current month ± 6 months** (i.e. ~13 months centered on today). Two date inputs above the bar control the visible range. A small "Today" indicator (vertical dashed line) marks `today` inside the bar. No pan / zoom in v1 — just the date inputs.

Range bounds persist in localStorage under `dormAssignments-configTimelineRange`.

### Click behavior on a segment

Click → open an inline panel (below the bar, NOT a modal) that shows:
- The segment's date range and label.
- A list of every active override in that segment, with the same row affordances as the old "All overrides" list (target, change, source preset name if any, delete button).
- A "+ Add override starting here" button that opens the existing `OneOffOverrideModal` with `effectiveFrom` pre-filled to the segment's start date.

If the segment is a preset application, the panel additionally shows a "Revert this application" button (deletes all overrides with that applicationId).

The panel persists until the user clicks somewhere else or another segment. Multiple segments can't be selected simultaneously.

## What this replaces

In `PresetsAndOverridesSection.vue`:
- ✅ **Keep** the Presets card and its modals (`PresetEditModal`, `ApplyPresetModal`) — presets are templates, not events.
- ❌ **Remove** the "All overrides" flat list card.
- ✅ **Replace it** with the new `OverrideTimelineBar.vue` component.
- ✅ **Keep** the "+ Add one-off" button — but move it to live next to the bar's title bar, not under a separate card.

Everything that was reachable from the old list is reachable from the new bar via segment click → panel.

## Components

```
PresetsAndOverridesSection.vue (updated)
├── PresetList (unchanged)
└── OverrideTimelineBar.vue (NEW) — the bar + range picker + legend + clicked-segment panel
    └── reuses OneOffOverrideModal (unchanged)
```

`OverrideTimelineBar.vue` is the entire new surface. It:
- Reads `dormitoryStore.overrides` and `dormitoryStore.presets`.
- Computes segments from override windows clipped to the visible range.
- Renders the bar, labels, legend, and selected-segment panel.

## Algorithm: building segments

```typescript
interface Segment {
  start: string       // ISO YYYY-MM-DD, inclusive
  end: string         // ISO YYYY-MM-DD, inclusive
  activeOverrideIds: string[]   // sorted (signature key)
  label: string                 // "Default" | preset name | "Custom"
  extraOneOffCount: number      // for the "+N" badge
  color: string                 // resolved from signature hash
}
```

1. **Collect boundaries** within the visible range:
   - The visible range start and end.
   - For each override: `effectiveFrom` and `(effectiveTo + 1 day)`. If `effectiveTo === null`, only `effectiveFrom` contributes a boundary.
2. **Sort + dedupe** boundaries.
3. **For each pair of consecutive boundaries `[b_i, b_{i+1})`**, the half-open window is a candidate segment.
4. **Determine which overrides are active** at any date in that segment (they're all active across the whole segment by construction).
5. **Skip zero-length segments**.
6. **Compute the signature** = sorted comma-joined override IDs (empty string for "Default").
7. **Compute the label** per the naming rules above.
8. **Resolve the color** via `palette[hash(signature) % palette.length]` with `Default` always mapped to the neutral slot.

Output: array of `Segment`s spanning the visible range, end-to-end. Render each as a flex-grown div whose `flex-grow` is the segment's day count, with the segment's color as background and label as centered text.

Long labels overflow horizontally — clip with `text-overflow: ellipsis` and surface the full label on hover. Optionally, segments narrower than a threshold (e.g. < 8% of bar width) show only a hover tooltip, no inline label.

## Scope

### In Scope
- `OverrideTimelineBar.vue` rendering the bar + range picker + legend + clicked-segment panel.
- Segment computation + signature-based deterministic coloring.
- Click-to-select; selected segment shows the inline panel with override list, delete buttons, "Add override starting here", and (for preset applications) "Revert this application".
- Remove the old "All overrides" list card from `PresetsAndOverridesSection`.
- Date range persistence in localStorage.
- Light-mode color palette.
- Today indicator line.

### Out of Scope (future)
- **Per-room rows below the property bar** — explicitly deferred. The user can pick this up after the macro bar feels right.
- Drag segment edges to extend / shrink override windows (Premiere-style direct manipulation).
- Pan / zoom controls (range picker only in v1).
- Dark mode color palette (light only).
- Compact mobile rendering — desktop-first.
- Per-attribute lanes (gender vs. active as separate sub-rows).

## Technical Considerations

### Affected files
- `src/features/dormitories/components/OverrideTimelineBar.vue` (NEW).
- `src/features/dormitories/components/PresetsAndOverridesSection.vue` (REMOVE the All-overrides card; ADD the bar in its place).
- `src/features/dormitories/components/index.ts` (export the new component).

### Performance
- Boundary collection is O(N) over overrides, segment iteration is O(N log N) after sort. With dozens of overrides in a year, this is trivial. Memoize by `(overrides snapshot, visible range)`.
- Color hashing is a cheap stable function (e.g. `djb2` mod palette length) — no need for a separate cache.

### Persistence
Add one new key:
```
dormAssignments-configTimelineRange = { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
```

### Color palette
Initial:
```
Default neutral: #e5e7eb (light gray — quiet, low-attention)
Other slots:     a small distinct-color set tuned for contrast on white
                 (e.g. #ddd6fe, #fde68a, #bbf7d0, #fbcfe8, #bae6fd, #fed7aa, #c7d2fe)
```

`Default` is pinned to slot 0 always; non-default signatures hash into slots 1..N.

## Success Criteria

- [ ] Zero overrides → one continuous neutral-colored "Default" bar across the visible range.
- [ ] Applying a preset for a window → bar splits into three segments (Default / Preset / Default) with the preset segment in a distinct color.
- [ ] Two non-overlapping applications of the same preset use the **same** color (same signature → same color).
- [ ] One preset + an unrelated one-off override in the same window → segment shows "PresetName +1" with hover tooltip listing the extra override.
- [ ] Today indicator line lands at the correct horizontal position.
- [ ] Click on a segment → panel opens listing all active overrides + Delete + "+ Add override starting here".
- [ ] Date range picker updates the bar; range persists across reload via `dormAssignments-configTimelineRange`.
- [ ] Removing all overrides from a segment via the panel → bar re-renders to merge that segment back into the surrounding "Default".

## Open Questions

1. **Preset application that's PARTIALLY covered by another override** — e.g. apply "Women's Retreat" Jul 4–11, then add a one-off closing MA3 Jul 6–8. The Jul 6–8 sub-segment has BOTH the preset overrides AND the one-off. Is it labeled `Women's Retreat +1` (preset still considered fully-covering and one-off is extra) or `Custom` (because the override set isn't pure preset)? Proposed: `Women's Retreat +1` — the preset still applies, the one-off is a transient extra.
2. **"+ Add override starting here"** vs. **"+ Add one-off"** at the top — keep both, or just the segment-relative one? Proposed: keep both. Top-level button is more discoverable; segment-relative button is more contextual.
3. **Empty visible range** (range start > range end after user fiddling) — render an empty bar with a helpful nudge, or refuse to apply the change? Proposed: refuse the date input change at the validation layer.
