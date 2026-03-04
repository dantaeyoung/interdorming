# Spec: Suggested Group Hover Focus Effect

**GitHub Issue:** #5
**Status:** Draft

## Purpose & User Problem

When reviewing suggested group assignments, the user needs to quickly identify which guests belong to a specific suggested group. Currently, hovering over a suggested group line or its accept/reject buttons highlights the group line and dims other group lines, but the **guest rows and table content remain at full opacity**, making it harder to visually isolate the suggested group's members.

## Current Behavior

When hovering over a suggested group line or its accept/reject pill buttons:
- The hovered group's dashed SVG line becomes brighter and thicker (stroke-width 2 -> 3, opacity 0.6 -> 1)
- Other group lines (both confirmed and suggested) dim (opacity drops to 0.3 / 0.15)
- Guest rows that belong to the hovered group get a `.group-highlight` class (light green background)
- **All other guest rows remain at full opacity** — no visual de-emphasis

## Desired Behavior

When hovering over a suggested group line or its accept/reject pill buttons:
1. **Hovered group stays prominent:** Group line at full opacity, member rows at full opacity with highlight background
2. **Everything else dims:** All non-member guest rows become translucent (reduced opacity), making the suggested group members visually "pop out"
3. **Confirmed group lines also dim** (this already works)
4. **On mouse leave:** Everything returns to normal opacity

## Scope

### In Scope
- Dim non-member guest rows when hovering a suggested group line
- Dim non-member guest rows when hovering accept/reject pill buttons
- Smooth CSS transition for the opacity change
- Works on both suggested group lines and pill button hover

### Out of Scope
- Changes to confirmed group hover behavior (only affects suggested groups)
- Changes to the Table View / Assignment view (only affects Guest Data tab)
- Changes to the group lines dimming behavior (already works correctly)

## Technical Considerations

### Affected Components
- **`GuestList.vue`** — Container that renders guest rows and overlays; needs to propagate hover state
- **`GuestRow.vue`** — Individual row; needs to apply dimmed styling when another group is hovered and this row is not a member
- **`GroupLinesOverlay.vue`** — SVG overlay; already handles line dimming on hover
- **`useGroupLinking.ts`** — Composable that manages `hoveredGroupName` singleton state

### Implementation Approach
- Use the existing `hoveredGroupName` reactive ref from `useGroupLinking` composable
- In `GuestRow.vue`, add a computed that checks: "is a group being hovered AND am I NOT part of that group?"
- Apply a CSS class (e.g., `.group-dimmed`) with reduced opacity and a smooth transition
- The suggested group's member rows already have `.group-highlight` — those stay at full opacity

### Key Reactive Data
- `hoveredGroupName` (from `useGroupLinking`) — already set by pill button hover and SVG line hover
- `guestStore.getGuestSuggestedGroup(guestId)` — checks if a guest belongs to a suggested group
- `guest.groupName` — checks confirmed group membership

## Success Criteria

- [ ] Hovering a suggested group line dims all non-member rows
- [ ] Hovering accept/reject pill buttons dims all non-member rows
- [ ] Member rows of the hovered group remain fully visible with highlight
- [ ] Opacity transition is smooth (CSS transition ~150-200ms)
- [ ] Mouse leave restores all rows to full opacity
- [ ] Confirmed group hover behavior is unchanged
- [ ] No performance issues with 80+ guest rows
