# Date-Aware Bed Sharing

## Purpose & User Problem

The monastery runs back-to-back retreats — typically 1–2 per month — with different guest cohorts using the same physical beds across non-overlapping date ranges. The current data model treats each bed as having a single occupant (`bed.assignedGuestId: string | null`) with no concept of dates. As a result:

- When a March-cohort guest is dropped onto a bed currently held by an April-cohort guest, the system swaps them — even though their stays don't overlap and both *should* be able to keep their assignments.
- Auto-placement treats any assigned bed as fully occupied, so it can't suggest beds that are free for the new guest's actual stay.
- Operators can't plan multiple retreats in one tool without losing past or future assignments.

The fix: make a bed assignable to multiple guests as long as their date ranges don't overlap.

## Success Criteria

1. April-guest A (4/10–4/15) and March-guest B (3/10–3/15) can both be assigned to bed MA01 simultaneously, with no warning and no displacement.
2. Dropping March-guest C (3/12–3/14) onto MA01 — which already holds March-guest B (3/10–3/15) — triggers a confirmation dialog ("dates overlap with B; swap or cancel?"). Cancel leaves both intact; swap displaces B.
3. Auto-placement only treats a bed as occupied during the dates that overlap with the candidate guest's stay.
4. The Assignment view, with a "View Date" filter active, shows the guest occupying each bed *on that date*.
5. With no date filter, the Assignment view defaults to today's date and indicates beds with additional non-current assignments via a small "+N" badge.
6. Existing user data (single-assignment beds in localStorage) migrates seamlessly on first load post-deploy — no data loss, no manual intervention.
7. Persistence (localStorage), CSV room-config import/export, undo/redo, and validation all continue to work end-to-end.
8. The departure-day-as-bed-available rule (already established) continues to hold: an assignment ending on April 15 does NOT conflict with one starting April 15.

## Scope

### Data model changes

- `bed.assignedGuestId: string | null` is **replaced** by `bed.assignments: Array<BedAssignment>` where:
  ```ts
  interface BedAssignment {
    guestId: string
    // dates are derived from the guest's arrival/departure at read-time;
    // we don't duplicate them on the assignment itself.
  }
  ```
  Storing only `guestId` keeps a single source of truth (the guest record) and avoids drift when guest dates are edited.

- `assignmentStore.assignments: Map<guestId, bedId>` **stays single-valued** (one bed per guest stay; no mid-stay moves in this revision — see Out of Scope).

### Conflict semantics

- Two assignments **conflict** iff `guestA.arrival < guestB.departure AND guestB.arrival < guestA.departure` (half-open intervals, departure is bed-available — uses `parseLocalDate`).
- A guest with **missing arrival OR departure** is treated as "always present" and conflicts with every other assignment on the same bed.

### Drop & swap behavior

**Single guest drop:**

| Source view | Target bed state | Behavior |
|---|---|---|
| Assignment view | Empty / no overlap with existing assignments | Add the assignment silently |
| Assignment view | Existing assignment(s) overlap | Confirm dialog: "Bed MA01 is held by Jane Doe 4/10–4/15 — your guest's stay overlaps. Replace?" → Replace or Cancel |
| Timeline view | Same rules as above (currently calls `assignGuestToBed` raw — must be updated to use the same path) |
| Click-to-pick | Same rules as above |

"Replace" displaces only the *overlapping* assignments, not non-overlapping ones. If no overlap, it's a plain add. The existing `swapGuests` helper needs reworking to handle the multi-assignment case.

**Group drop:**

When dragging a group onto a room, the system pre-checks all members against the room's available beds with date-overlap awareness:

- If **no member would conflict** with any existing assignment → place all members silently (existing group-placement logic, but date-aware).
- If **any member would conflict** → show a "Group placement blocked" dialog listing each conflict (e.g., "Alice → MA01 overlaps Bob 4/10–4/15", "Carlos → MA02 overlaps Dana 4/12–4/14"). **No assignments are made.** The only button is [Cancel]. The operator must resolve the conflicts manually (displace the offenders, change dates, etc.) and retry the drop.

No "place non-conflicting only" or "replace conflicting" options in this revision — keeps the operator in control of every displacement.

### Conflicts triggered by date edits

Two paths can produce a conflict by changing dates rather than by drop:

**1. CSV re-upload (Planyo flow), `Add & Update` mode:**

- The import proceeds and updates each matched guest's record (including arrival/departure).
- After the import completes, the system re-evaluates all existing bed assignments. If any guest's updated dates now overlap another assignment on the same bed, surface a modal:
  > "Date changes in the new CSV created bed conflicts:
  > • Alice (MA01) now overlaps Bob (4/10–4/15)
  > • Carlos (FR03) now overlaps Dana (4/12–4/14)
  > Please resolve in the Assignment view."
- Buttons: [Got it]. (No "auto-fix" — these are the operator's call.)
- The conflicts also persist as validation warnings (see Validation section) so they remain visible until resolved.

**2. In-app guest edit (`GuestFormModal`):**

- When the operator changes arrival or departure and clicks Save, if the new range creates a conflict with another assignment on the same bed, show a confirmation dialog:
  > "Changing Alice's dates to 4/12–4/16 will create a conflict with Bob on bed MA01.
  > [Save anyway] [Cancel]"
- [Save anyway] commits the date change; the conflict appears as a validation warning.
- [Cancel] aborts the date change; nothing is saved.

### Auto-placement

- `getAvailableBeds()` and `getAvailableBedsInRoom()` take an optional `forGuest` parameter and return beds where **none of the existing assignments overlap with the candidate guest's stay**.
- All scoring helpers (`scoreMinimizeBuildings`, `scoreAgeCompatibility`, `scoreFamilyGrouping`) consider *only* roommates whose stay overlaps the candidate's stay.
- Group placement: a room fits a group only if every member can be assigned without overlap conflict.
- Auto-placement still uses each guest's own dates as the constraint — no separate "active retreat" concept.

### Validation (`validationStore`)

- Gender / family-separation / age-compatibility warnings consider only same-bed roommates whose stays overlap with the guest in question. A non-overlapping co-occupant is invisible to validation.
- A new warning type, `dateOverlap`, surfaces whenever two assignments on the same bed have overlapping stays. This catches the post-edit case where the operator chose [Save anyway] and the post-CSV-import case where the modal surfaced the conflict but the operator deferred resolution.

### Assignment view (BedSlot rendering)

- A "View Date" filter already exists; it remains the lens.
- Default View Date: today (instead of "no filter").
- Bed slot shows the assignment whose date range contains the View Date; "+N" badge if more assignments exist (hover popover lists them with date ranges).
- Empty bed: shows nothing assigned for that date (existing behavior).

### Timeline view

- Multiple guest blobs per bed lane on different date ranges (most of the rendering already supports this).
- Drag-drop logic (`useTimelineDragDrop`) routed through the same swap-or-cancel path.

### Group-line overlay

- Filters to assignments active on the View Date so lines don't span across cohorts.

### Migration

- On first load post-deploy, a one-time migration runs (in `dormitoryStore` initialization):
  - For each bed with `bed.assignedGuestId !== null`: convert to `bed.assignments = [{ guestId: bed.assignedGuestId }]`, then delete `assignedGuestId`.
  - For each bed with `assignedGuestId === null`: set `bed.assignments = []`.
- A version stamp on the persisted state guards against re-running the migration on subsequent loads.
- `assignmentStore.assignments` Map needs no migration — already keyed by guest.

### History / undo

- History snapshots use `JSON.parse(JSON.stringify(dormitories))` — automatically picks up the new shape. No explicit migration needed for the history payload itself, but **on first load post-deploy, existing persisted history is dropped** (clean slate) to avoid mixing old/new shapes.

### CSV room-config

- The exported `Bed ID`, `Bed Type`, etc. columns are unchanged. Bed *assignments* are not part of the room-config CSV export, so this stays compatible.

## Out of Scope (this revision)

- **Per-assignment dates** independent of the guest. (One bed per guest stay only — no mid-stay bed moves yet.)
- **Per-date room gender** (already tracked separately as issue #25).
- **A "retreat" concept** (cohorts as a first-class object). Not needed for this fix.
- **"Clear all assignments for date range"** bulk operation. Could be added later.
- **Drag image showing guest's date range** during drag. Polish, defer.
- **Surfacing how many cohorts share each bed** (e.g., "MA01 used by 3 retreats"). Useful but not required.
- **Renaming the existing "View Date" UI** or moving it. The control already exists in Assignment view; we just change its default and make it more central.

## Technical Considerations

### File touchpoints (estimated)

- `src/types/Bed.ts` — replace `assignedGuestId` with `assignments`.
- `src/stores/dormitoryStore.ts` — bed lookups, migration logic, version stamp.
- `src/stores/assignmentStore.ts` — `assignGuestToBed`, `unassignGuest`, `swapGuests`, `clearAllAssignments`, `bedToGuestMap` (now needs date-keyed lookup), all the room/dorm-level guest-listing helpers.
- `src/stores/validationStore.ts` — overlap-aware roommate checks.
- `src/features/dormitories/components/BedSlot.vue` — render based on View Date, "+N" badge, hover list.
- `src/features/dormitories/components/RoomList.vue` — pass View Date down.
- `src/features/assignments/composables/useDragDrop.ts` — swap-or-cancel routing.
- `src/features/assignments/composables/useAutoPlacement.ts` — date-aware bed availability + scoring.
- `src/features/assignments/composables/useGroupClassification.ts` — likely unchanged.
- `src/features/timeline/composables/useTimelineDragDrop.ts` — swap-or-cancel routing.
- `src/features/timeline/composables/useTimelineData.ts` — likely unchanged (already date-aware).
- `src/features/guests/components/GroupLinesOverlay.vue` — date-scoped lines.
- `src/features/print/components/PrintView.vue` — already date-aware via View Date.
- `src/shared/composables/useDropValidation.ts` — accept overlap semantics.
- `src/shared/composables/useUtils.ts` — possibly add `assignmentsOverlap(guestA, guestB)` helper.
- A new shared composable: `useBedAvailability.ts` (or methods on the dormitory store) — single source of truth for "is bed X available for guest Y at dates Z".

### Default View Date behavior

- On Assignment view mount, if no View Date is set, default to today.
- "Today" is computed once at app load — does NOT live-update if the operator leaves the tab open across midnight. Operator can manually change the View Date at any time.
- A "Show all dates" / "Clear filter" option remains, but switching to it should make over-assigned beds visually obvious (show the "+N" badge regardless, plus a hover list).

### Conflict-detection scope

- Overlap checks always operate on the **guest's full stay**, not on what's currently visible at the View Date. The View Date is purely a display lens.
- This means a drop can be blocked by an assignment that isn't visible in the current Assignment view if the new guest's stay extends into a date range where the bed is held by someone else.

### Conflict dialog copy

- Title: "Stay overlaps existing assignment"
- Body: "{Guest name}'s stay ({arrival}–{departure}) overlaps with {existing guest name} ({arrival}–{departure}) on bed {bedId}. Replace the existing assignment?"
- Buttons: "Replace" (destructive style) | "Cancel"

### Test scenarios

- A and B on same bed, no overlap → both assigned, no warning.
- A and B on same bed, partial overlap → confirm dialog.
- A and B on same bed, full containment → confirm dialog.
- A and B on same bed, A has no dates → confirm dialog (always conflicts).
- Auto-place run with mixed-cohort guest list → each guest gets a bed available during their stay.
- Migration from old localStorage with `bed.assignedGuestId` → new `bed.assignments` array.
- Undo/redo across multi-assignment beds.
- Print view with a date filter shows only assignments active on that date.

## Resolved Decisions

1. **"Today"**: computed once at app load; doesn't live-update across midnight. Operator can manually change View Date.
2. **Overlap scope**: always against the guest's full stay, never just what's visible at View Date.
3. **Persisted undo history**: wipe on first load post-deploy. Current bed state is migrated, not wiped.
4. **Force-swap bypass**: not in this revision. Confirm dialog always fires on overlap.
5. **Group drop with partial overlap**: dialog lists all conflicts, no assignments made, only [Cancel] button.
6. **Date edit creates conflict (in-app)**: confirm dialog with [Save anyway] + [Cancel].
7. **Date edit creates conflict (CSV re-upload)**: import proceeds, post-import modal lists new conflicts, persistent validation warnings remain visible until resolved.
