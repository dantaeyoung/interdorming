# Spec: Time-Based Room Configuration

**Status:** Draft
**Date:** 2026-06-13
**Supersedes (partially):** [`MultipleRoomLayouts.md`](./MultipleRoomLayouts.md) — that spec landed a manual layout-switching model (`layouts` + `activeLayoutId` in `dormitoryStore`) that clears assignments on switch. This spec replaces the switching model with a time-aware overlay model that never clears assignments.

## Purpose & User Problem

The monastery's dorm layout isn't static. Two real-world patterns:

1. **Recurring retreat configurations** — for a women's retreat, certain dorms switch to female-only; for a small retreat, half the buildings close. These repeat.
2. **One-off operational tweaks** — a heater breaks so a single bed goes offline; a family of 5 arrives and a coed dorm temporarily becomes family-only; a building closes early for cleaning.

The existing `RoomLayout` model handles #1 awkwardly (every preset is a full snapshot — edits drift) and #2 not at all (you'd clone a layout to flip one bed). Worse, switching layouts **clears assignments**, which makes the feature unusable mid-retreat-cycle when you already have a month of bookings on the board.

What's actually needed: a single base configuration plus **dated overrides** that change attributes for a date window. Overrides:
- propagate **forward** in time (never retroactively rewrite a past day)
- compose with **date-aware bed sharing** (the existing `staysOverlap` model already speaks this language)
- can be bundled into named **presets** for repeating patterns
- can be applied one-off without touching any preset

## Current State

- `dormitoryStore`: `dormitories: Dormitory[]` + `layouts: RoomLayout[]` + `activeLayoutId`. Switching layouts swaps the working `dormitories` array and **clears all assignments** (per the older spec).
- `dormitory.active: boolean`, `room.active: boolean`, `room.gender: 'M' | 'F' | 'Coed'`, `bed.active: boolean` — all single-valued, atemporal.
- Table View has a **View Date** filter (`dormAssignments-viewDate`) that scopes the bed slots to a single day so multi-cohort beds resolve to one displayed guest. This already establishes "the app has a current temporal lens."
- Validation, auto-placement, and availability checks are already date-aware via `staysOverlap` (half-open intervals; missing dates = always present).
- The old `RoomLayout` UI is wired in Room Configuration tab.

## Proposed Model

### Core concept: Base config + dated override events

```
Effective config @ date D  =  base dormitories[]  +  reduce(overrides effective on D)
```

Each override is one event that changes one attribute on one target for a date window:

```typescript
type OverrideTarget =
  | { kind: 'dormitory'; dormitoryName: string }
  | { kind: 'room'; bedIdPrefix: string }   // rooms identified by their bedId prefix
  | { kind: 'bed'; bedId: string }

type OverrideAttribute =
  | { attr: 'active'; value: boolean }
  | { attr: 'gender'; value: 'M' | 'F' | 'Coed' }   // room only

interface ConfigOverride {
  id: string                    // UUID
  target: OverrideTarget
  change: OverrideAttribute
  effectiveFrom: string         // ISO date, inclusive
  effectiveTo: string | null    // ISO date, inclusive; null = open-ended
  presetId: string | null       // null = one-off; set = part of a preset bundle
  note?: string                 // operator-entered reason ("heater broken", "Women's retreat")
  createdAt: string
}
```

**Cascading** (per interview): closing a dorm cascades to its rooms and beds **by default**, but a same-window override that re-opens a specific room/bed wins. Resolution order at any date D:
1. Start from base config.
2. Apply dorm-level overrides effective on D.
3. Apply room-level overrides effective on D (overrides dorm cascade).
4. Apply bed-level overrides effective on D (overrides room cascade).
5. Gender overrides: room-level only, applied last.

Conflicting overrides at the same level on the same target/date are resolved by **most-recently-created wins**, with a warning surfaced in the override list.

### Presets

```typescript
interface OverridePreset {
  id: string                    // UUID
  name: string                  // "Women's Retreat", "Winter Mode", "Small Retreat"
  description?: string
  createdAt: string
  updatedAt: string
}
```

A preset is just a **named bundle**. Overrides reference it via `presetId`. Applying a preset = creating its overrides for a chosen date window. Reverting = deleting all overrides with that `presetId`.

Crucially: presets don't store a snapshot. They're a template that emits override events when applied. This keeps the historical record of what was *actually* applied (and lets you tweak one preset application without affecting other applications of the same preset).

### Effective-config derivation

A new computed in `dormitoryStore`:

```typescript
const dormitoriesAt = computed(() => (date: string | null): Dormitory[] => { ... })
```

- `dormitoriesAt(null)` → base config (admin/edit view).
- `dormitoriesAt('2026-07-04')` → effective config that day, with overrides applied.

The current single-date `dormitories` ref is preserved as the **base** (edit target for "permanent" changes). Existing getters like `getAllRooms`, `getAllBeds`, `getBedById` get a date parameter (or read the current View Date by default).

### Composition with bed sharing

A bed is available for a guest's stay `[arrival, departure)` iff:
1. For every day D in that stay, `dormitoriesAt(D)` shows the bed as `active`, its room as `active`, its dorm as `active`.
2. The room's gender on D is compatible with the guest's gender (using existing room-gender rules).
3. No existing `BedAssignment` cohort overlaps the candidate stay (existing rule).

Implementation: a new helper `isBedActiveDuringStay(bedId, arrival, departure)` walks the override list. Auto-placement helpers (`getAvailableBeds`, `isBedAvailableForGuest`, `isBedAvailableForGroup`) call it before delegating to existing checks.

## UX

Per interview: **View Date + Preset picker**.

### Table View (existing)
- View Date already exists. Bed slots, room headers, dorm headers render from `dormitoriesAt(viewDate)`.
- New visual: rooms/beds that are inactive on the View Date render with a hatched/disabled style + a tooltip showing which override caused it ("Closed by 'Winter Mode' preset, May 1 – Sep 1").
- Gender-overridden rooms show their effective gender with a small "📅 override" badge.

### Room Configuration tab — new "Overrides" sub-section
Below the existing dormitory editor (which edits the **base** config), add:

```
┌────────────────────────────────────────────────────────────┐
│  Active Presets                          [+ New Preset]   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ◉ Women's Retreat   Jul 4 → Jul 11   [Apply][Edit] │ │
│  │ ○ Winter Mode       (template only)   [Apply][Edit] │ │
│  └──────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│  Overrides (timeline)         Filter: [All] [Active] [...] │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Jul 4 – Jul 11  Maple Hall    Gender → F   [Women's]│ │
│  │ Jul 4 – Jul 11  Maple Hall B  Closed       [Women's]│ │
│  │ Aug 12 → ∞      Bed MA03      Closed       [one-off]│ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

- **Presets list** — create / edit / delete preset templates. Editing a preset opens a modal where you check off targets + attributes (e.g. "Maple Hall: gender → F", "North Building: closed"). The template is a list of `(target, change)` pairs without dates.
- **Apply preset** — modal prompts for `effectiveFrom` + `effectiveTo`. Emits one override per template entry, all tagged with this preset's id and this application's date window. Conflicts with existing assignments are surfaced (see below).
- **Overrides timeline** — flat list of every override (preset + one-off). Each row shows window, target, change, source (preset name or "one-off"), and delete button. One-off creation: a `+ Add Override` form (target picker, attribute, dates, optional note).
- **Revert preset application** — one-click "Revert" button on a preset row when it's currently applied; deletes all overrides with that `presetId` within the applied window.

### One-off override from Table View
Right-click on a bed/room header → "Add override here..." → opens the override form pre-filled with that target and `effectiveFrom = today, effectiveTo = null`. Lets operators make on-the-fly changes without leaving Table View.

### Conflict surfacing (per interview: warn + list, allow but flag)
When applying an override (preset or one-off) that affects beds with **existing assignments inside the override window**:

1. Pre-application dialog (modeled on `ImportSummaryDialog`):
   ```
   Applying "Women's Retreat" Jul 4 – Jul 11 will affect 3 existing assignments:

   Maple Hall B (Closed):
     - Sarah Chen (Jul 5 – Jul 9)
     - Tom Park (Jul 4 – Jul 8)

   Maple Hall (gender → F):
     - Bob Lee (Jul 6 – Jul 11) — male in female room

   [Cancel]  [Apply anyway]
   ```
2. On "Apply anyway": overrides are written, affected assignments **are not auto-unassigned**. They show up with a new validation warning category `'overrideConflict'` so the operator can re-place them at their own pace.
3. A new bed-slot badge ⚠️ surfaces the warning at the slot.

## Migration from existing `RoomLayout`

The old layout-switching model is in production. Migration plan:

1. **One-time migration on first load** after this ships:
   - If `layouts.length > 1`: prompt the operator with a one-time dialog:
     > "You have N saved layouts. The new model uses one base configuration with dated overrides instead. Pick which existing layout should become the base — the others will be converted into preset templates you can apply by date."
   - Operator picks one → that becomes `dormitories` (base). The others get converted: a structural diff vs. the chosen base produces preset templates (e.g. layout "Winter Mode" → preset "Winter Mode" with overrides like "North Building: active → false", "Pine Room: gender → F").
   - If `layouts.length === 1` (or 0): trivially migrate; that layout's data is already the base.
2. **Keep `RoomLayout` types and `dormitoryStore.layouts` array intact for one release** to allow rollback. Mark deprecated.
3. **JSON export format** gets a new top-level `overrides` and `presets` arrays alongside `dormitories`. CSV export of the base config still works (unchanged shape, just exports `dormitoriesAt(null)`).

## Scope

### In Scope
- New types: `ConfigOverride`, `OverridePreset`, `OverrideTarget`, `OverrideAttribute`.
- New `dormitoryStore` state: `overrides: ConfigOverride[]`, `presets: OverridePreset[]`, computed `dormitoriesAt(date)`, helper `isBedActiveDuringStay(bedId, arrival, departure)`.
- Cascading resolution (dorm → room → bed) with same-level conflict warning (most-recent-wins).
- Room Configuration tab: Presets list + Overrides timeline (CRUD).
- Apply / revert preset flow with conflict dialog.
- Right-click "Add override" from Table View bed/room headers.
- Visual hatching for inactive-on-this-date rooms/beds + gender-override badge in Table View.
- New validation category `overrideConflict` (gender / closed-bed / closed-room mismatches on existing assignments).
- Auto-placement + availability check integration via `isBedActiveDuringStay`.
- Migration from existing multi-layout state.
- JSON export/import extension (`overrides`, `presets`).
- localStorage persistence (per-store, additive: `overrides`, `presets` paths added to existing `dormAssignments-dormitories`).

### Out of Scope (future)
- Adding **new** rooms or beds via overrides (e.g. temporary tent for one retreat). Overrides only toggle attributes on existing entities. If the user later wants temp-rooms, that's a follow-up spec.
- Preset versioning / history of edits.
- Calendar visualization of overrides (the flat timeline list is v1).
- Recurring overrides ("every Tuesday Maple Hall closes for cleaning") — v1 is single-window only.
- Sharing presets between installations (beyond JSON export).
- Per-cohort or per-guest overrides (e.g. "this guest needs a specific room"). Overrides are room/bed/dorm-level only.

## Technical Considerations

### Affected files
- `src/types/Overrides.ts` (new) — `ConfigOverride`, `OverridePreset`, `OverrideTarget`, `OverrideAttribute`.
- `src/types/index.ts` — re-export.
- `src/stores/dormitoryStore.ts` — new state, `dormitoriesAt` computed, override CRUD, preset CRUD + apply/revert, migration logic.
- `src/stores/validationStore.ts` — new `overrideConflict` category; existing date-scoped checks read effective config via `dormitoriesAt`.
- `src/features/assignments/composables/useAutoPlacement.ts` — availability helpers call `isBedActiveDuringStay`.
- `src/shared/composables/useDropValidation.ts` — same.
- `src/features/dormitories/components/RoomConfigCard.vue` — base editor unchanged.
- `src/features/dormitories/components/OverrideTimeline.vue` (new) — list + form for overrides.
- `src/features/dormitories/components/PresetList.vue` (new) — preset CRUD + apply.
- `src/features/dormitories/components/PresetEditModal.vue` (new) — checkbox grid of (target × attribute) for editing a preset template.
- `src/features/dormitories/components/ApplyPresetModal.vue` (new) — date-range picker + conflict preview.
- `src/features/dormitories/components/BedSlot.vue` — read effective config at View Date; show hatch / override badge.
- `src/features/dormitories/components/RoomList.vue` — same.
- `src/features/timeline/components/TimelineView.vue` — honor effective config across the timeline range.
- `src/features/print/components/PrintView.vue` — print views render using effective config (per-page date is already filtered).
- `src/features/csv/components/RoomConfigCSV.vue` — JSON export/import handles new fields.

### Performance
- `dormitoriesAt(date)` is computed per (date, overrides-version). Memoize by date string — most lookups in a session hit a small set of dates (View Date + each guest's stay days).
- Bed availability check during auto-placement walks the override list per stay. Override count is small (dozens, not thousands) — linear scan is fine.

### Data safety
- Overrides are append-only from the user's POV: editing an override = delete + re-create (preserves an audit-friendly model).
- Migration is one-shot, gated by a one-time dialog.
- All conflict-producing actions (apply preset, add override that affects an assignment) prompt before commit.

### Persistence
Extend existing `dormAssignments-dormitories` key:
```ts
paths: ['dormitories', 'configName', 'layouts', 'activeLayoutId', 'bedShapeVersion', 'overrides', 'presets']
```

## Success Criteria

- [ ] Adding a one-off override (close one bed Aug 12 → ∞) immediately marks that bed inactive on Table View when View Date ≥ Aug 12, and leaves it active before then.
- [ ] Defining a preset with multiple targets (close North Building, switch Maple Hall to F) and applying it for a date range emits all the right overrides, all tagged with the preset id.
- [ ] Reverting an applied preset removes only overrides from that application; other presets' overrides are untouched.
- [ ] Cascade works: closing a dorm marks its rooms/beds inactive *unless* a same-window override re-opens a specific room or bed.
- [ ] Gender override on a room shows the new gender on Table View at the override window and reverts after.
- [ ] Auto-placement skips beds whose rooms/dorms/themselves are inactive during the candidate's stay.
- [ ] Pre-apply conflict dialog lists every affected assignment with name + dates + reason.
- [ ] Applying anyway: overrides written, affected assignments stay put with new `overrideConflict` warning.
- [ ] Right-click "Add override" from Table View bed/room/dorm headers works and pre-fills the target.
- [ ] JSON export round-trips `overrides` and `presets`.
- [ ] Migration from multi-layout state: operator picks a base, diffs become preset templates, no data lost.
- [ ] Operating on a long-running data set (multiple months of bookings) never wipes assignments.

## Open Questions

1. **Cascade explicitness on revert** — if a dorm-close override has a room-open exception override at the same window, and the user reverts the dorm-close, should the room-open exception auto-delete? Proposed: keep it (no auto-delete), surface a hint that the exception is now a no-op.
2. **Auto-place after override** — should there be a one-click "Auto-place affected guests" after applying an override that breaks assignments? Could be a v1.5 add.
3. **Print views during override windows** — should the Guestmaster / Work Coordinator print omit closed rooms entirely, or list them with a "(closed)" marker? Proposed: omit entirely from list-by-dorm; still show in counts header.
4. **CSV export of base** — should overrides export to CSV at all? Proposed: no, JSON only for overrides. CSV remains a base-config-only format for backwards compat with operators sharing spreadsheets.
