# Spec: Configuration Cuts (timeline of full configurations)

**Status:** Draft
**Date:** 2026-06-14
**Supersedes:** [`TimeBasedRoomConfig.md`](./TimeBasedRoomConfig.md) and the
"base + dated overrides" data model shipped in PRs #40 / #41 / #42 / #43 / #44.
Layouts (deprecated in PR #44) stay deprecated.

## Purpose & User Problem

The override model ("base config + dated overrides + preset templates") was
mathematically correct but cognitively confusing. Operators don't think
"this is the base, and on Jul 4 an override flips Maple Hall closed."
They think:

> "Right now we're in our default setup. On Jul 4 we cut over to the
> Women's Retreat setup. On Jul 12 we cut back. Each of those is just…
> a configuration of the property at that time."

That mental model — **a timeline of independent full configurations,
chained by cut points** — is much closer to how operators describe it.
It's also closer to how Premiere editors think about clips: each clip
is a complete thing; you slice the timeline to introduce a new one.

## Mental model

- The property has **one timeline** of configurations.
- At any moment in time, **exactly one** Configuration is in effect.
- A Configuration is a **full snapshot** of `dormitories[]` (dorms, rooms,
  beds, attributes). Not a delta. Not deltas-on-top-of-a-base.
- The fundamental editing action is a **Cut at date D**. It splits the
  Configuration covering D into two segments:
  - `[…D − 1]` keeps the original snapshot.
  - `[D…]` starts as a **copy** of that snapshot and is then edited
    independently.
- Cuts can be added anywhere on the timeline. Cutting inside an existing
  future segment splits it further: the original `[D₁ … D₂]` becomes
  `[D₁ … D₃ − 1][D₃ … D₂]` where D₃ is the new cut.
- Deleting a cut merges the two adjacent segments into one. The
  **earlier** segment's snapshot wins (the later snapshot is discarded
  after a confirm).
- Past configurations are editable — fix a typo, retroactively record
  what was actually true.

A small but important corollary: there is always at least one
Configuration (the "initial" one, with `effectiveFrom: null` meaning
"from the start of time"). You can't delete every cut — the timeline
must have at least one Configuration covering all of time.

## Renames

| Old | New |
|---|---|
| Override / one-off | (gone — only Configurations + cuts) |
| Preset | Configuration template |
| Override timeline | Configuration timeline |
| "+ Add one-off" | "+ Cut here" |
| "Apply preset" | "Cut + use template" |
| "Custom" segment label | (gone — every segment is just its own Configuration) |
| `dormitoryStore.overrides[]` | `dormitoryStore.configurations[]` |
| `dormitoryStore.presets[]` | `dormitoryStore.configurationTemplates[]` |

Everything operator-visible drops "override" and "preset" — the only
words on screen are **Configuration**, **Cut**, **Template**.

## Data model

```typescript
interface TimelineConfiguration {
  id: string
  /**
   * Inclusive start date (ISO YYYY-MM-DD). `null` means "from the
   * start of time" — there is exactly one such configuration, the
   * initial one. Sort order is `effectiveFrom` ascending with the
   * `null` (initial) one always first.
   */
  effectiveFrom: string | null
  /** Operator-visible name. Defaults to e.g. "Configuration 3". */
  name: string
  /** Full snapshot. */
  dormitories: Dormitory[]
  createdAt: string
  updatedAt: string
}

interface ConfigurationTemplate {
  id: string
  name: string
  description?: string
  dormitories: Dormitory[]
  createdAt: string
}
```

`dormitoryStore` state becomes:

```typescript
configurations: TimelineConfiguration[]  // sorted by effectiveFrom (null first)
configurationTemplates: ConfigurationTemplate[]
```

Note the absence of `overrides[]`, `presets[]`, and the per-attribute
override resolution code. `dormitoriesAt(date)` becomes a one-liner:
find the configuration whose `[effectiveFrom, nextEffectiveFrom)`
window covers `date`, return its `dormitories`.

## Core operations

### `cutAt(date: string, options?)`

Effect:
1. Find the configuration `C` whose window covers `date`.
2. If `C.effectiveFrom === date`, do nothing (cut already exists there).
3. Otherwise, deep-clone `C.dormitories`, create a new
   `TimelineConfiguration` with `effectiveFrom = date` and the cloned
   tree. Auto-name it (e.g. `"Configuration 3"`).
4. Insert in the sorted array.

Options:
- `copyFrom: id` — copy the new segment's snapshot from a different
  configuration's snapshot instead of `C`'s. Used by the "Copy from…"
  workflow when creating a cut.
- `name: string` — set a name immediately.
- `templateId: id` — copy from a `ConfigurationTemplate` (functionally
  same as `copyFrom` but on the template library).

### `deleteCut(configurationId: string)`

Effect:
1. Refuse if `configurationId` is the initial configuration
   (`effectiveFrom === null`). The timeline always needs a base.
2. Otherwise, remove it from the array. The previous configuration's
   window naturally extends to the next cut. The deleted snapshot is
   discarded (confirm dialog explains).

### `updateConfigurationDormitories(configurationId, dormitories[])`

Used by the Configuration tab's dormitory editor when a specific
configuration is selected for editing. Directly replaces that
configuration's snapshot.

### Template operations

- `saveConfigurationAsTemplate(configurationId, name)` — clone the
  config's snapshot into `configurationTemplates`.
- `applyTemplateAsCut(templateId, date)` — sugar for
  `cutAt(date, { templateId })`.
- `copyConfigurationToCut(sourceId, date)` — sugar for
  `cutAt(date, { copyFrom: sourceId })`.

## UX

### Configuration tab — top-level structure

```
┌──────────────────────────────────────────────────────────────┐
│  Configuration timeline                                       │
│  [From: …] [To: …]                          [+ Cut here…]    │
│  ┌──────────────────────────────────────────────────────────┐│
│  │[ Default ][ Women's Retreat ][ Default ][ Winter Mode  ] ││
│  └──────────────────────────────────────────────────────────┘│
│  ↑ today indicator                                            │
│                                                               │
│  Editing: Women's Retreat  (Jul 4 – Jul 11)        [Rename]  │
│  ──────────────────────────────────────────────────────────── │
│  [ dormitory / room / bed editor for THIS configuration ]    │
│                                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Templates                                  [+ New template] │
│  • Women's Retreat (matches Jul 4 cut)        [Apply…][…]   │
│  • Winter Mode                                [Apply…][…]   │
└──────────────────────────────────────────────────────────────┘
```

- **Top: the timeline bar.** Same segmented bar as today, same
  signature-stable coloring. Clicking a segment **selects** that
  configuration as the editing target. The dormitory editor below
  then reflects (and writes to) that selected configuration.
- **Cut here** opens a small popover: date input (defaults to the
  selected segment's start, or today), name input (optional), and a
  picker: `Empty copy of current ▾ | Copy from another configuration | Use template`.
- **Templates card** below: save / apply / rename. Apply = cut at a
  chosen date + populate from the template.

### Cut popover details

Three "source" choices:

1. **Empty copy of current configuration** (default). New segment starts
   identical to the one being cut, then you edit it.
2. **Copy from another configuration** — dropdown of every existing
   configuration on the timeline. New segment starts as a copy of that
   one's snapshot.
3. **Use template** — dropdown of `configurationTemplates`. New segment
   starts from the template snapshot.

In all three cases, the result is a fresh independent snapshot — no
ongoing "link" to the source. Editing the source later does NOT update
this cut. This matches operator expectation: "I cut over to Women's
Retreat last July" means "I copied the Women's Retreat setup then; if I
update the template now, last July's cut isn't retroactively edited."

### Segment selection vs. View Date

Two related but distinct things:

- **View Date** (Table View): "show me what the property looks like on
  this date." Resolves to whichever configuration's window covers that
  date.
- **Editing Target** (Configuration tab): "I want to edit this
  configuration." Selected by clicking the timeline segment.

Default editing target = the configuration covering today. Clicking a
different segment switches the target.

### Delete-cut affordance

Clicking a selected non-initial segment surfaces a "Delete this cut"
button. Confirm dialog: "This will merge `<name>` back into
`<previous-name>` and discard its snapshot. Continue?"

## Migration from PR #40-#44 state

Auto-migrate on first load:

1. If `dormitoryStore.configurations` already exists, skip.
2. Otherwise, compute the **segment list** the way `buildSegments` did,
   over the union of every override's effective window (no visible-range
   clipping — we want all of history).
3. For each segment, build a full `dormitories[]` snapshot by applying
   the active overrides at that segment's start date to the base
   `dormitories[]` tree (reusing `dormitoriesAt(segmentStart)` from the
   existing model).
4. Create one `TimelineConfiguration` per segment, named after the
   preset that fully covered it (if any) or auto-numbered.
5. The first segment (covering "the beginning") becomes the initial
   configuration (`effectiveFrom: null`).
6. Convert each existing `OverridePreset` into a `ConfigurationTemplate`
   by applying its entries to the current base — yields one snapshot
   per preset. (Lossy if the preset only flips a couple attributes; the
   template will be a full snapshot of "what the base looks like after
   this preset is applied".)
7. Wipe `overrides[]` and `presets[]` from persisted state once the
   migration completes. Keep the empty arrays around for a release as a
   safety check (so old code reading them sees an empty list rather
   than `undefined`).

Existing assignments are untouched throughout — same data model on the
guest-assignment side.

## Things this removes / simplifies

- `ConfigOverride`, `OverridePreset`, `OverrideTarget`, `OverrideAttribute`,
  `PresetTemplateEntry` types — gone.
- `dormitoriesAt(date)` becomes O(log N) on the configurations array
  instead of O(N) over overrides + cascade resolution + deep clone.
- `useConfigTimelineSegments.ts` becomes a thin wrapper that just maps
  `configurations[]` to display segments (no boundary collection, no
  signature math; color is hashed off the configuration id directly).
- `isBedActiveDuringStay(bedId, arrival, departure)` walks the
  configurations covering the stay window and checks each one's
  snapshot — straightforward.
- `applyPreset` / `revertPresetApplication` / `addOverride` / etc.
  replaced by `cutAt` / `deleteCut` / `applyTemplateAsCut`.
- Editing a "Custom" segment: trivially editing that one configuration's
  snapshot. No mental gymnastics about "which overrides are active
  here? what does my edit do to them?"
- `overrideConflict` validation warning becomes "Bed inactive during
  stay" with the same trigger but resolved from the snapshot, not the
  override window.

## Things this keeps

- The timeline bar visual: range picker, today line, legend chips,
  edge-to-edge segments, the leftmost/rightmost edge markers.
- View Date as the read-side lens in Table View, Timeline View,
  Print views — already uses `dormitoriesAt(date)`, which still
  exists.
- Auto-placement + drop validation integration via the same
  `isBedActiveDuringStay` API.
- Layouts deprecation (PR #44). They're already migrated.

## Scope

### In Scope (single PR)
- Type rename: `ConfigOverride` → `TimelineConfiguration`, `OverridePreset` → `ConfigurationTemplate`.
- `dormitoryStore` rewrite: `configurations[]` + `configurationTemplates[]` + new operations.
- Migration from existing `overrides[]` / `presets[]` state.
- New `useConfigurationTimeline.ts` segment builder (thin).
- `OverrideTimelineBar.vue` → `ConfigurationTimelineBar.vue` with the new mental model.
- `PresetsAndOverridesSection.vue` → `ConfigurationsSection.vue` containing the bar + dormitory editor scoped to the selected configuration + templates card.
- Cut popover (new component, replaces `OneOffOverrideModal`).
- Save-as-template / apply-template / rename / delete-cut UI.
- Drop the old `validationStore.overrideConflict` text label → "Bed inactive during stay".

### Out of Scope (deferred)
- Per-room rows below the macro bar (still useful, still deferred).
- Drag segment edges to retime cuts (Premiere direct manipulation).
- Pan / zoom on the timeline.
- Importing templates between installations.

## Test plan

- **Migration**: a session with 2+ overrides + 1 applied preset migrates
  to the right configurations + 1 template; visible bar is identical
  before vs. after.
- **Cut at today** with no other cuts: produces a second configuration
  starting today; both share the same starting snapshot; editing the
  new one doesn't affect the old.
- **Cut inside a future segment**: splits that segment, two new
  half-segments both equal to the original at cut time, future half
  preserves original future state.
- **Delete cut**: merges into the previous configuration; deleted
  snapshot is discarded; previous's window extends.
- **Copy from another configuration**: target gets a deep copy
  (mutations on the copy don't leak into the source).
- **Save as template / apply template**: template snapshot is
  independent of the source after save; applying creates a new cut
  with the template's snapshot.
- **isBedActiveDuringStay** correctly returns false when any
  configuration covering the stay window has the bed / room / dorm
  inactive.
- **Existing validation tests pass with the new warning text**.

## Open Questions

1. **Templates equality with current state** — should the templates
   library auto-detect "this template matches the current selected
   configuration" and show that next to the template name? (Nice
   discoverability, not required for v1.)
2. **Naming defaults** — `"Configuration 3"` is generic. Should we
   suggest names based on date (`"Jul 4, 2026 →"`) or auto-name to
   the preset / template that produced the cut? Defer to v1
   numbering, expose a rename action.
3. **Bulk delete cuts** — if the operator wants to clear a stretch
   of the timeline, they can delete cuts one at a time. Worth a
   "merge all cuts in range" action later, not for v1.
4. **JSON export/import** — current export is base + overrides + presets;
   should become configurations + templates. One-line change in
   `RoomConfigCSV.vue` JSON path.

---

This is a real rework — replacing a substantial chunk of code merged
in the last day. The win is a much simpler mental model end-to-end:
the timeline IS the data, every segment is a real Configuration, edits
go where you'd expect.
